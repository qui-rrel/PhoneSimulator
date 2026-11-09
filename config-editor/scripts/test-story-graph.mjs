import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createGraphGroup, createGraphNode, connectGraphPorts, duplicateGraphNodes, removeGraphNodes, synchronizeEventNodeType } from '../src/graph/model.js'
import { createProjectFromRuntime, editorStateToProject, projectToEditorState } from '../src/project/projectFile.js'

const repoRoot = path.resolve(import.meta.dirname, '../..')
const content = JSON.parse(await fs.readFile(path.join(repoRoot, 'phone-simulator/src/data/content.json'), 'utf8'))
const story = JSON.parse(await fs.readFile(path.join(repoRoot, 'phone-simulator/src/data/story.json'), 'utf8'))
const project = createProjectFromRuntime({ name: '剧情蓝图结构测试', content, story })
const state = projectToEditorState(project)

const originalFlow = state.edges.find((edge) => edge.kind === 'flow')
state.edges.splice(state.edges.indexOf(originalFlow), 1)
const sourceEvent = story.events.find((event) => event.id === originalFlow.from)

const eventNode = createGraphNode('timer', state.nodes, { x: 800, y: 700 })
eventNode.data['action.type'] = 'sms-script'
eventNode.data['event.initialActive'] = true
synchronizeEventNodeType(eventNode)
state.nodes.push(eventNode)

const referenceNode = createGraphNode('sms-script-reference', state.nodes, { x: -430, y: -180 })
referenceNode.data['reference.smsScriptId'] = story.smsScripts[0].id
state.nodes.push(referenceNode)

const dataEdge = connectGraphPorts(state.nodes, state.edges, {
  kind: 'data', from: referenceNode.id, output: 'value', to: eventNode.id, input: 'smsScript',
})
assert.ok(dataEdge)
assert.equal(eventNode.data['action.smsScriptId'], story.smsScripts[0].id)

const terminal = createGraphNode('terminal', state.nodes, { x: 1180, y: 700 })
state.nodes.push(terminal)
assert.ok(connectGraphPorts(state.nodes, state.edges, {
  kind: 'flow', from: eventNode.id, output: 'completed', to: terminal.id, input: 'in',
}))

const copies = duplicateGraphNodes(state.nodes, [referenceNode.id])
assert.equal(copies.length, 1)
removeGraphNodes(state.nodes, state.edges, [copies[0].id])
state.groups.push(createGraphGroup(state.groups, { x: -520, y: -260 }))

const saved = editorStateToProject(state)
assert.equal(saved.story.events.find((event) => event.id === sourceEvent.id).nextByOutcome[originalFlow.outcome], '')
const savedEvent = saved.story.events.find((event) => event.id === eventNode.id)
assert.equal(savedEvent.initialActive, true)
assert.equal(savedEvent.action.type, 'sms-script')
assert.equal(savedEvent.action.smsScriptId, story.smsScripts[0].id)
assert.equal(saved.editor.graph.auxNodes.length, 1)
assert.equal(saved.editor.graph.dataEdges.length, 1)
assert.equal(saved.editor.graph.groups.length, 1)

const reopened = projectToEditorState(saved)
assert.ok(reopened.nodes.some((node) => node.id === referenceNode.id && node.kind === 'reference'))
assert.equal(reopened.nodes.find((node) => node.id === referenceNode.id).x, -430)
assert.equal(reopened.nodes.find((node) => node.id === referenceNode.id).y, -180)
assert.ok(reopened.edges.some((edge) => edge.id === dataEdge.id && edge.kind === 'data'))
assert.equal(reopened.groups[0].id, state.groups[0].id)
assert.equal(reopened.groups[0].x, -520)
assert.equal(reopened.groups[0].y, -260)
console.log('剧情节点、类型化数据连线、流程分支删除、引用节点、复制删除、分组和项目文件往返均正常')
