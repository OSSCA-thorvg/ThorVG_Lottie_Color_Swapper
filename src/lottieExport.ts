import { hexToRgba } from './colorUtils.ts'

// Holds the Lottie JSON document separately from the ThorVG animation instance.
// setSlotColor() in renderer.ts only pushes color edits into the live ThorVG
// animation (via gen/apply) — it never touches the original JSON text, so this
// module keeps its own copy in sync so there's something to serialize on export.
let currentDoc: Record<string, unknown> | null = null
let currentFileName = 'lottie-export.json'

export function setExportDocument(json: string, sourceFileName: string) {
  currentDoc = JSON.parse(json) as Record<string, unknown>
  currentFileName = toExportFileName(sourceFileName)
}

// Mirrors a color-tree edit into the stored document's `slots[sid].p.k`, the
// same field ensureSlots() reads when building the color tree.
export function updateExportDocument(json: string) {
  currentDoc = JSON.parse(json) as Record<string, unknown>
}

export function updateExportColor(sid: string, hex: string) {
  if (!currentDoc) return

  const slots = currentDoc.slots as Record<string, unknown> | undefined
  const slot = slots?.[sid] as Record<string, unknown> | undefined
  const p = slot?.p as Record<string, unknown> | undefined
  if (!p) return

  p.k = hexToRgba(hex)
}

function saveJsonFile(jsonText: string, fileName: string) {
  const blob = new Blob([jsonText], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()

  URL.revokeObjectURL(url)
}

export function downloadExport() {
  if (!currentDoc) return
  saveJsonFile(JSON.stringify(currentDoc), currentFileName)
}

// Shares this module's file-naming/download plumbing for the CVD-corrected
// accessibility export; the color correction itself lives in cvdCorrection.ts.
export function downloadAccessibleExport(json: string, mode: string) {
  saveJsonFile(json, currentFileName.replace(/\.json$/i, `-${mode}.json`))
}

// .lottie sources are exported as plain .json — this tool only edits colors in
// the extracted Lottie JSON, it doesn't repackage a .lottie archive.
function toExportFileName(sourceFileName: string): string {
  const base = sourceFileName.replace(/\.(json|lottie)$/i, '')
  return `${base}.json`
}
