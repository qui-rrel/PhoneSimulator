import assert from 'node:assert/strict'
import { defaultRuntimeContent, defaultRuntimeStory } from '../src/project/defaultTemplate.js'
import { createDefaultProjectDocument, editorStateToProject, projectToEditorState } from '../src/project/projectFile.js'

const firstOpen = createDefaultProjectDocument()
const newProject = createDefaultProjectDocument('新作品')

assert.equal(firstOpen.meta.name, 'phone-config-template')
assert.equal(newProject.meta.name, '新作品')
assert.deepEqual(firstOpen.content, defaultRuntimeContent)
assert.deepEqual(firstOpen.story, defaultRuntimeStory)
assert.deepEqual(newProject.content, defaultRuntimeContent)
assert.deepEqual(newProject.story, defaultRuntimeStory)
assert.notEqual(firstOpen.content, newProject.content)
assert.notEqual(firstOpen.story, newProject.story)
assert.equal(firstOpen.content.apps.length, 15)
assert.equal(firstOpen.content.device.batteryDrainIntervalSeconds, 0)
assert.equal(firstOpen.content.theme.lockWallpaper, '')
assert.equal(firstOpen.content.theme.homeWallpaper, '')
assert.equal(firstOpen.content.contacts.length, 0)
assert.equal(firstOpen.story.events.length, 0)
assert.deepEqual(firstOpen.editor.graph.nodes, {})

firstOpen.content.owner.name = '修改不应污染模板'
assert.equal(newProject.content.owner.name, '我')
assert.equal(defaultRuntimeContent.owner.name, '我')

const roundTrip = editorStateToProject(projectToEditorState(newProject))
assert.deepEqual(roundTrip.content, defaultRuntimeContent)
assert.deepEqual(roundTrip.story, defaultRuntimeStory)

console.log('首次打开与新建项目共用独立默认模板，且项目间不会共享可变数据。')
