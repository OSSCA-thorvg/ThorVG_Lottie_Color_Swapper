import './renderer.ts'

const uploadInput = document.querySelector<HTMLInputElement>('#lottie-upload')!

uploadInput.addEventListener('change', async () => {
  const file = uploadInput.files?.[0]
  if (!file) return

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

  handleLottieData(data)
})

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

// TODO: hand off to the parser here once it's ready
function handleLottieData(data: unknown) {
  console.log(data)
}
