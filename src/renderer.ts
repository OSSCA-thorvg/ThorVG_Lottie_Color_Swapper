import ThorVG, { type LottieAnimation, type AnimationInfo, type Picture } from '@thorvg/webcanvas'
import { hexToRgba } from './colorUtils.ts'
import { createHighlightLottie } from './lottieHighlight.ts'

const CANVAS_SIZE = { width: 800, height: 800 }

// WebGL is the library's own default and the fast path, but it can be
// unavailable — no GPU access, a driver blocklist, or a GPU switch when an
// external display is plugged in. Left unhandled that rejects this module at
// top-level await, taking the whole app down with no visible error.
//
// It has to be decided up front rather than caught: ThorVG caches the engine
// on first init(), so a second init() with a different renderer hands back the
// original one and the retry fails exactly like the first attempt.
function webglAvailable(): boolean {
  try {
    const probe = document.createElement('canvas')
    const gl = probe.getContext('webgl2') ?? probe.getContext('webgl')
    if (!gl) return false
    // Drop the probe's context right away — browsers cap how many a page may
    // hold at once, and the real canvas still needs one.
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return true
  } catch {
    return false
  }
}

const renderer = webglAvailable() ? 'gl' : 'sw'
if (renderer === 'sw') {
  console.warn('ThorVG: WebGL unavailable, using software rendering.')
}

export const TVG = await ThorVG.init({ renderer })

export const canvas = new TVG.Canvas('#canvas', CANVAS_SIZE)

let currentAnimation: LottieAnimation | null = null
let highlightAnimation: LottieAnimation | null = null
let highlightPicture: Picture | null = null

function removeHighlight() {
  if (highlightPicture) canvas.remove(highlightPicture)
  highlightAnimation?.dispose()
  highlightAnimation = null
  highlightPicture = null
}

function fitPicture(picture: Picture) {
  const { width, height } = picture.size()
  const scale = Math.min(1, CANVAS_SIZE.width / width, CANVAS_SIZE.height / height)
  const scaledWidth = width * scale
  const scaledHeight = height * scale
  picture.size(scaledWidth, scaledHeight)
  picture.translate((CANVAS_SIZE.width - scaledWidth) / 2, (CANVAS_SIZE.height - scaledHeight) / 2)
}

// Set by playbackControls.ts so the seek bar can follow along while playing.
let frameListener: ((frame: number) => void) | null = null

function onFrame(frame: number) {
  highlightAnimation?.frame(frame)
  canvas.update().render()
  frameListener?.(frame)
}

const sizeLabel = document.querySelector<HTMLSpanElement>('#canvas-size')
if (sizeLabel) {
  sizeLabel.textContent = `${CANVAS_SIZE.width} × ${CANVAS_SIZE.height}`
}

export function renderLottie(data: string | Uint8Array) {
  removeHighlight()
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

  // The Lottie's own composition is scaled to fit and centered in the canvas.
  fitPicture(picture)

  canvas.add(picture)
  animation.play(onFrame)

  currentAnimation = animation
}

export function highlightSid(json: string, sid: string) {
  if (!currentAnimation) return

  removeHighlight()
  const animation = new TVG.LottieAnimation()
  animation.load(createHighlightLottie(json, sid))

  const picture = animation.picture
  if (!picture) {
    animation.dispose()
    return
  }

  fitPicture(picture)
  picture.opacity(180)
  highlightAnimation = animation
  highlightPicture = picture
  canvas.add(picture)
  picture.visible(true)
  animation.frame(currentAnimation.frame())
  canvas.update().render()
}

export function clearHighlight() {
  removeHighlight()
  canvas.update().render()
}

// Overrides a color slot on the currently loaded animation and re-renders —
// no reload, since the sid was already registered when the JSON was loaded.
export function applySlotColors(json: string) {
  if (!currentAnimation) return

  const data = JSON.parse(json) as Record<string, unknown>
  const slots = data.slots
  if (typeof slots !== 'object' || slots === null) return

  const overrides: Record<string, { p: { a: 0; k: number[] } }> = {}
  for (const [sid, slot] of Object.entries(slots as Record<string, unknown>)) {
    if (typeof slot !== 'object' || slot === null) continue

    const property = (slot as Record<string, unknown>).p
    if (typeof property !== 'object' || property === null) continue

    const value = (property as Record<string, unknown>).k
    if (Array.isArray(value)) overrides[sid] = { p: { a: 0, k: value } }
  }

  if (Object.keys(overrides).length === 0) return

  const id = currentAnimation.gen(overrides)
  currentAnimation.apply(id)
  highlightAnimation?.frame(currentAnimation.frame())
  canvas.update().render()
}

export function setSlotColor(sid: string, hex: string) {
  if (!currentAnimation) return

  const id = currentAnimation.gen({ [sid]: { p: { a: 0, k: hexToRgba(hex) } } })
  currentAnimation.apply(id)
  highlightAnimation?.frame(currentAnimation.frame())
  canvas.update().render()
}

export function playAnimation() {
  currentAnimation?.play(onFrame)
  highlightAnimation?.play()
}

export function pauseAnimation() {
  currentAnimation?.pause()
  highlightAnimation?.pause()
}

// stop() resets the animation to frame 0 but (unlike pause) doesn't repaint on
// its own, so the reset has to be rendered explicitly here.
export function stopAnimation() {
  currentAnimation?.stop()
  highlightAnimation?.stop()
  canvas.update().render()
}

export function seekToFrame(frame: number) {
  if (!currentAnimation) return
  currentAnimation.frame(frame)
  highlightAnimation?.frame(frame)
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
