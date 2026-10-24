let audioContext = null

function getAudioContext() {
  if (typeof window === 'undefined') return null
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) return null
  if (!audioContext || audioContext.state === 'closed') audioContext = new AudioContextClass()
  if (audioContext.state === 'suspended') void audioContext.resume().catch(() => {})
  return audioContext
}

function playTone(context, {
  frequency,
  endFrequency = frequency,
  duration,
  volume,
  type = 'sine',
  delay = 0,
}) {
  const start = context.currentTime + delay
  const oscillator = context.createOscillator()
  const gain = context.createGain()

  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, start)
  if (endFrequency !== frequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.003)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  oscillator.connect(gain).connect(context.destination)
  oscillator.start(start)
  oscillator.stop(start + duration + 0.02)
}

function playNoiseClick(context, frequency) {
  const duration = 0.022
  const sampleCount = Math.max(1, Math.floor(context.sampleRate * duration))
  const buffer = context.createBuffer(1, sampleCount, context.sampleRate)
  const samples = buffer.getChannelData(0)
  for (let index = 0; index < sampleCount; index += 1) {
    samples[index] = (Math.random() * 2 - 1) * (1 - index / sampleCount)
  }

  const source = context.createBufferSource()
  const filter = context.createBiquadFilter()
  const gain = context.createGain()
  const start = context.currentTime
  source.buffer = buffer
  filter.type = 'bandpass'
  filter.frequency.setValueAtTime(frequency, start)
  filter.Q.setValueAtTime(0.8, start)
  gain.gain.setValueAtTime(0.025, start)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  source.connect(filter).connect(gain).connect(context.destination)
  source.start(start)
}

export function prepareSynthAudio() {
  if (typeof document === 'undefined') return () => {}

  const cleanup = () => {
    document.removeEventListener('pointerdown', unlock, true)
    document.removeEventListener('keydown', unlock, true)
  }
  const unlock = () => {
    getAudioContext()
    cleanup()
  }

  document.addEventListener('pointerdown', unlock, { capture: true, once: true })
  document.addEventListener('keydown', unlock, { capture: true, once: true })
  return cleanup
}

export function playPasscodeDigitSound() {
  const context = getAudioContext()
  if (!context) return
  const pitch = 510 + Math.random() * 24
  playTone(context, { frequency: pitch, endFrequency: pitch * 0.92, duration: 0.048, volume: 0.032 })
}

export function playPasscodeDeleteSound() {
  const context = getAudioContext()
  if (!context) return
  playTone(context, { frequency: 330, endFrequency: 230, duration: 0.07, volume: 0.035, type: 'triangle' })
}

export function playKeyboardTapSound() {
  const context = getAudioContext()
  if (!context) return
  playNoiseClick(context, 1750 + Math.random() * 260)
}

export function playMessageSendSound() {
  const context = getAudioContext()
  if (!context) return
  playTone(context, { frequency: 620, endFrequency: 710, duration: 0.075, volume: 0.025, type: 'triangle' })
  playTone(context, { frequency: 880, endFrequency: 1040, duration: 0.12, volume: 0.032, type: 'sine', delay: 0.045 })
}

export function playMessageReceiveSound() {
  const context = getAudioContext()
  if (!context) return
  playTone(context, { frequency: 880, duration: 0.1, volume: 0.032, type: 'sine' })
  playTone(context, { frequency: 1320, endFrequency: 1240, duration: 0.18, volume: 0.04, type: 'sine', delay: 0.085 })
}
