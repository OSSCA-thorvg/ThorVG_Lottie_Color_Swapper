// Wires up the upload button and window-wide drag & drop, and hands the
// picked/dropped File to `onFile`. Validating/parsing the file is `lottieLoader.ts`'s job.
export function initFileUpload(onFile: (file: File) => void) {
  const uploadInput = document.querySelector<HTMLInputElement>('#lottie-upload')!

  uploadInput.addEventListener('change', () => {
    const file = uploadInput.files?.[0]
    if (!file) return

    onFile(file)
  })

  const dropOverlay = document.querySelector<HTMLDivElement>('#drop-overlay')!
  // dragenter/dragleave fire repeatedly as the cursor crosses child elements,
  // so a counter (rather than a boolean) is needed to know when we've truly left the window.
  let dragCounter = 0

  window.addEventListener('dragenter', (e) => {
    if (!e.dataTransfer?.types.includes('Files')) return

    dragCounter++
    dropOverlay.classList.add('visible')
  })

  window.addEventListener('dragover', (e) => {
    // Without this, the browser's default action is to navigate to the dropped file.
    e.preventDefault()
  })

  window.addEventListener('dragleave', () => {
    dragCounter--
    if (dragCounter <= 0) {
      dragCounter = 0
      dropOverlay.classList.remove('visible')
    }
  })

  window.addEventListener('drop', (e) => {
    e.preventDefault()
    dragCounter = 0
    dropOverlay.classList.remove('visible')

    const file = e.dataTransfer?.files?.[0]
    if (!file) return

    onFile(file)
  })
}
