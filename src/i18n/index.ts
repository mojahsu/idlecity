// Tiny i18n: flat JSON dictionaries, {param} interpolation, and "key.path"
// params that are themselves translated (used for building/monster names in logs).
import en from './locales/en.json';
import zhTW from './locales/zh-TW.json';

export type Locale = 'en' | 'zh-TW';
export const LOCALES: { id: Locale; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'zh-TW', label: '繁體中文' },
];

const dict: Record<Locale, Record<string, string>> = { en, 'zh-TW': zhTW };
let current: Locale = 'en';

export function setLocale(l: Locale): void { current = l; }
export function getLocale(): Locale { return current; }

export function detectLocale(): Locale {
  const lang = typeof navigator !== 'undefined' ? navigator.language : 'en';
  if (lang.startsWith('zh')) return 'zh-TW';
  return 'en';
}

export function t(key: string, params?: Record<string, string | number>): string {
  let s = dict[current][key] ?? dict.en[key] ?? key;
  if (params) {
    for (const k in params) {
      let v = params[k];
      // A param that looks like a translation key (e.g. "building.hut") is translated too.
      if (typeof v === 'string' && /^[a-z]+\.[A-Za-z]+$/.test(v) && (dict[current][v] ?? dict.en[v])) v = t(v);
      s = s.replaceAll(`{${k}}`, String(v));
    }
  }
  return s;
}
