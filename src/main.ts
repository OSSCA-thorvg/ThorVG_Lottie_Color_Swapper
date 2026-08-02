import './renderer.ts'
import { loadLottie } from './lottieLoader.ts'
import { renderLottie } from './renderer.ts'

const uploadInput = document.querySelector<HTMLInputElement>('#lottie-upload')!

uploadInput.addEventListener('change', async () => {
  const file = uploadInput.files?.[0]
  if (!file) return

  try {
    const data = await loadLottie(file)
    renderLottie(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load Lottie file'
    alert(message)
    uploadInput.value = ''
  }
})
