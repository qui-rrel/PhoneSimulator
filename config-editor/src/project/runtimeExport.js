export const RUNTIME_CONTENT_FILE = 'content.json'
export const RUNTIME_STORY_FILE = 'story.json'

function serializeRuntimeJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`
}

export function blockingRuntimeIssues(issues = []) {
  return issues.filter((issue) => issue.level === 'error')
}

export function assertRuntimeExportAllowed(issues = []) {
  const blocking = blockingRuntimeIssues(issues)
  if (!blocking.length) return
  const error = new Error(`当前还有 ${blocking.length} 个错误，修正后才能导出运行时 JSON。`)
  error.code = 'RUNTIME_EXPORT_BLOCKED'
  error.issues = blocking
  throw error
}

export function createRuntimeExportBundle(projectDocument) {
  if (!projectDocument?.content || !projectDocument?.story) {
    throw new Error('当前项目缺少 content 或 story 数据，无法导出。')
  }
  const files = {
    content: { name: RUNTIME_CONTENT_FILE, text: serializeRuntimeJson(projectDocument.content) },
    story: { name: RUNTIME_STORY_FILE, text: serializeRuntimeJson(projectDocument.story) },
  }
  // Parse once before writing so a serialization regression cannot partially replace runtime files.
  JSON.parse(files.content.text)
  JSON.parse(files.story.text)
  return files
}

async function writeFile(directoryHandle, file) {
  const fileHandle = await directoryHandle.getFileHandle(file.name, { create: true })
  const writable = await fileHandle.createWritable()
  try {
    await writable.write(file.text)
    await writable.close()
  } catch (error) {
    try { await writable.abort?.() } catch { /* Keep the original write error. */ }
    throw error
  }
}

export async function writeRuntimeExport(directoryHandle, bundle) {
  if (!directoryHandle?.getFileHandle) throw new Error('没有获得可写入的文件夹授权。')
  await writeFile(directoryHandle, bundle.content)
  await writeFile(directoryHandle, bundle.story)
}
