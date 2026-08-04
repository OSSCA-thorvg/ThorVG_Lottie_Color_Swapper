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
  downloadExport,
  setExportDocument,
  updateExportColor,
  updateExportDocument,
} from './lottieExport.ts'
import { hexToRgba } from './colorUtils.ts'
import { createColorHistory } from './colorHistory.ts'

const exportBtn = document.querySelector<HTMLButtonElement>('#export-btn')!
const initializeColorsBtn = document.querySelector<HTMLButtonElement>('#initialize-colors-btn')!
const undoBtn = document.querySelector<HTMLButtonElement>('#undo-btn')!
const notification = document.querySelector<HTMLDivElement>('#notification')!
let currentJson: string | null = null
let baselineJson: string | null = null
let selectedSid: string | null = null
const colorHistory = createColorHistory()
let notificationTimer: ReturnType<typeof setTimeout> | null = null

initFileUpload(handleFile)
initPlaybackControls()
exportBtn.addEventListener('click', downloadExport)
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
    selectedSid = null
    renderColorTree(tree, handleColorChange, handleColorSelect)
    renderLottie(json)
    clearHighlight()
    resetPlaybackUI()
    setExportDocument(json, file.name)
    updateActionButtons()
    exportBtn.disabled = false
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load Lottie file'
    alert(message)
  }
}

function handleColorChange(sid: string, hex: string) {
  if (!currentJson) return

  const data = JSON.parse(currentJson) as Record<string, unknown>
  const slots = data.slots as Record<string, unknown> | undefined
  const slot = slots?.[sid] as Record<string, unknown> | undefined
  const property = slot?.p as Record<string, unknown> | undefined
  if (!property) return

  colorHistory.record(currentJson)
  updateActionButtons()
  showNotification('색상을 변경했습니다.')

  property.k = hexToRgba(hex)
  currentJson = JSON.stringify(data)
  setSlotColor(sid, hex)
  updateExportColor(sid, hex)
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
  refreshColorState()
  showNotification('최근 색상 변경만 실행 취소했습니다.')
}

function handleUndoShortcut(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
    event.preventDefault()
    undoColorChange()
  }
}

function refreshColorState() {
  if (!currentJson) return

  const { tree } = ensureSlots(currentJson)
  renderColorTree(tree, handleColorChange, handleColorSelect, selectedSid)
  applySlotColors(currentJson)
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
