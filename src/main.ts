import './renderer.ts'
import { initFileUpload } from './fileUpload.ts'
import { loadLottie } from './lottieLoader.ts'
import { renderLottie } from './renderer.ts'

initFileUpload(handleFile)

async function handleFile(file: File) {
  try {
    const data = await loadLottie(file)
    renderLottie(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load Lottie file'
    alert(message)
  }
}
