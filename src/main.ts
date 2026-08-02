import './renderer.ts'
import { initFileUpload } from './fileUpload.ts'
import { loadLottie } from './lottieLoader.ts'
import { ensureSlots } from './lottieSlots.ts'
import { renderColorTree } from './colorTree.ts'
import { renderLottie } from './renderer.ts'

initFileUpload(handleFile)

async function handleFile(file: File) {
  try {
    const raw = await loadLottie(file)
    const { json, tree } = ensureSlots(raw)
    renderColorTree(tree)
    renderLottie(json)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load Lottie file'
    alert(message)
  }
}
