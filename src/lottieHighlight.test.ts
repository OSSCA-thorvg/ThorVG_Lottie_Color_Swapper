import { describe, expect, it } from 'vitest'
import { createHighlightLottie } from './lottieHighlight.ts'

describe('createHighlightLottie', () => {
  it('makes only the selected slot visible in the highlight color', () => {
    const source = JSON.stringify({
      slots: {
        first: { p: { a: 0, k: [1, 0, 0, 1] } },
        second: { p: { a: 0, k: [0, 1, 0, 1] } },
      },
    })

    const result = JSON.parse(createHighlightLottie(source, 'second'))

    expect(result.slots.first.p.k).toEqual([0, 0, 0, 0])
    expect(result.slots.second.p.k).toEqual([1, 0.65, 0, 0.7])
  })

  it('does not mutate the source JSON', () => {
    const source = JSON.stringify({
      slots: { first: { p: { a: 0, k: [1, 0, 0, 1] } } },
    })

    createHighlightLottie(source, 'first')

    expect(JSON.parse(source).slots.first.p.k).toEqual([1, 0, 0, 1])
  })

  it('leaves slot data unchanged when no slots exist', () => {
    const source = JSON.stringify({ layers: [] })

    expect(createHighlightLottie(source, 'missing')).toBe(source)
  })
})
