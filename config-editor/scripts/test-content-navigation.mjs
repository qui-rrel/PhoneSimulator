import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createOrdinaryResource, createProjectFromRuntime, editorStateToProject, projectToEditorState } from '../src/project/projectFile.js'
import { directoriesForSection } from '../src/schema/navigation.js'
import { syncManagedOrder } from '../src/project/resourceOrdering.js'

const repoRoot = path.resolve(import.meta.dirname, '../..')
const content = JSON.parse(await fs.readFile(path.join(repoRoot, 'phone-simulator/src/data/content.json'), 'utf8'))
const story = JSON.parse(await fs.readFile(path.join(repoRoot, 'phone-simulator/src/data/story.json'), 'utf8'))
const state = projectToEditorState(createProjectFromRuntime({ name: '内容目录测试', content, story }))

for (const section of state.sections.filter((item) => !['basics', 'story'].includes(item.id))) {
  const directories = directoriesForSection(section)
  const listed = directories.flatMap((item) => item.resources.map((resource) => resource.id))
  assert.equal(new Set(listed).size, section.resources.length, `${section.id} 的二级目录应覆盖全部内容且不重复`)
}

for (const section of state.sections) for (const directory of directoriesForSection(section).filter((item) => item.mode === 'linked')) {
  const parents = new Set(directory.resources.filter((item) => item.resourceType === directory.parentType).map((item) => item.runtimeId))
  for (const group of directory.childGroups) for (const child of directory.resources.filter((item) => item.resourceType === group.type)) {
    assert.ok(parents.has(child.data[group.groupField]), `${group.label}必须能归属到当前目录中的父对象`)
  }
}

const communication = state.sections.find((item) => item.id === 'communication')
const contact = communication.resources.find((item) => item.resourceType === 'contact')
const sms = createOrdinaryResource('sms-message', communication.resources)
sms.data['sms.contactId'] = contact.runtimeId
sms.data['sms.text'] = '目录测试消息'
communication.resources.push(sms)

const wechat = state.sections.find((item) => item.id === 'wechat')
const conversation = wechat.resources.find((item) => item.resourceType === 'wechat-conversation')
const message = createOrdinaryResource('wechat-message', wechat.resources)
message.data['wxMessage.conversationId'] = conversation.runtimeId
message.data['wxMessage.senderId'] = 'SELF'
message.data['wxMessage.text'] = '目录测试微信消息'
wechat.resources.push(message)
syncManagedOrder(wechat.resources, 'wechat-message')

const saved = editorStateToProject(state)
assert.ok(saved.content.contacts.find((item) => item.id === contact.runtimeId).messages.some((item) => item.text === '目录测试消息'))
assert.ok(saved.content.wechat.messages.some((item) => item.conversationId === conversation.runtimeId && item.text === '目录测试微信消息'))

console.log('二级目录覆盖、父子自动归组以及短信和微信消息运行时编译均正常。')
