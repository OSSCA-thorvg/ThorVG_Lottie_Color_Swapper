import { describe, expect, it } from 'vitest'
import { daltonizeColor, simulateDeficiency, type CvdMode } from './cvdCorrection.ts'

// ---------------------------------------------------------------------------
// Cross-model verification.
//
// The correction in cvdCorrection.ts is built on ONE model of dichromatic
// vision (Viénot, Brettel & Mollon 1999). Scoring it with that same model
// would be circular: it could be tuned to look good only to its own judge.
//
// So this file scores it with a SECOND, independent model — Machado, Oliveira
// & Fernandes (2009), "A Physiologically-based Model for Simulation of Color
// Vision Deficiency" — different authors, different derivation, and the model
// Chrome ships for DevTools' "Emulate vision deficiencies". Nothing in the
// correction was tuned against it, which is what makes agreement meaningful.
// It is intentionally reimplemented here rather than imported from the app.
// ---------------------------------------------------------------------------

type Rgba = [number, number, number, number]
type Deficiency = Exclude<CvdMode, 'none'>
const MODES: Deficiency[] = ['protanopia', 'deuteranopia', 'tritanopia']

// Machado et al. 2009, Table 1, severity 1.0 (full dichromacy). These operate
// on linear light, like any physiologically derived matrix.
const MACHADO_2009: Record<Deficiency, number[][]> = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const toSrgb = (c: number) => {
  const v = clamp01(c)
  return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055
}

/** What Chrome's model says this color looks like to the given deficiency. */
function simulateMachado(rgba: Rgba, mode: Deficiency): Rgba {
  const m = MACHADO_2009[mode]
  const [r, g, b] = [toLinear(rgba[0]), toLinear(rgba[1]), toLinear(rgba[2])]
  return [
    toSrgb(m[0][0] * r + m[0][1] * g + m[0][2] * b),
    toSrgb(m[1][0] * r + m[1][1] * g + m[1][2] * b),
    toSrgb(m[2][0] * r + m[2][1] * g + m[2][2] * b),
    rgba[3],
  ]
}

// Perceptual distance (CIE Lab, dE76). Raw RGB distance would reward pushing
// every color to a gamut corner, which is exactly the degenerate "fix" this
// verification has to be able to reject. dE < ~2 is indistinguishable.
function deltaE(a: Rgba, b: Rgba): number {
  const lab = (rgba: Rgba) => {
    const [r, g, bl] = [toLinear(rgba[0]), toLinear(rgba[1]), toLinear(rgba[2])]
    const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * bl) / 0.95047
    const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * bl
    const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * bl) / 1.08883
    const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29)
    const [fx, fy, fz] = [f(x), f(y), f(z)]
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
  }
  const [l1, a1, b1] = lab(a)
  const [l2, a2, b2] = lab(b)
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2)
}

const GRID: Rgba[] = []
for (const r of [0, 0.2, 0.4, 0.6, 0.8, 1]) {
  for (const g of [0, 0.2, 0.4, 0.6, 0.8, 1]) {
    for (const b of [0, 0.2, 0.4, 0.6, 0.8, 1]) GRID.push([r, g, b, 1])
  }
}

/**
 * Colors a normal viewer sees as clearly different (dE > 25) that the given
 * deficiency collapses to near-identical (dE < 6), according to `judge`.
 * These — and only these — are the pairs the correction exists to fix.
 */
function findConfusablePairs(mode: Deficiency, judge: (c: Rgba, m: Deficiency) => Rgba) {
  const seen = GRID.map((c) => judge(c, mode))
  const pairs: [number, number][] = []
  for (let i = 0; i < GRID.length; i++) {
    for (let j = i + 1; j < GRID.length; j++) {
      if (deltaE(GRID[i], GRID[j]) > 25 && deltaE(seen[i], seen[j]) < 6) pairs.push([i, j])
    }
  }
  return { pairs, seen }
}

// A corrected color that landed outside the RGB cube and had to be clipped
// back onto its surface. Clipping is many-to-one, so it is where distinct
// colors can get mapped onto each other.
const wasClipped = (c: Rgba) => c.slice(0, 3).some((x) => x <= 0.0001 || x >= 0.9999)
const ALL_PAIRS = (GRID.length * (GRID.length - 1)) / 2

function scoreCorrection(mode: Deficiency, judge: (c: Rgba, m: Deficiency) => Rgba) {
  const { pairs, seen } = findConfusablePairs(mode, judge)
  const corrected = GRID.map((c) => daltonizeColor(c, mode))
  const seenAfter = corrected.map((c) => judge(c, mode))

  let improved = 0
  let gain = 0
  let drift = 0

  for (const [i, j] of pairs) {
    const before = deltaE(seen[i], seen[j])
    const after = deltaE(seenAfter[i], seenAfter[j])
    if (after > before + 0.5) improved++
    gain += after - before
    drift += (deltaE(GRID[i], corrected[i]) + deltaE(GRID[j], corrected[j])) / 2
  }

  // The cost side of the ledger, reported rather than hidden: redistributing
  // the error can push two colors the deficiency COULD tell apart onto each
  // other. The published algorithm has no constraint preventing this. The
  // mechanism is gamut clipping — the correction sends a color outside the
  // RGB cube and clipping it back collapses the distinction.
  let newlyConfused = 0
  let newlyConfusedByClipping = 0
  for (let i = 0; i < GRID.length; i++) {
    for (let j = i + 1; j < GRID.length; j++) {
      if (deltaE(seen[i], seen[j]) < 15) continue
      if (deltaE(seenAfter[i], seenAfter[j]) >= 6) continue
      newlyConfused++
      if (wasClipped(corrected[i]) || wasClipped(corrected[j])) newlyConfusedByClipping++
    }
  }

  return {
    total: pairs.length,
    improved,
    newlyConfused,
    newlyConfusedByClipping,
    gain: gain / pairs.length,
    drift: drift / pairs.length,
  }
}

