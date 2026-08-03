import {
  playAnimation,
  pauseAnimation,
  stopAnimation,
  seekToFrame,
  isAnimationPlaying,
  getAnimationInfo,
  onAnimationFrame,
} from './renderer.ts'

// Wires the play/pause, stop, and seek-bar controls to the currently loaded
// animation (owned by renderer.ts). Call once at startup.
export function initPlaybackControls() {
  const playPauseBtn = document.querySelector<HTMLButtonElement>('#play-pause-btn')!
  const stopBtn = document.querySelector<HTMLButtonElement>('#stop-btn')!
  const seekBar = document.querySelector<HTMLInputElement>('#seek-bar')!
  const frameCounter = document.querySelector<HTMLSpanElement>('#frame-counter')!

  function setIcon(playing: boolean) {
    playPauseBtn.textContent = playing ? '⏸' : '▶'
  }

  function setFrameCounter(frame: number) {
    const total = getAnimationInfo()?.totalFrames ?? 0
    frameCounter.textContent = `${Math.floor(frame)} / ${Math.floor(total)}`
  }

  playPauseBtn.addEventListener('click', () => {
    if (isAnimationPlaying()) {
      pauseAnimation()
      setIcon(false)
    } else {
      playAnimation()
      setIcon(true)
    }
  })

  stopBtn.addEventListener('click', () => {
    stopAnimation()
    seekBar.value = '0'
    setFrameCounter(0)
    setIcon(false)
  })

  seekBar.addEventListener('input', () => {
    const frame = Number(seekBar.value)
    seekToFrame(frame)
    setFrameCounter(frame)
  })

  // renderer.ts calls this every frame while playing so the bar and counter
  // move along; seeking/stopping (above) update it directly since those
  // don't go through the frame listener.
  onAnimationFrame((frame) => {
    seekBar.value = String(frame)
    setFrameCounter(frame)
  })
}

// Call after loading a new Lottie: sizes the seek bar to the new animation's
// length and syncs the play/pause icon + frame counter to the "playing"
// state renderLottie() already started it in.
export function resetPlaybackUI() {
  const seekBar = document.querySelector<HTMLInputElement>('#seek-bar')!
  const playPauseBtn = document.querySelector<HTMLButtonElement>('#play-pause-btn')!
  const frameCounter = document.querySelector<HTMLSpanElement>('#frame-counter')!

  const total = Math.floor(getAnimationInfo()?.totalFrames ?? 0)
  seekBar.max = String(total)
  seekBar.value = '0'
  playPauseBtn.textContent = '⏸'
  frameCounter.textContent = `0 / ${total}`
}
