import type { CvdMode } from './cvdCorrection.ts'

// Wires the accessibility-correction dropdown. Doesn't touch the renderer or
// canvas directly — just forwards the selected mode to a callback owned by
// main.ts, same as the other control modules.
export function initCvdControls(onModeChange: (mode: CvdMode) => void) {
  const select = document.querySelector<HTMLSelectElement>('#cvd-select')!

  select.addEventListener('change', () => {
    onModeChange(select.value as CvdMode)
  })
}
