import type { CvdMode } from './cvdCorrection.ts'

// Wires the accessibility-correction dropdown and export button. Doesn't
// touch the renderer or canvas directly — just forwards the selected mode
// to callbacks owned by main.ts, same as the other control modules.
export function initCvdControls(onModeChange: (mode: CvdMode) => void, onExport: (mode: CvdMode) => void) {
  const select = document.querySelector<HTMLSelectElement>('#cvd-select')!
  const exportBtn = document.querySelector<HTMLButtonElement>('#cvd-export-btn')!

  select.addEventListener('change', () => {
    onModeChange(select.value as CvdMode)
  })

  exportBtn.addEventListener('click', () => {
    onExport(select.value as CvdMode)
  })
}
