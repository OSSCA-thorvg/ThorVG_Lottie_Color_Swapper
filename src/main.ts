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
import { initI18n, onLangChange, t } from './i18n.ts'
import { initLangControls } from './langControls.ts'

// Before anything else: the modules below read text out of the DOM, and the
// DOM has no text until the dictionary is applied.
initI18n()

const exportBtn = document.querySelector<HTMLButtonElement>('#export-btn')!
const initializeColorsBtn = document.querySelector<HTMLButtonElement>('#initialize-colors-btn')!
const undoBtn = document.querySelector<HTMLButtonElement>('#undo-btn')!
const notification = document.querySelector<HTMLDivElement>('#notification')!
const hierarchyTree = document.querySelector<HTMLDivElement>('#hierarchy-tree')!
const canvasFrame = document.querySelector<HTMLDivElement>('#canvas-frame')!
const cvdSelect = document.querySelector<HTMLSelectElement>('#cvd-select')!
let clearTreeSelection = () => {}

hierarchyTree.addEventListener('click', handleHierarchyTreeClick)
canvasFrame.addEventListener('click', clearSelection)
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
initLangControls()
// A notification is a sentence in the old language once the toggle flips, and
// there's no way to re-render it (the parameterized ones are already
// interpolated), so it's dismissed instead.
onLangChange(hideNotification)
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
    clearTreeSelection = renderColorTree(tree, handleColorPreview, handleColorChange, handleColorSelect)
    renderLottie(json)
    clearHighlight()
    resetPlaybackUI()
    setExportDocument(json, file.name)
    updateActionButtons()
    exportBtn.disabled = false
    cvdSelect.disabled = false
  } catch (err) {
    const message = err instanceof Error ? err.message : t('error.loadFailed')
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
  showNotification(t('notify.colorChanged'))
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

function clearSelection() {
  clearTreeSelection()
  handleColorSelect(null)
}

function handleHierarchyTreeClick(event: MouseEvent) {
  const target = event.target
  if (!(target instanceof Element)) return
  if (target.closest('.color-row, .tree-row')) return
  clearSelection()
}

function initializeColors() {
  if (!baselineJson) {
    showNotification(t('notify.uploadFirst'))
    return
  }

  currentJson = baselineJson
  colorHistory.clear()
  pendingColorEdit = null
  refreshColorState()
  showNotification(t('notify.reset'))
}

function undoColorChange() {
  const previousJson = colorHistory.undo()
  if (!previousJson) {
    showNotification(t('notify.nothingToUndo'))
    return
  }

  currentJson = previousJson
  pendingColorEdit = null
  refreshColorState()
  showNotification(t('notify.undone'))
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
    showNotification(t('notify.exportedOriginal'))
    return
  }

  if (!currentJson) return
  downloadAccessibleExport(daltonizeLottieJson(currentJson, cvdMode), cvdMode)
  // Label comes from the <option> so it can't drift out of sync with the UI.
  showNotification(t('notify.exportedCvd', { mode: cvdSelect.selectedOptions[0]?.textContent ?? '' }))
}

function refreshColorState() {
  if (!currentJson) return

  const { tree } = ensureSlots(currentJson)
  clearTreeSelection = renderColorTree(tree, handleColorPreview, handleColorChange, handleColorSelect, selectedSid)
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
  notificationTimer = setTimeout(hideNotification, 3000)
}

function hideNotification() {
  notification.classList.remove('visible')
}
