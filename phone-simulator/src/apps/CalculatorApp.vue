<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Delete } from 'lucide-vue-next'

defineProps({ app: { type: Object, required: true } })

const expression = ref('')
const evaluatedExpression = ref('')
const evaluatedResult = ref('')
const isEvaluated = ref(false)

const operators = new Set(['+', '−', '×', '÷'])
const keys = [
  { label: 'C', value: 'clear', tone: 'utility' },
  { label: '%', value: 'percent', tone: 'utility' },
  { label: '删除', value: 'backspace', tone: 'utility', icon: Delete },
  { label: '÷', value: '÷', tone: 'operator' },
  { label: '7', value: '7' },
  { label: '8', value: '8' },
  { label: '9', value: '9' },
  { label: '×', value: '×', tone: 'operator' },
  { label: '4', value: '4' },
  { label: '5', value: '5' },
  { label: '6', value: '6' },
  { label: '−', value: '−', tone: 'operator' },
  { label: '1', value: '1' },
  { label: '2', value: '2' },
  { label: '3', value: '3' },
  { label: '+', value: '+', tone: 'operator' },
  { label: '00', value: '00' },
  { label: '0', value: '0' },
  { label: '.', value: '.' },
  { label: '=', value: 'equals', tone: 'equals' },
]

function normalizeNumber(value) {
  if (!Number.isFinite(value)) return null
  const rounded = Math.round((value + Number.EPSILON) * 1e12) / 1e12
  const absolute = Math.abs(rounded)
  const sign = rounded < 0 ? '−' : ''
  if (absolute >= 1e12 || (absolute > 0 && absolute < 1e-9)) {
    return sign + absolute.toExponential(8).replace(/\.0+e/, 'e').replace(/(\.\d*?)0+e/, '$1e')
  }
  return sign + String(absolute)
}

function tokenize(value) {
  const tokens = []
  let index = 0
  while (index < value.length) {
    const char = value[index]
    const unaryMinus = char === '−' && index === 0
    if (/\d|\./.test(char) || unaryMinus) {
      let number = unaryMinus ? '-' : ''
      index += unaryMinus ? 1 : 0
      let dots = 0
      while (index < value.length && /\d|\./.test(value[index])) {
        if (value[index] === '.') dots += 1
        number += value[index]
        index += 1
      }
      if (dots > 1 || number === '-' || number === '.' || number === '-.') return null
      const numeric = Number(number)
      if (!Number.isFinite(numeric)) return null
      tokens.push(numeric)
      continue
    }
    if (operators.has(char)) {
      tokens.push(char)
      index += 1
      continue
    }
    return null
  }
  return tokens
}

function calculate(value) {
  if (!value || operators.has(value.at(-1))) return null
  const tokens = tokenize(value)
  if (!tokens || tokens.length === 0 || tokens.length % 2 === 0) return null

  const reduced = [tokens[0]]
  for (let index = 1; index < tokens.length; index += 2) {
    const operator = tokens[index]
    const number = tokens[index + 1]
    if (typeof number !== 'number') return null
    if (operator === '×' || operator === '÷') {
      if (operator === '÷' && number === 0) return '无法除以零'
      const previous = reduced.pop()
      reduced.push(operator === '×' ? previous * number : previous / number)
    } else {
      reduced.push(operator, number)
    }
  }

  let total = reduced[0]
  for (let index = 1; index < reduced.length; index += 2) {
    total = reduced[index] === '+' ? total + reduced[index + 1] : total - reduced[index + 1]
  }
  return normalizeNumber(total) ?? '错误'
}

const liveResult = computed(() => {
  const value = expression.value
  const hasBinaryOperator = [...value].some((char, index) => operators.has(char) && index > 0)
  if (!hasBinaryOperator) return ''
  return calculate(value) ?? ''
})

const expressionStyle = computed(() => {
  const length = (isEvaluated.value ? evaluatedExpression.value : expression.value).length
  if (isEvaluated.value) return {}
  if (length > 18) return { fontSize: '32px' }
  if (length > 12) return { fontSize: '40px' }
  return {}
})

function currentNumberRange() {
  let start = expression.value.length
  while (start > 0 && !operators.has(expression.value[start - 1])) start -= 1
  if (start === 1 && expression.value[0] === '−') start = 0
  return { start, value: expression.value.slice(start) }
}

