const OUTCOME_ORDER = ['completed', 'accepted', 'rejected', 'missed']
const COLUMN_GAP = 420
const ROW_GAP = 220
const START_X = 90
const START_Y = 100

function createLayout(ids, connections, preferredRoots = []) {
  const idSet = new Set(ids)
  const outgoing = new Map(ids.map((id) => [id, []]))
  const indegree = new Map(ids.map((id) => [id, 0]))

  for (const connection of connections) {
    if (!idSet.has(connection.from) || !idSet.has(connection.to)) continue
    outgoing.get(connection.from).push(connection)
    indegree.set(connection.to, indegree.get(connection.to) + 1)
  }
  for (const items of outgoing.values()) {
    items.sort((a, b) => OUTCOME_ORDER.indexOf(a.outcome) - OUTCOME_ORDER.indexOf(b.outcome))
  }

  const rootSet = new Set(preferredRoots.filter((id) => idSet.has(id)))
  for (const id of ids) if (indegree.get(id) === 0) rootSet.add(id)
  if (!rootSet.size && ids[0]) rootSet.add(ids[0])

  const discovery = new Map()
  function discover(id) {
    if (discovery.has(id)) return
    discovery.set(id, discovery.size)
    for (const connection of outgoing.get(id) || []) discover(connection.to)
  }
  for (const id of rootSet) discover(id)
  for (const id of ids) discover(id)

  const remainingIndegree = new Map(indegree)
  const queue = [...ids].filter((id) => remainingIndegree.get(id) === 0)
    .sort((a, b) => (rootSet.has(b) - rootSet.has(a)) || discovery.get(a) - discovery.get(b))
  const depth = new Map(ids.map((id) => [id, 0]))
  const processed = new Set()

  while (queue.length) {
    const id = queue.shift()
    processed.add(id)
    for (const connection of outgoing.get(id) || []) {
      depth.set(connection.to, Math.max(depth.get(connection.to), depth.get(id) + 1))
      remainingIndegree.set(connection.to, remainingIndegree.get(connection.to) - 1)
      if (remainingIndegree.get(connection.to) === 0) {
        queue.push(connection.to)
        queue.sort((a, b) => discovery.get(a) - discovery.get(b))
      }
    }
  }

  let fallbackDepth = Math.max(0, ...depth.values()) + 1
  for (const id of ids) {
    if (processed.has(id)) continue
    depth.set(id, fallbackDepth)
    fallbackDepth += 1
  }

  const layers = new Map()
  for (const id of ids) {
    const column = depth.get(id)
    if (!layers.has(column)) layers.set(column, [])
    layers.get(column).push(id)
  }

  const positions = new Map()
  for (const [column, layerIds] of [...layers.entries()].sort((a, b) => a[0] - b[0])) {
    layerIds.sort((a, b) => discovery.get(a) - discovery.get(b))
    layerIds.forEach((id, row) => positions.set(id, {
      x: START_X + column * COLUMN_GAP,
      y: START_Y + row * ROW_GAP,
    }))
  }
  return positions
}

export function layoutStoryEvents(events) {
  const connections = events.flatMap((event) => OUTCOME_ORDER.flatMap((outcome) => {
    const target = event.nextByOutcome?.[outcome]
    return target ? [{ from: event.id, to: target, outcome }] : []
  }))
  return createLayout(
    events.map((event) => event.id),
    connections,
    events.filter((event) => event.initialActive).map((event) => event.id),
  )
}

export function layoutEditorNodes(nodes, edges) {
  const eventNodes = nodes.filter((node) => node.kind !== 'reference')
  const flowEdges = edges.filter((edge) => edge.kind !== 'data')
  const positions = createLayout(
    eventNodes.map((node) => node.id),
    flowEdges.map((edge) => ({ from: edge.from, to: edge.to, outcome: edge.outcome })),
  )
  const referenceSlots = new Map()
  for (const edge of edges.filter((item) => item.kind === 'data')) {
    const targetPosition = positions.get(edge.to) || nodes.find((node) => node.id === edge.to)
    if (!targetPosition) continue
    const slot = referenceSlots.get(edge.to) || 0
    referenceSlots.set(edge.to, slot + 1)
    if (!positions.has(edge.from)) positions.set(edge.from, {
      x: Math.max(40, targetPosition.x - COLUMN_GAP + 40),
      y: Math.max(40, targetPosition.y + slot * 150),
    })
  }
  return nodes.map((node) => ({ ...node, ...(positions.get(node.id) || {}) }))
}
