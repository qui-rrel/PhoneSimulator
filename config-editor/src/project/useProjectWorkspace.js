import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import {
  createDefaultProjectDocument,
  editorStateToProject,
  normalizeProjectFileName,
  parseProjectFile,
  projectToEditorState,
  serializeProject,
  validateProjectDocument,
} from './projectFile'
import { importExcelProject } from '../importers/excel/importExcel.js'
import {
  assertRuntimeExportAllowed,
  createRuntimeExportBundle,
  writeRuntimeExport,
} from './runtimeExport.js'

const RECOVERY_KEY = 'phone-config-editor:recovery'

export function useProjectWorkspace() {
  const initialDocument = createDefaultProjectDocument()
  const initialState = projectToEditorState(initialDocument)
  const projectMeta = ref(initialState.meta)
  const baseContent = ref(initialState.baseContent)
  const baseStory = ref(initialState.baseStory)
  const sections = ref(initialState.sections)
  const nodes = ref(initialState.nodes)
  const edges = ref(initialState.edges)
  const groups = ref(initialState.groups)
  const fileName = ref('')
  const fileHandle = shallowRef(null)
  const isDirty = ref(false)
  const isBusy = ref(false)
  const notice = ref(null)
  const recoveryCandidate = ref(null)
  const importSummary = ref(null)
  const workspaceRevision = ref(0)
  let lastSavedSnapshot = serializeProject(initialDocument)
  let suspendTracking = false
  let recoveryTimer = null
  let noticeTimer = null

  const projectName = computed(() => projectMeta.value.name || '未命名作品')
  const projectFileLabel = computed(() => fileName.value || '尚未保存为文件')

  function buildDocument() {
    return editorStateToProject({
      meta: projectMeta.value,
      baseContent: baseContent.value,
      baseStory: baseStory.value,
      sections: sections.value,
      nodes: nodes.value,
      edges: edges.value,
      groups: groups.value,
    })
  }

  function showNotice(message, type = 'success') {
    notice.value = { message, type }
    window.clearTimeout(noticeTimer)
    noticeTimer = window.setTimeout(() => { notice.value = null }, 4200)
  }

  function writeRecovery(document) {
    try {
      window.localStorage.setItem(RECOVERY_KEY, JSON.stringify({
        savedAt: new Date().toISOString(),
        fileName: fileName.value,
        document,
      }))
    } catch {
      showNotice('浏览器无法保存恢复副本，请尽快把项目另存为文件。', 'warning')
    }
  }

  function clearRecovery() {
    window.clearTimeout(recoveryTimer)
    recoveryTimer = null
    window.localStorage.removeItem(RECOVERY_KEY)
  }

  function scheduleRecovery(document) {
    window.clearTimeout(recoveryTimer)
    recoveryTimer = window.setTimeout(() => writeRecovery(document), 250)
  }

  watch([projectMeta, baseContent, baseStory, sections, nodes, edges, groups], () => {
    if (suspendTracking) return
    const document = buildDocument()
    const snapshot = serializeProject(document)
    isDirty.value = snapshot !== lastSavedSnapshot
    if (isDirty.value) scheduleRecovery(document)
    else clearRecovery()
  }, { deep: true })

  async function applyDocument(document, options = {}) {
    const state = projectToEditorState(document)
    suspendTracking = true
    projectMeta.value = state.meta
    baseContent.value = state.baseContent
    baseStory.value = state.baseStory
    sections.value = state.sections
    nodes.value = state.nodes
    edges.value = state.edges
    groups.value = state.groups
    workspaceRevision.value += 1
    fileHandle.value = options.handle || null
    fileName.value = options.fileName || ''
    lastSavedSnapshot = options.clean === false ? '' : serializeProject(document)
    isDirty.value = options.clean === false
    await nextTick()
    suspendTracking = false
    if (options.clean === false) scheduleRecovery(buildDocument())
    else clearRecovery()
  }

  function confirmDiscardChanges(action) {
    if (!isDirty.value) return true
    return window.confirm(`当前项目有尚未保存的修改。确定要${action}吗？`)
  }

  async function newProject() {
    if (!confirmDiscardChanges('新建项目并放弃这些修改')) return false
    const name = window.prompt('请输入作品名称', '未命名作品')
    if (name === null) return false
    const document = createDefaultProjectDocument(name.trim() || '未命名作品')
    await applyDocument(document, { clean: false })
    showNotice('已新建项目，请保存项目文件。')
    return true
  }

  function openWithFileInput() {
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json,.phone-project.json,application/json'
      input.addEventListener('change', () => resolve(input.files?.[0] || null), { once: true })
      input.addEventListener('cancel', () => resolve(null), { once: true })
      input.click()
    })
  }

  function openExcelInput() {
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      input.addEventListener('change', () => resolve(input.files?.[0] || null), { once: true })
      input.addEventListener('cancel', () => resolve(null), { once: true })
      input.click()
    })
  }

  async function importExcel() {
    const warning = isDirty.value
      ? '当前项目有尚未保存的修改。导入 Excel 会替换当前项目的全部内容，确定继续吗？'
      : '导入 Excel 会替换当前项目的全部内容。确定继续吗？'
    if (!window.confirm(warning)) return
    const file = await openExcelInput()
    if (!file) return
    isBusy.value = true
    try {
      const result = await importExcelProject(file)
      await applyDocument(result.document, { clean: false })
      importSummary.value = result.summary
      showNotice('Excel 已导入，请检查并保存项目文件。')
    } catch (error) {
      showNotice(error?.message || '导入 Excel 失败。', 'error')
    } finally {
      isBusy.value = false
    }
  }

  function closeImportSummary() {
    importSummary.value = null
  }

  async function openProject() {
    if (!confirmDiscardChanges('打开其他项目并放弃这些修改')) return
    isBusy.value = true
    try {
      let handle = null
      let file = null
      if ('showOpenFilePicker' in window) {
        const handles = await window.showOpenFilePicker({
          multiple: false,
          types: [{ description: 'PhoneSimulator 项目文件', accept: { 'application/json': ['.json'] } }],
        })
        handle = handles[0]
        file = await handle.getFile()
      } else {
        file = await openWithFileInput()
      }
      if (!file) return
      const document = parseProjectFile(await file.text())
      await applyDocument(document, { clean: true, handle, fileName: file.name })
      showNotice(`已打开“${document.meta.name}”。`)
    } catch (error) {
      if (error?.name !== 'AbortError') showNotice(error.message || '打开项目失败。', 'error')
    } finally {
      isBusy.value = false
    }
  }

  async function writeToHandle(handle, text) {
    const writable = await handle.createWritable()
    await writable.write(text)
    await writable.close()
  }

  function downloadProject(text, name) {
    const blob = new Blob([text], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = name
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  function downloadRuntimeFile(kind, issues = []) {
    try {
      assertRuntimeExportAllowed(issues)
      const bundle = createRuntimeExportBundle(buildDocument())
      const file = bundle[kind]
      if (!file) throw new Error('未知的运行时文件类型。')
      downloadProject(file.text, file.name)
      showNotice(`已下载 ${file.name}。`)
      return true
    } catch (error) {
      showNotice(error.message || '导出运行时 JSON 失败。', 'error')
      return false
    }
  }

  async function writeRuntimeDirectory(issues = []) {
    if (!('showDirectoryPicker' in window)) {
      showNotice('当前浏览器不支持直接写入文件夹，请分别下载两份 JSON。', 'warning')
      return false
    }
    isBusy.value = true
    try {
      assertRuntimeExportAllowed(issues)
      const bundle = createRuntimeExportBundle(buildDocument())
      const handle = await window.showDirectoryPicker({
        id: 'phonesimulator-runtime-json',
        mode: 'readwrite',
      })
      await writeRuntimeExport(handle, bundle)
      showNotice(`已将 content.json 与 story.json 写入“${handle.name || '所选文件夹'}”。`)
      return true
    } catch (error) {
      if (error?.name !== 'AbortError') showNotice(error.message || '写入运行时 JSON 失败。', 'error')
      return false
    } finally {
      isBusy.value = false
    }
  }

  async function finishSave(document, text, options) {
    suspendTracking = true
    projectMeta.value = document.meta
    fileHandle.value = options.handle || null
    fileName.value = options.fileName
    lastSavedSnapshot = text
    isDirty.value = false
    await nextTick()
    suspendTracking = false
    clearRecovery()
    showNotice(`已保存“${document.meta.name}”。`)
  }

  async function saveProjectAs() {
    isBusy.value = true
    try {
      const document = buildDocument()
      document.meta.updatedAt = new Date().toISOString()
      const text = serializeProject(document)
      const suggestedName = normalizeProjectFileName(document.meta.name)
      let handle = null
      let selectedName = suggestedName
      if ('showSaveFilePicker' in window) {
        handle = await window.showSaveFilePicker({
          suggestedName,
          types: [{ description: 'PhoneSimulator 项目文件', accept: { 'application/json': ['.json'] } }],
        })
        await writeToHandle(handle, text)
        selectedName = handle.name || suggestedName
      } else {
        downloadProject(text, suggestedName)
      }
      await finishSave(document, text, { handle, fileName: selectedName })
      return true
    } catch (error) {
      if (error?.name !== 'AbortError') showNotice(error.message || '保存项目失败。', 'error')
      return false
    } finally {
      isBusy.value = false
    }
  }

  async function saveProject() {
    if (!fileHandle.value) return saveProjectAs()
    isBusy.value = true
    try {
      const document = buildDocument()
      document.meta.updatedAt = new Date().toISOString()
      const text = serializeProject(document)
      await writeToHandle(fileHandle.value, text)
      await finishSave(document, text, { handle: fileHandle.value, fileName: fileName.value })
      return true
    } catch (error) {
      showNotice(error.message || '保存项目失败。', 'error')
      return false
    } finally {
      isBusy.value = false
    }
  }

  async function restoreRecovery() {
    if (!recoveryCandidate.value) return
    const candidate = recoveryCandidate.value
    try {
      validateProjectDocument(candidate.document)
      await applyDocument(candidate.document, {
        clean: false,
        fileName: candidate.fileName || '',
      })
      recoveryCandidate.value = null
      showNotice('已恢复上次未保存的内容，请保存项目文件。', 'warning')
    } catch (error) {
      discardRecovery()
      showNotice(error.message || '恢复内容已经损坏，无法打开。', 'error')
    }
  }

  function discardRecovery() {
    recoveryCandidate.value = null
    clearRecovery()
  }

  function checkRecovery() {
    const raw = window.localStorage.getItem(RECOVERY_KEY)
    if (!raw) return
    try {
      const candidate = JSON.parse(raw)
      validateProjectDocument(candidate.document)
      recoveryCandidate.value = candidate
    } catch {
      clearRecovery()
    }
  }

  function handleBeforeUnload(event) {
    if (!isDirty.value) return
    event.preventDefault()
    event.returnValue = ''
  }

  onMounted(() => {
    checkRecovery()
    window.addEventListener('beforeunload', handleBeforeUnload)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload)
    window.clearTimeout(recoveryTimer)
    window.clearTimeout(noticeTimer)
  })

  return {
    projectMeta, projectName, projectFileLabel, baseStory, sections, nodes, edges, groups,
    isDirty, isBusy, notice, recoveryCandidate, importSummary, workspaceRevision,
    newProject, openProject, importExcel, saveProject, saveProjectAs,
    downloadRuntimeFile, writeRuntimeDirectory,
    closeImportSummary,
    restoreRecovery, discardRecovery, buildDocument,
  }
}
