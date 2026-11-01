import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const distRoot = join(projectRoot, 'dist')
const assetsRoot = join(distRoot, 'assets')

if (!existsSync(assetsRoot)) throw new Error('缺少 dist/assets，请先运行 Vite 生产构建。')

const assetFiles = readdirSync(assetsRoot)
const scriptFiles = assetFiles.filter((file) => extname(file) === '.js')
const protectedChunks = scriptFiles.filter((file) => file.startsWith('protected-core-'))
if (protectedChunks.length !== 1) {
  throw new Error(`预期生成一个 protected-core chunk，实际为 ${protectedChunks.length} 个。`)
}

const unexpectedFiles = readdirSync(distRoot, { recursive: true })
  .map(String)
  .filter((file) => ['.json', '.map'].includes(extname(file)))
if (unexpectedFiles.length) {
  throw new Error(`生产包不应包含原始 JSON 或 source map：${unexpectedFiles.join(', ')}`)
}

const scripts = scriptFiles
  .map((file) => readFileSync(join(assetsRoot, file), 'utf8'))
  .join('\n')
const protectedOperations = [
  'content-open',
  'message-input',
  'outgoing-call',
  'outgoing-call-accepted',
  'outgoing-call-missed',
  'incoming-call-accepted',
  'incoming-call-rejected',
  'incoming-call-missed',
  'call-ended',
  'moment-liked',
  'moment-unliked',
  'moment-comment-sent',
  'moment-published',
]
const exposedOperations = protectedOperations.filter((operation) => scripts.includes(operation))
if (exposedOperations.length) {
  throw new Error(`剧情操作名称仍以明文存在：${exposedOperations.join(', ')}`)
}

function collectLongStrings(value, output) {
  if (typeof value === 'string') {
    const text = value.trim()
    if (text.length >= 20 && !text.startsWith('/media/') && !/^https?:\/\//i.test(text)) output.add(text)
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectLongStrings(item, output))
    return
  }
  if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => collectLongStrings(item, output))
  }
}

const configuredStrings = new Set()
for (const file of ['content.json', 'story.json']) {
  const source = JSON.parse(readFileSync(join(projectRoot, 'src', 'data', file), 'utf8'))
  collectLongStrings(source, configuredStrings)
}
const exposedContent = [...configuredStrings]
  .sort((left, right) => right.length - left.length)
  .slice(0, 200)
  .filter((value) => scripts.includes(value))
if (exposedContent.length) {
  throw new Error(`检测到 ${exposedContent.length} 条长配置文本仍以明文存在。`)
}

console.log(`Protected build verified: ${protectedChunks[0]}`)
