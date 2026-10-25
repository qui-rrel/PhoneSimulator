const emojiPattern = /\p{Extended_Pictographic}|\p{Regional_Indicator}|[#*0-9]\uFE0F?\u20E3/u
const graphemeSegmenter = typeof Intl !== 'undefined' && Intl.Segmenter
  ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  : null

function splitGraphemes(value) {
  const text = String(value || '')
  return graphemeSegmenter
    ? [...graphemeSegmenter.segment(text)].map((item) => item.segment)
    : Array.from(text)
}

function isEmoji(grapheme) {
  return emojiPattern.test(grapheme)
}

export function createTypingPlan(text, configuredKeystrokes = '') {
  const graphemes = splitGraphemes(text)
  const typeableCount = graphemes.filter((grapheme) => !isEmoji(grapheme)).length
  const fallbackSequence = graphemes
    .filter((grapheme) => !isEmoji(grapheme) && !/\s/u.test(grapheme))
    .join('')
  const sequence = String(configuredKeystrokes || '').trim() || fallbackSequence
  const keystrokes = splitGraphemes(sequence)
    .filter((grapheme) => !isEmoji(grapheme) && !/\s/u.test(grapheme))

  function render(typedCount) {
    const output = []
    let visitedTypeable = 0
    for (const grapheme of graphemes) {
      if (isEmoji(grapheme)) {
        if (visitedTypeable <= typedCount) output.push(grapheme)
        continue
      }
      visitedTypeable += 1
      if (visitedTypeable <= typedCount) output.push(grapheme)
    }
    return output.join('')
  }

  return { keystrokes, typeableCount, render }
}
