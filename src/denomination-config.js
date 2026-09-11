// src/denomination-config.js
// 多幣別面額設定與持久化管理

import { getCurrencyDenominations, getCurrencyProfile } from './currency.js';

export const DEFAULT_CURRENCY = 'TWD';
export const DEFAULT_LANGUAGE = 'zh-TW';
export const STORAGE_KEY = 'money_snap_multi_currency_config_v5';

const DEFAULT_ACTIVE_BY_CURRENCY = {
  TWD: [1000, 500, 100, 50, 10, 5, 1],
  USD: [100, 50, 20, 10, 5, 1, 0.25, 0.1, 0.05, 0.01],
  JPY: [10000, 5000, 1000, 500, 100, 50, 10, 5, 1],
  KRW: [50000, 10000, 5000, 1000, 500, 100, 50, 10],
  CNY: [100, 50, 20, 10, 5, 1, 0.5, 0.1],
  HKD: [1000, 500, 100, 50, 20, 10, 5, 2, 1, 0.5, 0.2, 0.1],
  EUR: [200, 100, 50, 20, 10, 5, 2, 1, 0.5, 0.2, 0.1, 0.05],
  THB: [1000, 500, 100, 50, 20, 10, 5, 1, 0.5, 0.25]
};

export const DEFAULT_DENOMINATIONS = getCurrencyDenominations(DEFAULT_CURRENCY);
export const DEFAULT_ACTIVE_DENOMINATIONS = [...DEFAULT_ACTIVE_BY_CURRENCY[DEFAULT_CURRENCY]];

function uniqueSorted(denoms) {
  return [...new Set(denoms)].sort((a, b) => b - a);
}

function getValidDenominations(currency) {
  return getCurrencyDenominations(currency);
}

function getDefaultActiveDenominations(currency = DEFAULT_CURRENCY) {
  return [...(DEFAULT_ACTIVE_BY_CURRENCY[currency] || getValidDenominations(currency))];
}

function createDefaultCurrencyState(currency = DEFAULT_CURRENCY) {
  return {
    isCustomEnabled: false,
    activeDenominations: getDefaultActiveDenominations(currency)
  };
}

function createDefaultConfig() {
  return {
    language: DEFAULT_LANGUAGE,
    currency: DEFAULT_CURRENCY,
    saveAsDefault: false,
    currencies: {
      TWD: createDefaultCurrencyState('TWD'),
      USD: createDefaultCurrencyState('USD'),
      JPY: createDefaultCurrencyState('JPY'),
      KRW: createDefaultCurrencyState('KRW'),
      CNY: createDefaultCurrencyState('CNY'),
      HKD: createDefaultCurrencyState('HKD'),
      EUR: createDefaultCurrencyState('EUR'),
      THB: createDefaultCurrencyState('THB')
    }
  };
}

let currentConfig = createDefaultConfig();

function ensureCurrencyState(currency) {
  if (!currentConfig.currencies[currency]) {
    currentConfig.currencies[currency] = createDefaultCurrencyState(currency);
  }
  return currentConfig.currencies[currency];
}

function normalizeCurrencyState(currency, rawState = {}) {
  const valid = getValidDenominations(currency);
  const active = uniqueSorted(
    Array.isArray(rawState.activeDenominations) ? rawState.activeDenominations.filter((value) => valid.includes(value)) : []
  );
  return {
    isCustomEnabled: Boolean(rawState.isCustomEnabled),
    activeDenominations: active.length > 0 ? active : getDefaultActiveDenominations(currency)
  };
}

function normalizeConfig(raw) {
  const base = createDefaultConfig();
  if (!raw || typeof raw !== 'object') {
    return base;
  }

  const currency = raw.currency && base.currencies[raw.currency] ? raw.currency : DEFAULT_CURRENCY;
  const language = raw.language === 'en-US' ? 'en-US' : DEFAULT_LANGUAGE;

  const currencies = {};
  for (const code of Object.keys(base.currencies)) {
    currencies[code] = normalizeCurrencyState(code, raw.currencies && raw.currencies[code]);
  }

  return {
    language,
    currency,
    saveAsDefault: Boolean(raw.saveAsDefault),
    currencies
  };
}

