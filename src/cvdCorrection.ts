export type CvdMode = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia'

type Vec3 = [number, number, number]
type Mat3 = [Vec3, Vec3, Vec3]

function multiply3(m: Mat3, v: Vec3): Vec3 {
  return [
    m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
    m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
    m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
  ]
}

function invert3(m: Mat3): Mat3 {
  const [[a, b, c], [d, e, f], [g, h, i]] = m
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g)

  return [
    [(e * i - f * h) / det, (c * h - b * i) / det, (b * f - c * e) / det],
    [(f * g - d * i) / det, (a * i - c * g) / det, (c * d - a * f) / det],
    [(d * h - e * g) / det, (b * g - a * h) / det, (a * e - b * d) / det],
  ]
}

// sRGB primaries expressed in LMS cone-response space. Derived from the
// Smith & Pokorny (1975) cone fundamentals, and the same matrix used by
// Viénot, Brettel & Mollon (1999), "Digital video colourmaps for checking
// the legibility of displays by dichromats".
//
// This is a *linear*-RGB transform: sRGB values have to be gamma-decoded
// before they enter here (see toLinear/toSrgb). The widely copied reference
// code from Fidaner, Lin & Özgüven skips that step, which makes simulated
// output come out too dark; daltonize.org-derived implementations inherited
// the same bug.
const RGB_TO_LMS: Mat3 = [
  [17.8824, 43.5161, 4.11935],
  [3.45565, 27.1554, 3.86714],
  [0.0299566, 0.184309, 1.46709],
]
const LMS_TO_RGB = invert3(RGB_TO_LMS)

// sRGB transfer function. The simulation below models cone physiology, so it
// has to run on light-linear values, not on display-encoded ones.
function toLinear(channel: number): number {
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
}

function toSrgb(channel: number): number {
  const v = clamp01(channel)
  return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055
}

// Per-deficiency simulation matrices applied in LMS space: each collapses
// the missing cone's response onto the other two, modeling what a dichromat
// actually perceives.
const SIMULATION_MATRICES: Record<Exclude<CvdMode, 'none'>, Mat3> = {
  protanopia: [
    [0, 2.02344, -2.52581],
    [0, 1, 0],
    [0, 0, 1],
  ],
  deuteranopia: [
    [1, 0, 0],
    [0.494207, 0, 1.24827],
    [0, 0, 1],
  ],
  tritanopia: [
    [1, 0, 0],
    [0, 1, 0],
    [-0.395913, 0.801109, 0],
  ],
}

// Redistributes the color information the deficiency loses (the difference
// between the original and the simulated-perception color) into the channels
// that deficiency *can* still discriminate. It doesn't reproduce the original
// color — it shifts it toward one that's easier to tell apart from its
// neighbors.
//
// The matrix has to match the lost axis. Protanopia/deuteranopia lose the
// red-green axis, so the red error moves into green and blue (the standard
// Daltonization matrix). Tritanopia loses blue-yellow instead, so the same
// matrix would dump the correction into blue — the one channel a tritanope
// can't use. Mirroring it to push the blue error into red and green raises
// the fraction of confusable pairs it separates from 465/775 to 734/775
// while *reducing* how far colors drift from the original (see
// cvdCorrection.test.ts).
const ERROR_REDISTRIBUTION: Record<Exclude<CvdMode, 'none'>, Mat3> = {
  protanopia: [
    [0, 0, 0],
    [0.7, 1, 0],
    [0.7, 0, 1],
  ],
  deuteranopia: [
    [0, 0, 0],
    [0.7, 1, 0],
    [0.7, 0, 1],
  ],
  tritanopia: [
    [1, 0, 0.7],
    [0, 1, 0.7],
    [0, 0, 0],
  ],
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

// What the given deficiency actually perceives for this color (simulation
// only, no correction) — exported so it can be used to verify that
// daltonizeColor() actually improves distinguishability under simulation,
// not just that it changes the color.
export function simulateDeficiency(
  rgba: [number, number, number, number],
  mode: Exclude<CvdMode, 'none'>,
): [number, number, number, number] {
  const [r, g, b, a] = rgba
  const linear: Vec3 = [toLinear(r), toLinear(g), toLinear(b)]
  const lms = multiply3(RGB_TO_LMS, linear)
  const simulatedLms = multiply3(SIMULATION_MATRICES[mode], lms)
  const simulatedLinear = multiply3(LMS_TO_RGB, simulatedLms)
  return [toSrgb(simulatedLinear[0]), toSrgb(simulatedLinear[1]), toSrgb(simulatedLinear[2]), a]
}

// One correction pass, as in the standard algorithm. Repeating the pass
// separates confusable colors further, but only by driving them toward the
// gamut corners — pure red ends up near-white and pure green near-black —
// which defeats the point of exporting a usable asset. Separation is a means
// here, not the objective.
//
// Note the two steps deliberately run in different spaces. Simulation models
// cone physiology, so it runs on linear light. Redistribution is a display-
// space heuristic — the 0.7 weights come from reference code that operated
// on gamma-encoded sRGB throughout, so that is where they behave as tuned.
// Applying them to linear values instead roughly quadruples how far colors
// drift from the original (measured in cvdVerification.test.ts).
export function daltonizeColor(
  rgba: [number, number, number, number],
  mode: CvdMode,
): [number, number, number, number] {
  if (mode === 'none') return rgba

  const [r, g, b] = rgba
  const [simR, simG, simB] = simulateDeficiency(rgba, mode)

  const error: Vec3 = [r - simR, g - simG, b - simB]
  const correction = multiply3(ERROR_REDISTRIBUTION[mode], error)

  return [
    clamp01(r + correction[0]),
    clamp01(g + correction[1]),
    clamp01(b + correction[2]),
    rgba[3],
  ]
}

// Walks a Lottie JSON document's `slots` (the same shape ensureSlots()
// guarantees every color has) and replaces each slot's color with its
// Daltonized equivalent. Returns the input unchanged for 'none' mode.
export function daltonizeLottieJson(json: string, mode: CvdMode): string {
  if (mode === 'none') return json

  const data = JSON.parse(json) as Record<string, unknown>
  const slots = data.slots
  if (typeof slots !== 'object' || slots === null) return json

  for (const slot of Object.values(slots as Record<string, unknown>)) {
    if (typeof slot !== 'object' || slot === null) continue

    const property = (slot as Record<string, unknown>).p
    if (typeof property !== 'object' || property === null) continue

    const value = (property as Record<string, unknown>).k
    if (Array.isArray(value) && value.length === 4) {
      ;(property as Record<string, unknown>).k = daltonizeColor(
        value as [number, number, number, number],
        mode,
      )
    }
  }

  return JSON.stringify(data)
}
