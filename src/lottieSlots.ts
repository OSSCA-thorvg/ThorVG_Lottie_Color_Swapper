// Checks whether a Lottie JSON already defines a top-level "slots" dictionary.
// Slots are a Lottie-JSON-level feature (not a dotLottie container feature), so
// this check applies the same way regardless of whether the source was a plain
// .json file or one extracted from a .lottie archive.
export function hasSlots(jsonText: string): boolean {
  const data: unknown = JSON.parse(jsonText)
  if (typeof data !== 'object' || data === null) return false

  const slots = (data as Record<string, unknown>).slots
  return typeof slots === 'object' && slots !== null
}

export interface ColorSlot {
  sid: string
  name: string
  color: string
}

// Walks every layer (including precomps under `assets`), finds static fill/stroke
// colors, and makes sure each one is reachable through a slot: existing `sid`s are
// reused as-is, colors without one get an auto-generated `sid` wired into both the
// shape and a new `slots` entry. Returns the (possibly mutated) JSON text ready for
// `renderLottie`, plus the flat list of colors for the hierarchy panel.
export function ensureSlots(jsonText: string): { json: string; colors: ColorSlot[] } {
  const data = JSON.parse(jsonText) as Record<string, unknown>

  if (typeof data.slots !== 'object' || data.slots === null) {
    data.slots = {}
  }
  const slots = data.slots as Record<string, unknown>

  const colors: ColorSlot[] = []
  let autoIndex = 0

  function walkShapes(shapes: unknown, layerName: string) {
    if (!Array.isArray(shapes)) return

    for (const shape of shapes) {
      if (typeof shape !== 'object' || shape === null) continue
      const s = shape as Record<string, unknown>

      if (s.ty === 'fl' || s.ty === 'st') {
        const c = s.c as Record<string, unknown> | undefined
        if (c && c.a === 0 && Array.isArray(c.k)) {
          let sid = c.sid as string | undefined
          let rgba = c.k as number[]

          const existingSlot = sid ? (slots[sid] as Record<string, unknown> | undefined) : undefined
          if (sid !== undefined && existingSlot && typeof existingSlot === 'object') {
            const p = existingSlot.p as Record<string, unknown> | undefined
            if (p && Array.isArray(p.k)) rgba = p.k as number[]
          } else {
            sid = `auto_color_${++autoIndex}`
            c.sid = sid
            slots[sid] = { p: { a: 0, k: rgba } }
          }

          colors.push({
            sid,
            name: `${layerName} / ${typeof s.nm === 'string' ? s.nm : s.ty}`,
            color: rgbaToHex(rgba),
          })
        }
      }

      if (s.ty === 'gr' && Array.isArray(s.it)) {
        walkShapes(s.it, layerName)
      }
    }
  }

  function walkLayers(layers: unknown) {
    if (!Array.isArray(layers)) return

    for (const layer of layers) {
      if (typeof layer !== 'object' || layer === null) continue
      const l = layer as Record<string, unknown>
      walkShapes(l.shapes, typeof l.nm === 'string' ? l.nm : 'Layer')
    }
  }

  walkLayers(data.layers)

  if (Array.isArray(data.assets)) {
    for (const asset of data.assets) {
      if (typeof asset === 'object' && asset !== null) {
        walkLayers((asset as Record<string, unknown>).layers)
      }
    }
  }

  return { json: JSON.stringify(data), colors }
}

function rgbaToHex([r, g, b]: number[]): string {
  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}
