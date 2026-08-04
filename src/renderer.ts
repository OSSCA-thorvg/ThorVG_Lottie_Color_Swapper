import ThorVG, { type LottieAnimation, type AnimationInfo } from '@thorvg/webcanvas'
import { hexToRgba } from './colorUtils.ts'

const CANVAS_SIZE = { width: 800, height: 800 }

export const TVG = await ThorVG.init({ renderer: 'gl' })

export const canvas = new TVG.Canvas('#canvas', CANVAS_SIZE)

let currentAnimation: LottieAnimation | null = null

// Set by playbackControls.ts so the seek bar can follow along while playing.
let frameListener: ((frame: number) => void) | null = null

function onFrame(frame: number) {
  canvas.update().render()
  frameListener?.(frame)
}

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
  animation.play(onFrame)

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

export function playAnimation() {
  currentAnimation?.play(onFrame)
}

export function pauseAnimation() {
  currentAnimation?.pause()
}

// stop() resets the animation to frame 0 but (unlike pause) doesn't repaint on
// its own, so the reset has to be rendered explicitly here.
export function stopAnimation() {
  currentAnimation?.stop()
  canvas.update().render()
}

export function seekToFrame(frame: number) {
  if (!currentAnimation) return
  currentAnimation.frame(frame)
  canvas.update().render()
}

export function isAnimationPlaying(): boolean {
  return currentAnimation?.isPlaying() ?? false
}

export function getAnimationInfo(): AnimationInfo | null {
  return currentAnimation?.info() ?? null
}

export function onAnimationFrame(listener: (frame: number) => void) {
  frameListener = listener
}
