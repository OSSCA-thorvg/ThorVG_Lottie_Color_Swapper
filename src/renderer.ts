import ThorVG, { type Animation } from '@thorvg/webcanvas'

const CANVAS_SIZE = { width: 800, height: 800 }

export const TVG = await ThorVG.init({ renderer: 'gl' })

export const canvas = new TVG.Canvas('#canvas', CANVAS_SIZE)

let currentAnimation: Animation | null = null

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

  canvas.add(picture)
  animation.play(() => canvas.update().render())

  currentAnimation = animation
}
