import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createProjectFromRuntime, editorStateToProject, projectToEditorState } from '../src/project/projectFile.js'
import {
  assertRuntimeExportAllowed,
  blockingRuntimeIssues,
  createRuntimeExportBundle,
  writeRuntimeExport,
} from '../src/project/runtimeExport.js'

const repoRoot = path.resolve(import.meta.dirname, '../..')
const content = JSON.parse(await fs.readFile(path.join(repoRoot, 'phone-simulator/src/data/content.json'), 'utf8'))
const story = JSON.parse(await fs.readFile(path.join(repoRoot, 'phone-simulator/src/data/story.json'), 'utf8'))
const state = projectToEditorState(createProjectFromRuntime({ name: '运行时导出测试', content, story }))
const document = editorStateToProject(state)
const bundle = createRuntimeExportBundle(document)

assert.equal(bundle.content.name, 'content.json')
assert.equal(bundle.story.name, 'story.json')
assert.deepEqual(JSON.parse(bundle.content.text), content)
assert.deepEqual(JSON.parse(bundle.story.text), story)
assert.equal(bundle.content.text.endsWith('\n'), true)
assert.equal(bundle.story.text.endsWith('\n'), true)
assert.equal('editor' in JSON.parse(bundle.story.text), false)

const writes = new Map()
const directory = {
  async getFileHandle(name) {
    return {
      async createWritable() {
        return {
          async write(text) { writes.set(name, text) },
          async close() {},
        }
      },
    }
  },
}
await writeRuntimeExport(directory, bundle)
assert.deepEqual(JSON.parse(writes.get('content.json')), content)
assert.deepEqual(JSON.parse(writes.get('story.json')), story)

const issues = [{ level: 'warning' }, { level: 'error', id: 'broken-reference' }]
assert.equal(blockingRuntimeIssues(issues).length, 1)
assert.throws(() => assertRuntimeExportAllowed(issues), /1 个错误/)
assert.doesNotThrow(() => assertRuntimeExportAllowed([{ level: 'warning' }]))

console.log('运行时 JSON 编译、下载内容、目录写入和严重错误拦截均正常。')
