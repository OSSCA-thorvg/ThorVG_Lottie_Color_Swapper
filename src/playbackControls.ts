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

  function setIcon(playing: boolean) {
    playPauseBtn.textContent = playing ? '⏸' : '▶'
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
    setIcon(false)
  })

  seekBar.addEventListener('input', () => {
    seekToFrame(Number(seekBar.value))
  })

  // renderer.ts calls this every frame while playing so the bar moves along.
  onAnimationFrame((frame) => {
    seekBar.value = String(frame)
  })
}

// Call after loading a new Lottie: sizes the seek bar to the new animation's
// length and syncs the play/pause icon to the "playing" state renderLottie()
// already started it in.
export function resetPlaybackUI() {
  const seekBar = document.querySelector<HTMLInputElement>('#seek-bar')!
  const playPauseBtn = document.querySelector<HTMLButtonElement>('#play-pause-btn')!

  const info = getAnimationInfo()
  seekBar.max = String(info?.totalFrames ?? 0)
  seekBar.value = '0'
  playPauseBtn.textContent = '⏸'
}
