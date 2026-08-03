import ThorVG, { type LottieAnimation } from '@thorvg/webcanvas'

const CANVAS_SIZE = { width: 800, height: 800 }

export const TVG = await ThorVG.init({ renderer: 'gl' })

export const canvas = new TVG.Canvas('#canvas', CANVAS_SIZE)

let currentAnimation: LottieAnimation | null = null

const sizeLabel = document.querySelector<HTMLSpanElement>('#canvas-size')
if (sizeLabel) {
  sizeLabel.textContent = `${CANVAS_SIZE.width} × ${CANVAS_SIZE.height}`
}

export function renderLottie(data: string | Uint8Array) {
  if (currentAnimation) {
    const prev = currentAnimation.picture
    if (prev) canvas.remove(prev)
    currentAnimation.dispose()
  }

  const animation = new TVG.LottieAnimation()
  animation.load(data)

  const picture = animation.picture
  if (!picture) {
    throw new Error('Failed to load Lottie animation')
  }

  // The Lottie's own composition size (`w`/`h` in the JSON) rarely matches the
  // canvas, so scale it to fit inside CANVAS_SIZE (preserving aspect ratio) and
  // translate it so the scaled result is centered instead of pinned to (0, 0).
  const { width, height } = picture.size()
  const scale = Math.min(1, CANVAS_SIZE.width / width, CANVAS_SIZE.height / height)
  const scaledWidth = width * scale
  const scaledHeight = height * scale
  picture.size(scaledWidth, scaledHeight)
  picture.translate((CANVAS_SIZE.width - scaledWidth) / 2, (CANVAS_SIZE.height - scaledHeight) / 2)

  canvas.add(picture)
  animation.play(() => canvas.update().render())

  currentAnimation = animation
}

// Overrides a color slot on the currently loaded animation and re-renders —
// no reload, since the sid was already registered when the JSON was loaded.
export function setSlotColor(sid: string, hex: string) {
  if (!currentAnimation) return

  const id = currentAnimation.gen({ [sid]: { p: { a: 0, k: hexToRgba(hex) } } })
  currentAnimation.apply(id)
  canvas.update().render()
}

function hexToRgba(hex: string): [number, number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return [r, g, b, 1]
}
