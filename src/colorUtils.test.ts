import { describe, expect, it } from 'vitest'
import { hexToRgba, rgbaToHex } from './colorUtils.ts'

describe('rgbaToHex', () => {
  it('pads single-digit channels so the result is always 7 characters', () => {
    expect(rgbaToHex([0, 0, 0, 1])).toBe('#000000')
    expect(rgbaToHex([1 / 255, 1, 0, 1])).toBe('#01ff00')
  })

  it('round-trips a color picked from the swatch input', () => {
    for (const hex of ['#000000', '#ffffff', '#aa3bff', '#01ff00']) {
      expect(rgbaToHex(hexToRgba(hex))).toBe(hex)
    }
  })

  it('clamps out-of-gamut values, which daltonizeColor can produce', () => {
    expect(rgbaToHex([-0.5, 1.5, 0.5, 1])).toBe('#00ff80')
  })
})
