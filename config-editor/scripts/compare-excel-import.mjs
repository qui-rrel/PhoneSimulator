import fs from 'node:fs/promises'
import path from 'node:path'
import readExcelFile from 'read-excel-file/node'
import { convertWorkbook } from '../src/importers/excel/convertWorkbook.js'
import { createWorkbookReader } from '../src/importers/excel/workbookRows.js'
import { createProjectFromRuntime, editorStateToProject, projectToEditorState } from '../src/project/projectFile.js'

const [workbookPath, expectedDir, outputDir] = process.argv.slice(2)
if (!workbookPath || !expectedDir || !outputDir) {
  throw new Error('用法：node scripts/compare-excel-import.mjs <xlsx> <旧转换器输出目录> <新导入器输出目录>')
}

const repoRoot = path.resolve(import.meta.dirname, '../..')
const readJson = async (file) => JSON.parse(await fs.readFile(file, 'utf8'))
const baseContent = await readJson(path.join(repoRoot, 'phone-simulator/src/data/content.json'))
const baseStory = await readJson(path.join(repoRoot, 'phone-simulator/src/data/story.json'))
const sheets = await readExcelFile(path.resolve(workbookPath))
const actual = convertWorkbook(createWorkbookReader(sheets), { baseContent, baseStory })
const project = createProjectFromRuntime({ name: 'Excel 对照', content: actual.content, story: actual.story, sourceFileName: path.basename(workbookPath) })
const state = projectToEditorState(project)
const roundTrip = editorStateToProject({ ...state, sections: state.sections, nodes: state.nodes, edges: state.edges })

await fs.mkdir(path.resolve(outputDir), { recursive: true })
await Promise.all([
  fs.writeFile(path.join(path.resolve(outputDir), 'content.json'), `${JSON.stringify(actual.content, null, 2)}\n`),
  fs.writeFile(path.join(path.resolve(outputDir), 'story.json'), `${JSON.stringify(actual.story, null, 2)}\n`),
])

function firstDifference(expected, received, currentPath = '$') {
  if (Object.is(expected, received)) return null
  if (typeof expected !== typeof received || expected === null || received === null) return { path: currentPath, expected, received }
  if (Array.isArray(expected) || Array.isArray(received)) {
    if (!Array.isArray(expected) || !Array.isArray(received)) return { path: currentPath, expected, received }
    if (expected.length !== received.length) return { path: `${currentPath}.length`, expected: expected.length, received: received.length }
    for (let index = 0; index < expected.length; index += 1) {
      const difference = firstDifference(expected[index], received[index], `${currentPath}[${index}]`)
      if (difference) return difference
    }
    return null
  }
  if (typeof expected === 'object') {
    const expectedKeys = Object.keys(expected).sort()
    const receivedKeys = Object.keys(received).sort()
    if (JSON.stringify(expectedKeys) !== JSON.stringify(receivedKeys)) return { path: `${currentPath} keys`, expected: expectedKeys, received: receivedKeys }
    for (const key of expectedKeys) {
      const difference = firstDifference(expected[key], received[key], `${currentPath}.${key}`)
      if (difference) return difference
    }
    return null
  }
  return { path: currentPath, expected, received }
}

for (const key of ['content', 'story']) {
  const expected = await readJson(path.join(path.resolve(expectedDir), `${key}.json`))
  const difference = firstDifference(expected, actual[key])
  if (difference) {
    console.error(`${key}.json 不一致：${difference.path}`)
    console.error('旧转换器：', difference.expected)
    console.error('新导入器：', difference.received)
    process.exitCode = 1
  } else {
    console.log(`${key}.json：结构与旧转换器完全一致`)
  }
  const roundTripDifference = firstDifference(actual[key], roundTrip[key])
  if (roundTripDifference) {
    console.error(`项目文件往返后 ${key} 不一致：${roundTripDifference.path}`)
    process.exitCode = 1
  } else {
    console.log(`${key}：保存项目文件后内容保持一致`)
  }
}
