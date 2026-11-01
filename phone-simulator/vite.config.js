import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import JavaScriptObfuscator from 'javascript-obfuscator'
import { defineConfig } from 'vite'

const projectRoot = dirname(fileURLToPath(import.meta.url))
const virtualConfigFiles = new Map([
  ['virtual:protected-content-config', resolve(projectRoot, 'src/data/content.json')],
  ['virtual:protected-story-config', resolve(projectRoot, 'src/data/story.json')],
])
const protectedSourceFiles = [
  '/src/config/phone.config.js',
  '/src/config/story.config.js',
  '/src/config/story.operations.js',
]

function encodeConfigPayload(filePath) {
  const json = JSON.stringify(JSON.parse(readFileSync(filePath, 'utf8')))
  const source = Buffer.from(json, 'utf8')
  const key = randomBytes(32)
  const salt = randomBytes(16)
  const encoded = Buffer.allocUnsafe(source.length)

  for (let index = 0; index < source.length; index += 1) {
    const saltByte = salt[index % salt.length]
    const keyByte = key[(index + saltByte) % key.length]
    const rollingByte = (index * 29 + key[index % key.length]) & 0xff
    encoded[index] = source[index] ^ keyByte ^ saltByte ^ rollingByte
  }

  return `
    const payload = ${JSON.stringify(encoded.toString('base64'))}
    const key = ${JSON.stringify(key.toString('base64'))}
    const salt = ${JSON.stringify(salt.toString('base64'))}
    const fromBase64 = (value) => Uint8Array.from(atob(value), (character) => character.charCodeAt(0))
    const encrypted = fromBase64(payload)
    const keyBytes = fromBase64(key)
    const saltBytes = fromBase64(salt)
    const decoded = new Uint8Array(encrypted.length)
    for (let index = 0; index < encrypted.length; index += 1) {
      const saltByte = saltBytes[index % saltBytes.length]
      const keyByte = keyBytes[(index + saltByte) % keyBytes.length]
      const rollingByte = (index * 29 + keyBytes[index % keyBytes.length]) & 0xff
      decoded[index] = encrypted[index] ^ keyByte ^ saltByte ^ rollingByte
    }
    export default JSON.parse(new TextDecoder().decode(decoded))
  `
}

function protectRuntimeConfigPlugin() {
  const resolvedVirtualIds = new Map(
    [...virtualConfigFiles.keys()].map((id) => [`\0${id}`, id]),
  )

  return {
    name: 'protect-runtime-config',
    resolveId(id) {
      return virtualConfigFiles.has(id) ? `\0${id}` : null
    },
    load(id) {
      const publicId = resolvedVirtualIds.get(id)
      if (!publicId) return null
      return encodeConfigPayload(virtualConfigFiles.get(publicId))
    },
    renderChunk(code, chunk) {
      if (chunk.name !== 'protected-core') return null
      const result = JavaScriptObfuscator.obfuscate(code, {
        advertisement: false,
        compact: true,
        controlFlowFlattening: false,
        deadCodeInjection: false,
        debugProtection: false,
        disableConsoleOutput: false,
        identifierNamesGenerator: 'hexadecimal',
        ignoreImports: true,
        renameGlobals: false,
        renameProperties: false,
        reservedStrings: ['^[A-Za-z0-9+/]{100,}={0,2}$'],
        selfDefending: false,
        simplify: true,
        sourceMap: false,
        splitStrings: false,
        stringArray: true,
        stringArrayCallsTransform: false,
        stringArrayEncoding: ['base64'],
        stringArrayIndexShift: true,
        stringArrayRotate: true,
        stringArrayShuffle: true,
        stringArrayThreshold: 1,
        target: 'browser-no-eval',
        transformObjectKeys: false,
        unicodeEscapeSequence: false,
      })
      return { code: result.getObfuscatedCode(), map: null }
    },
  }
}

export default defineConfig({
  plugins: [vue(), protectRuntimeConfigPlugin()],
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        onlyExplicitManualChunks: true,
        manualChunks(id) {
          const normalizedId = id.replaceAll('\\', '/')
          if (normalizedId.includes('virtual:protected-')) return 'protected-core'
          if (protectedSourceFiles.some((file) => normalizedId.endsWith(file))) return 'protected-core'
          return undefined
        },
      },
    },
  },
})