describe('cross-model verification against Machado et al. 2009 (Chrome DevTools model)', () => {
  it('the independent model agrees these colors are confusable in the first place', () => {
    // If the two models disagreed about what is confusable, neither could be
    // used to check the other.
    for (const mode of MODES) {
      const ours = findConfusablePairs(mode, simulateDeficiency).pairs.length
      const theirs = findConfusablePairs(mode, simulateMachado).pairs.length
      expect(ours).toBeGreaterThan(0)
      expect(theirs).toBeGreaterThan(0)
    }
  })

  it('both models agree grays carry no color information to lose', () => {
    for (const mode of MODES) {
      for (const level of [0.25, 0.5, 0.75]) {
        const gray: Rgba = [level, level, level, 1]
        expect(deltaE(simulateDeficiency(gray, mode), gray)).toBeLessThan(1)
        expect(deltaE(simulateMachado(gray, mode), gray)).toBeLessThan(1)
      }
    }
  })

  // Documented limitation, not a passing grade. The published algorithm can
  // collapse a pair the deficiency could previously distinguish; this pins
  // down how often, so the number is stated rather than discovered later.
  it('collapses few distinguishable pairs, and does so via gamut clipping', () => {
    // Pinned per mode rather than as one loose bound. Tritanopia is the weak
    // one by a wide margin, which matches the literature: the single-plane
    // LMS projection Viénot et al. use is validated for the red-green types,
    // while tritanopia really needs Brettel et al.'s two-plane construction.
    const budget: Record<Deficiency, number> = {
      protanopia: 0.015,
      deuteranopia: 0.015,
      tritanopia: 0.04,
    }

    for (const mode of MODES) {
      for (const judge of [simulateDeficiency, simulateMachado]) {
        const r = scoreCorrection(mode, judge)
        expect(r.newlyConfused / ALL_PAIRS).toBeLessThan(budget[mode])
        expect(r.newlyConfusedByClipping / r.newlyConfused).toBeGreaterThan(0.6)
      }
    }
  })

  it('separates red-green confusable pairs, as scored by the independent model', () => {
    for (const mode of ['protanopia', 'deuteranopia'] as const) {
      const result = scoreCorrection(mode, simulateMachado)
      expect(result.improved / result.total).toBeGreaterThan(0.9)
      expect(result.gain).toBeGreaterThan(15)
    }
  })

  it('keeps corrected colors recognizably close to the originals', () => {
    // Guards against the degenerate "separate everything by bleaching it"
    // solution: average drift has to stay well under a full color change.
    for (const mode of MODES) {
      expect(scoreCorrection(mode, simulateMachado).drift).toBeLessThan(40)
    }
  })

  it('prints the verification table', () => {
    const rows: string[] = []
    rows.push('')
    rows.push('  Correction model : Vienot, Brettel & Mollon (1999)')
    rows.push('  Scoring model    : Machado, Oliveira & Fernandes (2009)  [Chrome DevTools]')
    rows.push('  Metric           : CIE Lab dE76, over a 216-color RGB grid')
    rows.push('')
    rows.push('  deficiency      confusable   separated   avg gain   avg drift   newly confused')
    rows.push('  ' + '-'.repeat(84))

    for (const mode of MODES) {
      const r = scoreCorrection(mode, simulateMachado)
      const confusedPct = ((r.newlyConfused / ALL_PAIRS) * 100).toFixed(1)
      rows.push(
        `  ${mode.padEnd(14)} ${String(r.total).padStart(10)}   ${`${r.improved}/${r.total}`.padStart(9)}   ` +
          `${r.gain.toFixed(1).padStart(8)}   ${r.drift.toFixed(1).padStart(9)}   ${`${confusedPct}%`.padStart(14)}`,
      )
    }
    rows.push('')
    rows.push(`  separated  = confusable pairs the correction pulls apart`)
    rows.push(`  avg gain   = how much further apart they become (dE)`)
    rows.push(`  avg drift  = how far corrected colors move from the original (dE)`)
    rows.push(`  newly confused = share of all ${ALL_PAIRS} pairs the correction collapses;`)
    rows.push(`                   a known cost of the published algorithm, caused by gamut clipping`)
    rows.push('')
    console.log(rows.join('\n'))
    expect(rows.length).toBeGreaterThan(0)
  })
})
