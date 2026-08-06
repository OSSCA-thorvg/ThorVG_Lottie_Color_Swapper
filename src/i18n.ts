export type Lang = 'ko' | 'en'

const STORAGE_KEY = 'lottie-color-swapper.lang'

// The single source of truth for every user-facing string. index.html carries
// only `data-i18n` keys with empty text, so a string edited here can never
// silently disagree with the markup.
const messages = {
  en: {
    'app.title': 'Lottie Color Swapper',
    'header.subtitle':
      'Upload a file to edit its colors directly, or download it with color vision deficiency correction applied',
    'lang.groupAria': 'Language',
    'lang.ko': 'Korean',
    'lang.en': 'English',
    'upload.button': 'Upload Lottie file',
    'action.initialize': 'Reset colors',
    'action.undo': 'Undo',
    'action.export': 'Export as JSON',
    'canvas.ribbon': 'Preview',
    'cvd.label': 'CVD correction',
    'cvd.none': 'None',
    'cvd.protanopia': 'Protanopia correction',
    'cvd.deuteranopia': 'Deuteranopia correction',
    'cvd.tritanopia': 'Tritanopia correction',
    'cvd.credit': 'Color vision model:',
    'playback.playPause': 'Play/pause',
    'playback.stop': 'Stop',
    'drop.overlay': 'Drop a Lottie file here',
    'notify.colorChanged': 'Color changed.',
    'notify.uploadFirst': 'Upload a Lottie file before resetting colors.',
    'notify.reset': 'Colors reset to what they were at upload time.',
    'notify.nothingToUndo': 'No color change to undo.',
    'notify.undone': 'Undid the most recent color change only.',
    'notify.exportedOriginal': 'Exported with the original colors.',
    'notify.exportedCvd': 'Exported the "{mode}" version.',
    'error.loadFailed': 'Failed to load Lottie file',
  },
  ko: {
    'app.title': 'Lottie Color Swapper',
    'header.subtitle':
      '파일을 업로드해 색상을 직접 편집하거나, 색각이상 보정을 적용하여 다운로드할 수 있습니다',
    'lang.groupAria': '언어',
    'lang.ko': '한국어',
    'lang.en': '영어',
    'upload.button': 'Lottie 파일 업로드',
    'action.initialize': '색상 초기화',
    'action.undo': '실행 취소',
    'action.export': 'JSON으로 내보내기',
    'canvas.ribbon': '미리보기',
    'cvd.label': '색각이상 보정',
    'cvd.none': '없음',
    'cvd.protanopia': '적색맹용 보정',
    'cvd.deuteranopia': '녹색맹용 보정',
    'cvd.tritanopia': '청색맹용 보정',
    'cvd.credit': '색각 모델:',
    'playback.playPause': '재생/일시정지',
    'playback.stop': '정지',
    'drop.overlay': 'Lottie 파일을 여기에 놓으세요',
    'notify.colorChanged': '색상을 변경했습니다.',
    'notify.uploadFirst': '색상을 초기화하려면 먼저 Lottie 파일을 업로드하세요.',
    'notify.reset': '색상을 업로드 당시 원래 색상으로 초기화했습니다.',
    'notify.nothingToUndo': '실행 취소할 색상 변경이 없습니다.',
    'notify.undone': '최근 색상 변경만 실행 취소했습니다.',
    'notify.exportedOriginal': '원본 색상 그대로 내보냈습니다.',
    'notify.exportedCvd': '{mode} 버전을 내보냈습니다.',
    'error.loadFailed': 'Lottie 파일을 불러오지 못했습니다',
  },
} as const

export type MessageKey = keyof (typeof messages)['en']

const listeners: Array<(lang: Lang) => void> = []
let currentLang: Lang = 'en'

export function getLang(): Lang {
  return currentLang
}

export function t(key: MessageKey, params?: Record<string, string>): string {
  // Falling back to the key keeps a typo visible instead of blanking the UI.
  const template: string = messages[currentLang][key] ?? key
  if (!params) return template

  return template.replace(/\{(\w+)\}/g, (match, name: string) => params[name] ?? match)
}

// Reads the stored choice first, then the browser's accept-languages list.
// Anything that isn't Korean or English lands on English.
export function detectLang(): Lang {
  const stored = readStoredLang()
  if (stored) return stored

  const tags = navigator.languages?.length ? navigator.languages : [navigator.language]
  for (const tag of tags) {
    const primary = tag?.toLowerCase().split('-')[0]
    if (primary === 'ko') return 'ko'
    if (primary === 'en') return 'en'
  }

  return 'en'
}

// Call once at startup, before anything renders.
export function initI18n() {
  currentLang = detectLang()
  applyTranslations()
}

export function setLang(lang: Lang) {
  if (lang === currentLang) return

  currentLang = lang
  writeStoredLang(lang)
  applyTranslations()
  listeners.forEach((listener) => listener(lang))
}

// Re-run whenever the language changes. Modules that own text created at
// runtime (notifications, for one) register here; everything declared in
// index.html is handled by applyTranslations().
export function onLangChange(listener: (lang: Lang) => void) {
  listeners.push(listener)
}

function applyTranslations() {
  document.documentElement.lang = currentLang
  document.title = t('app.title')

  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n as MessageKey)
  })

  document.querySelectorAll<HTMLElement>('[data-i18n-aria-label]').forEach((el) => {
    el.setAttribute('aria-label', t(el.dataset.i18nAriaLabel as MessageKey))
  })
}

// Private-mode Safari and blocked third-party storage both throw on access,
// so a failed read/write degrades to "no saved preference" instead of an error.
function readStoredLang(): Lang | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'ko' || stored === 'en' ? stored : null
  } catch {
    return null
  }
}

function writeStoredLang(lang: Lang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    // Preference just won't survive a reload.
  }
}