function persistConfig(config) {
  if (!config.saveAsDefault) {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  return true;
}

export function loadDenomConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    currentConfig = normalizeConfig(raw ? JSON.parse(raw) : null);
    return getCurrentConfig();
  } catch (e) {
    console.warn('[DenomConfig] Failed to load config from localStorage, using defaults:', e);
    currentConfig = createDefaultConfig();
    return getCurrentConfig();
  }
}

export function saveDenomConfig(config) {
  try {
    currentConfig = normalizeConfig(config);
    persistConfig(currentConfig);
    return true;
  } catch (e) {
    console.error('[DenomConfig] Failed to save config to localStorage:', e);
    return false;
  }
}

export function getCurrentCurrency() {
  return currentConfig.currency;
}

export function setCurrentCurrency(currency) {
  getCurrencyProfile(currency);
  currentConfig.currency = currency;
  ensureCurrencyState(currency);
  if (currentConfig.saveAsDefault) {
    persistConfig(currentConfig);
  }
  return true;
}

export function getLanguage() {
  return currentConfig.language;
}

export function setLanguage(language) {
  if (language !== 'zh-TW' && language !== 'en-US') {
    throw new Error(`[DenomConfig] Unsupported language: ${language}`);
  }
  currentConfig.language = language;
  if (currentConfig.saveAsDefault) {
    persistConfig(currentConfig);
  }
  return true;
}

export function getAvailableDenominations(currency = currentConfig.currency) {
  return [...getValidDenominations(currency)];
}

export function getActiveDenominations(currency = currentConfig.currency) {
  return [...ensureCurrencyState(currency).activeDenominations];
}

export function setActiveDenominations(denoms, currency = currentConfig.currency) {
  try {
    if (!Array.isArray(denoms) || denoms.length === 0) {
      throw new Error('Invalid denominations array');
    }
    const valid = getValidDenominations(currency);
    const active = uniqueSorted(denoms.filter((value) => valid.includes(value)));
    if (active.length === 0) {
      throw new Error('No valid denominations provided');
    }
    ensureCurrencyState(currency).activeDenominations = active;
    if (currentConfig.saveAsDefault) {
      persistConfig(currentConfig);
    }
    return true;
  } catch (e) {
    console.error('[DenomConfig] Failed to set active denominations:', e);
    return false;
  }
}

export function isCustomDenomEnabled(currency = currentConfig.currency) {
  return Boolean(ensureCurrencyState(currency).isCustomEnabled);
}

export function setCustomDenomEnabled(enabled, currency = currentConfig.currency) {
  ensureCurrencyState(currency).isCustomEnabled = Boolean(enabled);
  if (currentConfig.saveAsDefault) {
    persistConfig(currentConfig);
  }
  return true;
}

export function toggleSaveAsDefault(enabled) {
  try {
    currentConfig.saveAsDefault = Boolean(enabled);
    persistConfig(currentConfig);
    return true;
  } catch (e) {
    console.error('[DenomConfig] Failed to toggle saveAsDefault:', e);
    return false;
  }
}

export function getCurrencyConfig(currency = currentConfig.currency) {
  const state = ensureCurrencyState(currency);
  return {
    currency,
    isCustomEnabled: state.isCustomEnabled,
    activeDenominations: [...state.activeDenominations]
  };
}

export function getCurrentConfig() {
  const state = ensureCurrencyState(currentConfig.currency);
  return {
    language: currentConfig.language,
    currency: currentConfig.currency,
    saveAsDefault: currentConfig.saveAsDefault,
    enabled: state.isCustomEnabled,
    isCustomEnabled: state.isCustomEnabled,
    activeDenominations: [...state.activeDenominations],
    currencies: JSON.parse(JSON.stringify(currentConfig.currencies))
  };
}

export function resetToDefaults(currency = null) {
  if (currency) {
    currentConfig.currencies[currency] = createDefaultCurrencyState(currency);
  } else {
    currentConfig = createDefaultConfig();
  }
  localStorage.removeItem(STORAGE_KEY);
  return true;
}
