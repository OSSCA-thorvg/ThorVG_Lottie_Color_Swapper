// Wires up the upload button and window-wide drag & drop, validates that the
// dropped/selected file is Lottie JSON, and hands the parsed data to `onLottieData`.
export function initFileUpload(onLottieData: (data: unknown) => void) {
  const uploadInput = document.querySelector<HTMLInputElement>('#lottie-upload')!

  uploadInput.addEventListener('change', () => {
    const file = uploadInput.files?.[0]
    if (!file) return

    processFile(file)
  })

  async function processFile(file: File) {
    const text = await file.text()

    let data: unknown
    try {
      data = JSON.parse(text)
    } catch {
      alert('올바른 JSON 파일이 아닙니다.')
      uploadInput.value = ''
      return
    }

    if (!isLottieJson(data)) {
      alert('Lottie 형식의 파일이 아닙니다.')
      uploadInput.value = ''
      return
    }

    onLottieData(data)
  }

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

    processFile(file)
  })
}

// Shallow signature check for the top-level fields every bodymovin/Lottie JSON has.
// Deeper validation of layer internals is left to the parser.
function isLottieJson(data: unknown): boolean {
  if (typeof data !== 'object' || data === null) return false

  const obj = data as Record<string, unknown>

  return (
    typeof obj.v === 'string' &&
    typeof obj.fr === 'number' &&
    typeof obj.ip === 'number' &&
    typeof obj.op === 'number' &&
    typeof obj.w === 'number' &&
    typeof obj.h === 'number' &&
    Array.isArray(obj.layers)
  )
}
