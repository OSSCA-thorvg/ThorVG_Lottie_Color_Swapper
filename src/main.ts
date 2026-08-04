import './renderer.ts'
import { initFileUpload } from './fileUpload.ts'
import { loadLottie } from './lottieLoader.ts'
import { ensureSlots } from './lottieSlots.ts'
import { renderColorTree } from './colorTree.ts'
import { clearHighlight, highlightSid, renderLottie, setSlotColor } from './renderer.ts'
import { initPlaybackControls, resetPlaybackUI } from './playbackControls.ts'
import { setExportDocument, updateExportColor, downloadExport } from './lottieExport.ts'
import { hexToRgba } from './colorUtils.ts'

const exportBtn = document.querySelector<HTMLButtonElement>('#export-btn')!
let currentJson: string | null = null
let selectedSid: string | null = null

initFileUpload(handleFile)
initPlaybackControls()
exportBtn.addEventListener('click', downloadExport)

async function handleFile(file: File) {
  try {
    const raw = await loadLottie(file)
    const { json, tree } = ensureSlots(raw)
    currentJson = json
    selectedSid = null
    renderColorTree(tree, handleColorChange, handleColorSelect)
    renderLottie(json)
    clearHighlight()
    resetPlaybackUI()
    setExportDocument(json, file.name)
    exportBtn.disabled = false
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load Lottie file'
    alert(message)
  }
}

// A color-tree edit needs to land in two places: the live ThorVG preview
// (renderer.ts) and the JSON document held for export (lottieExport.ts) —
// neither module talks to the other, so main.ts fans the edit out to both.
function handleColorChange(sid: string, hex: string) {
  setSlotColor(sid, hex)
  updateExportColor(sid, hex)
  if (currentJson) {
    const data = JSON.parse(currentJson) as Record<string, unknown>
    const slots = data.slots as Record<string, unknown> | undefined
    const slot = slots?.[sid] as Record<string, unknown> | undefined
    const property = slot?.p as Record<string, unknown> | undefined
    if (property) property.k = hexToRgba(hex)
    currentJson = JSON.stringify(data)
    if (selectedSid) highlightSid(currentJson, selectedSid)
  }
}

function handleColorSelect(sid: string | null) {
  selectedSid = sid
  if (!sid || !currentJson) {
    clearHighlight()
    return
  }
  highlightSid(currentJson, sid)
}
