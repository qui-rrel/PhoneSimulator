import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createProjectFromRuntime, editorStateToProject, projectToEditorState } from '../src/project/projectFile.js'
import { createSequenceItem, createSequenceResource } from '../src/project/sequenceResources.js'
import { sequenceSchemas } from '../src/schema/sequences.js'

const repoRoot = path.resolve(import.meta.dirname, '../..')
const content = JSON.parse(await fs.readFile(path.join(repoRoot, 'phone-simulator/src/data/content.json'), 'utf8'))
const story = JSON.parse(await fs.readFile(path.join(repoRoot, 'phone-simulator/src/data/story.json'), 'utf8'))
const project = createProjectFromRuntime({ name: '序列编辑器结构测试', content, story })
const state = projectToEditorState(project)
const scripts = state.sections.find((section) => section.id === 'scripts').resources

for (const [type, schema] of Object.entries(sequenceSchemas)) {
  const resource = createSequenceResource(type, scripts)
  if (!schema.rootItem) {
    const first = createSequenceItem(resource)
    first.data[schema.itemFieldKeys[0]] = schema.itemFields[0].default
    resource.items.push(first)
    resource.items.push(createSequenceItem(resource, first))
    const moved = resource.items.pop()
    resource.items.unshift(moved)
  }
  resource.items[0].expanded = false
  scripts.push(resource)
}

const saved = editorStateToProject(state)
for (const [type, schema] of Object.entries(sequenceSchemas)) {
  const created = saved.story[schema.runtimeCollection].find((item) => item.id.startsWith(`new-${type}-`))
  assert.ok(created, `${schema.label}应能写入项目文件`)
  if (schema.rootItem) assert.equal(scripts.find((item) => item.runtimeId === created.id).items.length, 1)
  else assert.equal(created[schema.itemPath].length, 2)
}

const reopened = projectToEditorState(saved)
const reopenedScripts = reopened.sections.find((section) => section.id === 'scripts').resources
assert.equal(reopenedScripts.length, scripts.length)
assert.ok(reopenedScripts.every((resource) => resource.itemFieldKeys.length > 0))
assert.ok(reopenedScripts.filter((resource) => resource.runtimeId.startsWith('new-')).every((resource) => resource.items[0].expanded === false))
console.log('六类消息与对白脚本的新建、复制、排序、折叠状态和项目文件往返结构均正常')
