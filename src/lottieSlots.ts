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

// A layer/group has `children` and no `sid`/`color`. A color leaf has `sid`+`color`
// and empty `children`. Branches with no color anywhere underneath are pruned.
export interface TreeNode {
  name: string
  sid?: string
  color?: string
  children: TreeNode[]
}

// Walks the real layer/group hierarchy (resolving precomp `refId` references from
// `assets` inline), finds static fill/stroke colors, and makes sure each one is
// reachable through a slot: existing `sid`s are reused as-is, colors without one get
// an auto-generated `sid` wired into both the shape and a new `slots` entry. Returns
// the (possibly mutated) JSON text ready for `renderLottie`, plus a color hierarchy
// tree for the panel.
export function ensureSlots(jsonText: string): { json: string; tree: TreeNode[] } {
  const data = JSON.parse(jsonText) as Record<string, unknown>

  if (typeof data.slots !== 'object' || data.slots === null) {
    data.slots = {}
  }
  const slots = data.slots as Record<string, unknown>

  const assetsById = new Map<string, Record<string, unknown>>()
  if (Array.isArray(data.assets)) {
    for (const asset of data.assets) {
      if (typeof asset === 'object' && asset !== null) {
        const a = asset as Record<string, unknown>
        if (typeof a.id === 'string') assetsById.set(a.id, a)
      }
    }
  }

  let autoIndex = 0

  function toColorLeaf(s: Record<string, unknown>): TreeNode | null {
    const c = s.c as Record<string, unknown> | undefined
    if (!c || c.a !== 0 || !Array.isArray(c.k)) return null

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

    return {
      name: typeof s.nm === 'string' ? s.nm : (s.ty as string),
      sid,
      color: rgbaToHex(rgba),
      children: [],
    }
  }

  function walkShapes(shapes: unknown): TreeNode[] {
    if (!Array.isArray(shapes)) return []
    const nodes: TreeNode[] = []

    for (const shape of shapes) {
      if (typeof shape !== 'object' || shape === null) continue
      const s = shape as Record<string, unknown>

      if (s.ty === 'fl' || s.ty === 'st') {
        const leaf = toColorLeaf(s)
        if (leaf) nodes.push(leaf)
      } else if (s.ty === 'gr' && Array.isArray(s.it)) {
        const children = walkShapes(s.it)
        if (children.length > 0) {
          nodes.push({ name: typeof s.nm === 'string' ? s.nm : 'Group', children })
        }
      }
    }

    return nodes
  }

  // A precomp asset referenced by multiple layers (refId) has its colors defined
  // once in `assets` and shared by every instance — there's no per-instance color
  // override in the Lottie spec. So only the first occurrence is walked/shown;
  // repeats would just be the same editable color drawn as separate branches.
  const seenAssetIds = new Set<string>()

  function walkLayers(layers: unknown): TreeNode[] {
    if (!Array.isArray(layers)) return []
    const nodes: TreeNode[] = []

    for (const layer of layers) {
      if (typeof layer !== 'object' || layer === null) continue
      const l = layer as Record<string, unknown>
      const name = typeof l.nm === 'string' ? l.nm : 'Layer'

      let children: TreeNode[]
      if (l.ty === 0 && typeof l.refId === 'string') {
        if (seenAssetIds.has(l.refId)) continue
        seenAssetIds.add(l.refId)
        // A precomp-reference layer (ty:0) has no shapes of its own — its content
        // lives in `assets[refId].layers`, so recurse into that instead.
        children = walkLayers(assetsById.get(l.refId)?.layers)
      } else {
        children = walkShapes(l.shapes)
      }

      if (children.length > 0) {
        nodes.push({ name, children })
      }
    }

    return nodes
  }

  // Chains where every level has exactly one child carry no distinguishing
  // information ("Shape Layer 1" -> "Shape 1" -> color, with no branch in between)
  // so they're absorbed into the outermost name, stopping at the first real
  // branch (2+ children) or a leaf. Leaves themselves are never touched.
  function collapseChain(node: TreeNode): TreeNode {
    if (node.children.length === 0) return node

    let children = node.children.map(collapseChain)
    while (children.length === 1 && children[0].children.length > 0) {
      children = children[0].children
    }

    return { name: node.name, children }
  }

  const tree = walkLayers(data.layers).map(collapseChain)

  return { json: JSON.stringify(data), tree }
}

function rgbaToHex([r, g, b]: number[]): string {
  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}
