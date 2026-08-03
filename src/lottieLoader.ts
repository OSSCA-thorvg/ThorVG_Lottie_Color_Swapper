import JSZip from 'jszip'

export type LottieData = Record<string, unknown>

type AnimationEntry = {
  id: string
}

type DotLottieManifest = {
  version: string
  animations: AnimationEntry[]
  activeAnimationId?: string
  initial?: {
    animation?: string
  }
}

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

  if (!isDotLottieManifest(manifest)) {
    throw new Error('manifest.json is not a valid dotLottie manifest')
  }

  const firstAnimation = manifest.animations[0]
  const selectedId = manifest.version === '1'
    ? manifest.activeAnimationId
    : manifest.initial?.animation
  const selectedAnimation = manifest.animations.find(({ id }) => id === selectedId) ?? firstAnimation
  const animationDirectory = manifest.version === '1' ? 'animations' : 'a'
  const animPath = `${animationDirectory}/${selectedAnimation.id}.json`
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

function isDotLottieManifest(data: unknown): data is DotLottieManifest {
  if (typeof data !== 'object' || data === null) return false

  const obj = data as Record<string, unknown>
  if (obj.version !== '1' && obj.version !== '2') {
    throw new Error(`Unsupported dotLottie version: ${String(obj.version)}`)
  }

  if (!Array.isArray(obj.animations) || obj.animations.length === 0) return false

  return obj.animations.every((animation) => {
    if (typeof animation !== 'object' || animation === null) return false
    return typeof (animation as Record<string, unknown>).id === 'string'
  })
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
