import './renderer.ts'
import { initFileUpload } from './fileUpload.ts'
import { loadLottie } from './lottieLoader.ts'
import { ensureSlots } from './lottieSlots.ts'
import { renderColorTree } from './colorTree.ts'
import {
  applySlotColors,
  clearHighlight,
  highlightSid,
  renderLottie,
  setSlotColor,
} from './renderer.ts'
import { initPlaybackControls, resetPlaybackUI } from './playbackControls.ts'
import {
  downloadAccessibleExport,
  downloadExport,
  setExportDocument,
  updateExportColor,
  updateExportDocument,
} from './lottieExport.ts'
import { hexToRgba, rgbaToHex } from './colorUtils.ts'
import { createColorHistory } from './colorHistory.ts'
import { initCvdControls } from './cvdControls.ts'
import { daltonizeColor, daltonizeLottieJson, type CvdMode } from './cvdCorrection.ts'

const exportBtn = document.querySelector<HTMLButtonElement>('#export-btn')!
const initializeColorsBtn = document.querySelector<HTMLButtonElement>('#initialize-colors-btn')!
const undoBtn = document.querySelector<HTMLButtonElement>('#undo-btn')!
const notification = document.querySelector<HTMLDivElement>('#notification')!
const cvdSelect = document.querySelector<HTMLSelectElement>('#cvd-select')!
let currentJson: string | null = null
let baselineJson: string | null = null
let selectedSid: string | null = null
let pendingColorEdit: { sid: string; snapshot: string } | null = null
let cvdMode: CvdMode = 'none'
const colorHistory = createColorHistory()
let notificationTimer: ReturnType<typeof setTimeout> | null = null

initFileUpload(handleFile)
initPlaybackControls()
initCvdControls(handleCvdModeChange)
exportBtn.addEventListener('click', handleExport)
initializeColorsBtn.addEventListener('click', initializeColors)
undoBtn.addEventListener('click', undoColorChange)
window.addEventListener('keydown', handleUndoShortcut)

async function handleFile(file: File) {
  try {
    const raw = await loadLottie(file)
    const { json, tree } = ensureSlots(raw)
    currentJson = json
    baselineJson = json
    colorHistory.clear()
    pendingColorEdit = null
    selectedSid = null
    cvdMode = 'none'
    cvdSelect.value = 'none'
    renderColorTree(tree, handleColorPreview, handleColorChange, handleColorSelect)
    renderLottie(json)
    clearHighlight()
    resetPlaybackUI()
    setExportDocument(json, file.name)
    updateActionButtons()
    exportBtn.disabled = false
    cvdSelect.disabled = false
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load Lottie file'
    alert(message)
  }
}

function updateColor(sid: string, hex: string): boolean {
  if (!currentJson) return false

  const data = JSON.parse(currentJson) as Record<string, unknown>
  const slots = data.slots as Record<string, unknown> | undefined
  const slot = slots?.[sid] as Record<string, unknown> | undefined
  const property = slot?.p as Record<string, unknown> | undefined
  if (!property) return false

  property.k = hexToRgba(hex)
  currentJson = JSON.stringify(data)
  setSlotColor(sid, canvasHex(hex))
  updateExportColor(sid, hex)
  return true
}

// While a CVD mode is on, the canvas shows the corrected color — but only the
// canvas. currentJson, the export document and the undo history all keep the
// color the user actually picked. Live preview goes straight to the renderer
// without passing through refreshColorState(), so the correction has to be
// applied here too or the canvas would jump on mouse-up.
function canvasHex(hex: string): string {
  if (cvdMode === 'none') return hex
  return rgbaToHex(daltonizeColor(hexToRgba(hex), cvdMode))
}

function handleColorPreview(sid: string, hex: string) {
  if (!currentJson) return
  if (!pendingColorEdit || pendingColorEdit.sid !== sid) {
    pendingColorEdit = { sid, snapshot: currentJson }
  }
  updateColor(sid, hex)
}

function handleColorChange(sid: string, hex: string) {
  if (!currentJson) return

  const snapshot = pendingColorEdit?.sid === sid ? pendingColorEdit.snapshot : currentJson
  pendingColorEdit = null
  if (!updateColor(sid, hex)) return

  colorHistory.record(snapshot)
  showNotification('색상을 변경했습니다.')
  refreshColorState()
}

function handleColorSelect(sid: string | null) {
  selectedSid = sid
  if (!sid || !currentJson) {
    clearHighlight()
    return
  }
  highlightSid(currentJson, sid)
}

function initializeColors() {
  if (!baselineJson) {
    showNotification('색상을 초기화하려면 먼저 Lottie 파일을 업로드하세요.')
    return
  }

  currentJson = baselineJson
  colorHistory.clear()
  pendingColorEdit = null
  refreshColorState()
  showNotification('색상을 업로드 당시 원래 색상으로 초기화했습니다.')
}

function undoColorChange() {
  const previousJson = colorHistory.undo()
  if (!previousJson) {
    showNotification('실행 취소할 색상 변경이 없습니다.')
    return
  }

  currentJson = previousJson
  pendingColorEdit = null
  refreshColorState()
  showNotification('최근 색상 변경만 실행 취소했습니다.')
}

function handleUndoShortcut(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
    event.preventDefault()
    undoColorChange()
  }
}

function handleCvdModeChange(mode: CvdMode) {
  cvdMode = mode
  refreshColorState()
}

// One export button for both versions: it saves whatever the canvas is
// currently showing, which the correction dropdown already decides. The
// filename carries the mode, so the two versions never overwrite each other.
function handleExport() {
  if (cvdMode === 'none') {
    downloadExport()
    showNotification('원본 색상 그대로 내보냈습니다.')
    return
  }

  if (!currentJson) return
  downloadAccessibleExport(daltonizeLottieJson(currentJson, cvdMode), cvdMode)
  // Label comes from the <option> so it can't drift out of sync with the UI.
  showNotification(`${cvdSelect.selectedOptions[0]?.textContent ?? ''} 버전을 내보냈습니다.`)
}

function refreshColorState() {
  if (!currentJson) return

  const { tree } = ensureSlots(currentJson)
  renderColorTree(tree, handleColorPreview, handleColorChange, handleColorSelect, selectedSid)
  applySlotColors(cvdMode === 'none' ? currentJson : daltonizeLottieJson(currentJson, cvdMode))
  updateExportDocument(currentJson)
  if (selectedSid) highlightSid(currentJson, selectedSid)
  else clearHighlight()
  updateActionButtons()
}

function updateActionButtons() {
  initializeColorsBtn.disabled = !baselineJson
  undoBtn.disabled = !colorHistory.canUndo()
}

function showNotification(message: string) {
  notification.textContent = message
  notification.classList.add('visible')
  if (notificationTimer) clearTimeout(notificationTimer)
  notificationTimer = setTimeout(() => {
    notification.classList.remove('visible')
  }, 3000)
}
