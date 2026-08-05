import { describe, expect, it } from 'vitest'
import {
  daltonizeColor,
  daltonizeLottieJson,
  simulateDeficiency,
  type CvdMode,
} from './cvdCorrection.ts'

type Rgba = [number, number, number, number]

// Perceptual color difference (CIE Lab, dE76). Plain RGB distance is not a
// usable yardstick here: it rates "push both colors to opposite corners of
// the RGB cube" as a huge win, which is exactly the degenerate result the
// correction must avoid. Roughly, dE < 2 is indistinguishable and dE > 30
// is obviously a different color.
function srgbToLab([r, g, b]: Rgba): [number, number, number] {
  const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const [lr, lg, lb] = [linear(r), linear(g), linear(b)]

  const x = (0.4124564 * lr + 0.3575761 * lg + 0.1804375 * lb) / 0.95047
  const y = 0.2126729 * lr + 0.7151522 * lg + 0.072175 * lb
  const z = (0.0193339 * lr + 0.119192 * lg + 0.9503041 * lb) / 1.08883

  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29)
  const [fx, fy, fz] = [f(x), f(y), f(z)]
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}

function deltaE(a: Rgba, b: Rgba): number {
  const [l1, a1, b1] = srgbToLab(a)
  const [l2, a2, b2] = srgbToLab(b)
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2)
}

// Pairs a normal viewer sees as clearly different but the given deficiency
// collapses to near-identical. Found by scanning an RGB grid for
// (normal dE > 25, simulated dE < 6) — note these are luminance-matched
// pairs, not "pure red vs pure green": those two differ so much in
// lightness that a protanope tells them apart easily.
const CONFUSABLE_PAIRS: Record<Exclude<CvdMode, 'none'>, [Rgba, Rgba]> = {
  // green vs red, seen as the same color (2.1 dE) by a protanope
  protanopia: [
    [0, 0.4, 0.6, 1],
    [1, 0, 0.6, 1],
  ],
  // the classic red/green traffic-light confusion (2.8 dE apart)
  deuteranopia: [
    [0, 0.8, 0.6, 1],
    [1, 0.4, 0.6, 1],
  ],
  // two yellows differing only in blue content, identical (0.0 dE) to a tritanope
  tritanopia: [
    [1, 0.8, 0.4, 1],
    [1, 0.8, 1, 1],
  ],
}

describe('simulateDeficiency', () => {
  it('leaves grays untouched, since they carry no color information to lose', () => {
    for (const mode of ['protanopia', 'deuteranopia', 'tritanopia'] as const) {
      for (const level of [0.25, 0.5, 0.75]) {
        // 4 decimals, not more: the published matrix coefficients only carry
        // 6 significant figures, so a ~5e-6 residual is inherent.
        const simulated = simulateDeficiency([level, level, level, 1], mode)
        expect(simulated[0]).toBeCloseTo(level, 4)
        expect(simulated[1]).toBeCloseTo(level, 4)
        expect(simulated[2]).toBeCloseTo(level, 4)
      }
    }
  })

  it('is idempotent — perceiving an already-perceived color changes nothing', () => {
    const color: Rgba = [0.8, 0.25, 0.2, 1]

    for (const mode of ['protanopia', 'deuteranopia', 'tritanopia'] as const) {
      const once = simulateDeficiency(color, mode)
      const twice = simulateDeficiency(once, mode)
      expect(deltaE(once, twice)).toBeLessThan(0.1)
    }
  })

  it('collapses the confusable pairs the correction is meant to fix', () => {
    for (const [mode, [a, b]] of Object.entries(CONFUSABLE_PAIRS) as [
      Exclude<CvdMode, 'none'>,
      [Rgba, Rgba],
    ][]) {
      expect(deltaE(a, b)).toBeGreaterThan(25)
      expect(deltaE(simulateDeficiency(a, mode), simulateDeficiency(b, mode))).toBeLessThan(6)
    }
  })
})

describe('daltonizeColor', () => {
  it('returns the color unchanged for mode "none"', () => {
    const rgba: Rgba = [0.8, 0.2, 0.1, 1]
    expect(daltonizeColor(rgba, 'none')).toEqual(rgba)
  })

  it('preserves alpha and stays in gamut', () => {
    const rgba: Rgba = [0.8, 0.2, 0.1, 0.5]

    for (const mode of ['protanopia', 'deuteranopia', 'tritanopia'] as const) {
      const corrected = daltonizeColor(rgba, mode)
      expect(corrected[3]).toBe(0.5)
      for (const channel of corrected.slice(0, 3)) {
        expect(channel).toBeGreaterThanOrEqual(0)
        expect(channel).toBeLessThanOrEqual(1)
      }
    }
  })

  it('leaves grays alone — there is nothing to redistribute', () => {
    for (const mode of ['protanopia', 'deuteranopia', 'tritanopia'] as const) {
      const gray: Rgba = [0.5, 0.5, 0.5, 1]
      expect(deltaE(daltonizeColor(gray, mode), gray)).toBeLessThan(1)
    }
  })

  // The actual claim the feature makes: after correction, colors that the
  // deficiency used to confuse are told apart.
  it('separates confusable pairs as seen through the deficiency', () => {
    for (const [mode, [a, b]] of Object.entries(CONFUSABLE_PAIRS) as [
      Exclude<CvdMode, 'none'>,
      [Rgba, Rgba],
    ][]) {
      const before = deltaE(simulateDeficiency(a, mode), simulateDeficiency(b, mode))
      const after = deltaE(
        simulateDeficiency(daltonizeColor(a, mode), mode),
        simulateDeficiency(daltonizeColor(b, mode), mode),
      )

      expect(after).toBeGreaterThan(before + 10)
    }
  })

  // Separation alone is easy to fake by driving every color to a gamut
  // corner (white/black), which would ruin the exported asset. The
  // correction has to stay recognizably close to the original.
  it('does not wreck the original colors while separating them', () => {
    for (const [mode, [a, b]] of Object.entries(CONFUSABLE_PAIRS) as [
      Exclude<CvdMode, 'none'>,
      [Rgba, Rgba],
    ][]) {
      expect(deltaE(daltonizeColor(a, mode), a)).toBeLessThan(60)
      expect(deltaE(daltonizeColor(b, mode), b)).toBeLessThan(60)
    }
  })
})

describe('daltonizeLottieJson', () => {
  it('returns the input unchanged for mode "none"', () => {
    const json = JSON.stringify({ slots: { a: { p: { a: 0, k: [0.8, 0.2, 0.1, 1] } } } })
    expect(daltonizeLottieJson(json, 'none')).toBe(json)
  })

  it('replaces every slot color for a correction mode', () => {
    const json = JSON.stringify({
      slots: {
        a: { p: { a: 0, k: [0.8, 0.2, 0.1, 1] } },
        b: { p: { a: 0, k: [0.1, 0.6, 0.9, 1] } },
      },
    })

    const result = JSON.parse(daltonizeLottieJson(json, 'deuteranopia')) as {
      slots: Record<string, { p: { k: number[] } }>
    }

    expect(result.slots.a.p.k).not.toEqual([0.8, 0.2, 0.1, 1])
    expect(result.slots.b.p.k).not.toEqual([0.1, 0.6, 0.9, 1])
  })
})
