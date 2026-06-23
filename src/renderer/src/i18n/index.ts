import zhCN from './zh-CN.json'
import zhTW from './zh-TW.json'
import en from './en.json'

export type Locale = 'zh-CN' | 'zh-TW' | 'en'
export type TranslationKey = keyof typeof zhCN

export const defaultLocale: Locale = 'zh-CN'

export const languageOptions: Array<{ locale: Locale; label: string }> = [
  { locale: 'zh-CN', label: '简体中文' },
  { locale: 'zh-TW', label: '繁體中文' },
  { locale: 'en', label: 'English' }
]

const dictionaries: Record<Locale, Record<TranslationKey, string>> = {
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  en
}

export function t(locale: Locale, key: TranslationKey): string {
  return dictionaries[locale]?.[key] ?? dictionaries[defaultLocale][key] ?? key
}

export function nextLocale(locale: Locale): Locale {
  const index = languageOptions.findIndex((item) => item.locale === locale)
  return languageOptions[(index + 1) % languageOptions.length].locale
}
