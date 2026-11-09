import assert from 'node:assert/strict'
import { validateRequiredFields } from '../src/validators/schemaValidation.js'
import { collectReferences, findReferencesTo, rewriteReferences } from '../src/validators/referenceIndex.js'
import { nodeTypes } from '../src/schema/nodeTypes.js'

const fields = {
  'contact.id': { key: 'contact.id', labelZh: '联系人 ID', required: true },
  'smsScript.contactId': { key: 'smsScript.contactId', labelZh: '联系人', required: true, referenceType: 'contact' },
  'action.smsScriptId': { key: 'action.smsScriptId', labelZh: '短信剧情', required: true, referenceType: 'sms-script' },
  'reference.contactId': { key: 'reference.contactId', labelZh: '联系人', required: true, referenceType: 'contact' },
}
const contact = { id: 'contact:alice', runtimeId: 'alice', name: '爱丽丝', resourceType: 'contact', fieldKeys: ['contact.id'], data: { 'contact.id': 'alice' } }
const script = { id: 'script:sms-1', runtimeId: 'sms-1', name: '开场短信', resourceType: 'sms-script', fieldKeys: ['smsScript.contactId'], itemFieldKeys: [], items: [], data: { 'smsScript.contactId': 'alice' } }
const event = { id: 'event-a', name: '发送短信', type: 'timer', kind: 'event', fieldKeys: ['action.smsScriptId'], data: { 'event.initialActive': true, 'action.smsScriptId': 'sms-1' } }
const unreachable = { id: 'event-b', name: '孤立节点', type: 'terminal', kind: 'event', fieldKeys: [], data: { 'event.initialActive': false } }
const referenceNode = { id: 'ref-a', name: '联系人引用', type: 'contact-reference', kind: 'reference', fieldKeys: nodeTypes['contact-reference'].fieldKeys, data: { 'reference.contactId': 'alice' } }
const sections = [
  { id: 'communication', resources: [contact] },
  { id: 'scripts', resources: [script] },
]
const nodes = [event, unreachable, referenceNode]

let issues = validateRequiredFields({ nodes, edges: [], sections, fieldDefinitions: fields, baseStory: {} })
assert.ok(issues.some((issue) => issue.id === 'unreachable:event-b'), '应检查不可达剧情节点')
assert.ok(!issues.some((issue) => issue.title === '引用的内容不存在'), '已有引用不应误报')

script.data['smsScript.contactId'] = 'missing-contact'
issues = validateRequiredFields({ nodes, edges: [], sections, fieldDefinitions: fields, baseStory: {} })
assert.ok(issues.some((issue) => issue.title === '引用的内容不存在' && issue.resourceId === script.id), '应报告失效引用并带定位信息')
script.data['smsScript.contactId'] = 'alice'

const references = collectReferences({ nodes, edges: [], sections, fieldDefinitions: fields, baseStory: {} })
assert.equal(findReferencesTo(references, 'contact', 'alice').length, 2, '应索引脚本与引用节点中的联系人引用')
rewriteReferences({ nodes, sections, fieldDefinitions: fields, baseStory: {} }, 'contact', 'alice', 'bob')
assert.equal(script.data['smsScript.contactId'], 'bob', '重命名 ID 时应同步脚本引用')
assert.equal(referenceNode.data['reference.contactId'], 'bob', '重命名 ID 时应同步蓝图引用节点')

contact.runtimeId = 'bob'
contact.data['contact.id'] = 'bob'
sections[0].resources.push({ ...contact, id: 'contact:bob-copy', data: { 'contact.id': 'bob' } })
issues = validateRequiredFields({ nodes, edges: [], sections, fieldDefinitions: fields, baseStory: {} })
assert.ok(issues.some((issue) => issue.title === 'ID 重复'), '应检查同类型重复 ID')

console.log('Stage 7 引用索引、重命名联动、重复 ID、失效引用和不可达节点检查通过。')
