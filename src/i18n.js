// src/i18n.js
// 多語系字典與簡易翻譯工具

import enUS from './i18n/en-US.js';
import zhTW from './i18n/zh-TW.js';

/** @typedef {'zh-TW'|'en-US'} LanguageCode */

export const DEFAULT_LANGUAGE = 'zh-TW';

export const dictionaries = {
  'zh-TW': zhTW,
  'en-US': enUS
};

let currentLanguage = DEFAULT_LANGUAGE;

export function getLanguage() {
  return currentLanguage;
}

export function setLanguage(language) {
  if (!dictionaries[language]) {
    throw new Error(`[Money Snap] Unsupported language: ${language}`);
  }
  currentLanguage = language;
  return currentLanguage;
}

export function interpolate(template, params = {}) {
  return String(template).replace(/\{(\w+)\}/g, (_, key) => {
    return Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : `{${key}}`;
  });
}

export function t(key, params = {}, language = currentLanguage) {
  const dict = dictionaries[language] || dictionaries[DEFAULT_LANGUAGE];
  const fallback = dictionaries[DEFAULT_LANGUAGE];
  const value = dict[key] ?? fallback[key] ?? key;
  return interpolate(value, params);
}
