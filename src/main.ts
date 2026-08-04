import './renderer.ts'
import { initFileUpload } from './fileUpload.ts'
import { loadLottie } from './lottieLoader.ts'
import { ensureSlots } from './lottieSlots.ts'
import { renderColorTree } from './colorTree.ts'
import { renderLottie, setSlotColor } from './renderer.ts'
import { initPlaybackControls, resetPlaybackUI } from './playbackControls.ts'
import { setExportDocument, updateExportColor, downloadExport } from './lottieExport.ts'

const exportBtn = document.querySelector<HTMLButtonElement>('#export-btn')!

initFileUpload(handleFile)
initPlaybackControls()
exportBtn.addEventListener('click', downloadExport)

async function handleFile(file: File) {
  try {
    const raw = await loadLottie(file)
    const { json, tree } = ensureSlots(raw)
    renderColorTree(tree, handleColorChange)
    renderLottie(json)
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
}