function startFreshIfNeeded() {
  if (!isEvaluated.value) return
  expression.value = ''
  evaluatedExpression.value = ''
  evaluatedResult.value = ''
  isEvaluated.value = false
}

function appendDigits(value) {
  startFreshIfNeeded()
  const current = currentNumberRange()
  if (expression.value.length >= 28) return
  if (current.value === '0') {
    expression.value = expression.value.slice(0, current.start) + (value === '00' ? '0' : value)
    return
  }
  expression.value += value
}

function appendDecimal() {
  startFreshIfNeeded()
  const current = currentNumberRange().value
  if (current.includes('.')) return
  expression.value += current && current !== '−' ? '.' : '0.'
}

function appendOperator(operator) {
  if (isEvaluated.value) {
    if (evaluatedResult.value === '无法除以零' || evaluatedResult.value === '错误') return
    expression.value = evaluatedResult.value
    evaluatedExpression.value = ''
    evaluatedResult.value = ''
    isEvaluated.value = false
  }
  if (!expression.value) {
    if (operator === '−') expression.value = operator
    return
  }
  if (expression.value === '−') return
  if (operators.has(expression.value.at(-1))) {
    expression.value = expression.value.slice(0, -1) + operator
    return
  }
  expression.value += operator
}

function applyPercent() {
  if (isEvaluated.value) {
    if (evaluatedResult.value === '无法除以零' || evaluatedResult.value === '错误') return
    expression.value = evaluatedResult.value
    isEvaluated.value = false
  }
  const current = currentNumberRange()
  if (!current.value || current.value === '−') return
  const numeric = Number(current.value.replace('−', '-'))
  const percent = normalizeNumber(numeric / 100)
  if (percent !== null) expression.value = expression.value.slice(0, current.start) + percent
}

function clearAll() {
  expression.value = ''
  evaluatedExpression.value = ''
  evaluatedResult.value = ''
  isEvaluated.value = false
}

function backspace() {
  if (isEvaluated.value) {
    expression.value = evaluatedExpression.value
    evaluatedExpression.value = ''
    evaluatedResult.value = ''
    isEvaluated.value = false
  }
  expression.value = expression.value.slice(0, -1)
}

function evaluate() {
  const result = calculate(expression.value)
  if (result === null) return
  evaluatedExpression.value = expression.value
  evaluatedResult.value = result
  isEvaluated.value = true
}

function press(value) {
  if (/^\d+$/.test(value)) appendDigits(value)
  else if (value === '.') appendDecimal()
  else if (operators.has(value)) appendOperator(value)
  else if (value === 'percent') applyPercent()
  else if (value === 'backspace') backspace()
  else if (value === 'clear') clearAll()
  else if (value === 'equals') evaluate()
}

function handleKeyboard(event) {
  if (/^\d$/.test(event.key)) press(event.key)
  else if (event.key === '.') press('.')
  else if (event.key === '+') press('+')
  else if (event.key === '-') press('−')
  else if (event.key === '*') press('×')
  else if (event.key === '/') press('÷')
  else if (event.key === '%') press('percent')
  else if (event.key === 'Backspace') press('backspace')
  else if (event.key === 'Escape') press('clear')
  else if (event.key === 'Enter' || event.key === '=') press('equals')
  else return
  event.preventDefault()
}

onMounted(() => window.addEventListener('keydown', handleKeyboard))
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeyboard))
</script>

<template>
  <div class="calculator-app">
    <main class="calculator-display" aria-live="polite">
      <template v-if="isEvaluated">
        <div class="calculator-expression calculator-expression--history">{{ evaluatedExpression }}</div>
        <div class="calculator-result calculator-result--final">{{ evaluatedResult }}</div>
      </template>
      <template v-else>
        <div class="calculator-expression" :style="expressionStyle">{{ expression || '0' }}</div>
        <div v-if="liveResult" class="calculator-result">{{ liveResult }}</div>
      </template>
    </main>

    <section class="calculator-keypad" aria-label="计算器按键">
      <button
        v-for="key in keys"
        :key="key.value"
        class="calculator-key"
        :class="key.tone ? `calculator-key--${key.tone}` : ''"
        type="button"
        :aria-label="key.label"
        @click="press(key.value)"
      >
        <component :is="key.icon" v-if="key.icon" :size="29" :stroke-width="1.8" />
        <span v-else>{{ key.label }}</span>
      </button>
    </section>
  </div>
</template>
