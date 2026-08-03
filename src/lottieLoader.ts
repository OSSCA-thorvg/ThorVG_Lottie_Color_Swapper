import JSZip from 'jszip'

export type LottieData = Record<string, unknown>

type DotLottieVersion = '1' | '2'

type AnimationMetadata = {
  id: string
}

type DotLottieManifest = {
  version: string
  animations: AnimationMetadata[]
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
  const manifest = parseManifest(JSON.parse(manifestText))
  const version = getDotLottieVersion(manifest.version)
  const selectedId = selectAnimationId(manifest, version)
  const animationPath = getAnimationPath(selectedId, version)
  const animationEntry = zip.file(animationPath)

  if (!animationEntry) {
    throw new Error(`Animation file not found: ${animationPath}`)
  }

  const text = await animationEntry.async('string')
  const data = JSON.parse(text)

  if (!isLottieJson(data)) {
    throw new Error('.lottie animation is not a valid Lottie JSON')
  }

  return text
}

function parseManifest(data: unknown): DotLottieManifest {
  if (typeof data !== 'object' || data === null) {
    throw new Error('manifest.json is not a valid object')
  }

  const manifest = data as Record<string, unknown>
  if (typeof manifest.version !== 'string') {
    throw new Error('manifest.json does not specify a version')
  }

  if (!Array.isArray(manifest.animations) || manifest.animations.length === 0) {
    throw new Error('manifest.json does not list any animations')
  }

  const animations = manifest.animations.map((animation) => {
    if (
      typeof animation !== 'object' ||
      animation === null ||
      typeof (animation as Record<string, unknown>).id !== 'string' ||
      (animation as Record<string, unknown>).id === ''
    ) {
      throw new Error('manifest.json contains an invalid animation')
    }

    return { id: (animation as Record<string, string>).id }
  })

  const activeAnimationId = manifest.activeAnimationId
  if (activeAnimationId !== undefined && typeof activeAnimationId !== 'string') {
    throw new Error('manifest.json contains an invalid activeAnimationId')
  }

  const initial = manifest.initial
  if (initial !== undefined && (typeof initial !== 'object' || initial === null)) {
    throw new Error('manifest.json contains an invalid initial object')
  }

  const initialAnimation = (initial as Record<string, unknown> | undefined)?.animation
  if (initialAnimation !== undefined && typeof initialAnimation !== 'string') {
    throw new Error('manifest.json contains an invalid initial animation')
  }

  return {
    version: manifest.version,
    animations,
    ...(activeAnimationId === undefined ? {} : { activeAnimationId }),
    ...(initialAnimation === undefined ? {} : { initial: { animation: initialAnimation } }),
  }
}

function getDotLottieVersion(version: string): DotLottieVersion {
  if (version === '1' || version === '1.0') return '1'
  if (version === '2' || version === '2.0') return '2'

  throw new Error(`Unsupported dotLottie version: ${version}`)
}

function selectAnimationId(manifest: DotLottieManifest, version: DotLottieVersion): string {
  const requestedId = version === '1' ? manifest.activeAnimationId : manifest.initial?.animation
  const selectedId = requestedId ?? manifest.animations[0].id

  if (!manifest.animations.some((animation) => animation.id === selectedId)) {
    throw new Error(`Animation is not listed in manifest.json: ${selectedId}`)
  }

  return selectedId
}

function getAnimationPath(id: string, version: DotLottieVersion): string {
  return `${version === '1' ? 'animations' : 'a'}/${id}.json`
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
