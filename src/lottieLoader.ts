import JSZip from 'jszip'

export type LottieData = Record<string, unknown>

export async function loadLottie(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase()

  if (ext === 'json') {
    return loadJsonFile(file)
  }

  if (ext === 'lottie') {
    return loadLottieFile(file)
  }

  throw new Error(`Unsupported file extension: .${ext}`)
}

async function loadJsonFile(file: File): Promise<string> {
  const text = await file.text()
  const data = JSON.parse(text)

  if (!isLottieJson(data)) {
    throw new Error('File is not a valid Lottie JSON')
  }

  return text
}

async function loadLottieFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const zip = await JSZip.loadAsync(buffer)

  const manifestEntry = zip.file('manifest.json')
  if (!manifestEntry) {
    throw new Error('.lottie file does not contain manifest.json')
  }

  const manifestText = await manifestEntry.async('string')
  const manifest = JSON.parse(manifestText)

  if (!Array.isArray(manifest.animations) || manifest.animations.length === 0) {
    throw new Error('manifest.json does not list any animations')
  }

  const selectedId: string = manifest.initial?.animation ?? manifest.animations[0].id
  if (!selectedId) {
    throw new Error('No animation specified in manifest')
  }

  const animPath = `a/${selectedId}.json`
  const animEntry = zip.file(animPath)
  if (!animEntry) {
    throw new Error(`Animation file not found: ${animPath}`)
  }

  const text = await animEntry.async('string')
  const data = JSON.parse(text)

  if (!isLottieJson(data)) {
    throw new Error('.lottie animation is not a valid Lottie JSON')
  }

  return text
}

export function isLottieJson(data: unknown): data is LottieData {
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
