import { getLang, onLangChange, setLang, type Lang } from './i18n.ts'

// Wires the header language selector. The option labels are static language
// codes and their aria-labels are handled by i18n's applyTranslations(), so
// this module only owns which option reads as the active one.
export function initLangControls() {
  const options = document.querySelectorAll<HTMLButtonElement>('#lang-toggle .lang-option')

  options.forEach((option) => {
    option.addEventListener('click', () => setLang(option.dataset.lang as Lang))
  })

  // aria-pressed, not a class alone: the active state has to reach a screen
  // reader too, and the stylesheet keys the highlight off the same attribute
  // so the two can't disagree.
  const syncPressedState = () => {
    options.forEach((option) => {
      option.setAttribute('aria-pressed', String(option.dataset.lang === getLang()))
    })
  }

  syncPressedState()
  onLangChange(syncPressedState)
}
