// src/currency.js
// 多國貨幣組態與整數化放大工具

/**
 * @typedef {'zh-TW'|'en-US'} LanguageCode
 * @typedef {'TWD'|'USD'|'JPY'|'KRW'|'CNY'|'HKD'|'EUR'|'THB'} CurrencyCode
 */

/**
 * @typedef {Object} CurrencyProfile
 * @property {CurrencyCode} code
 * @property {Record<LanguageCode, string>} name
 * @property {string} symbol
 * @property {number} decimals
 * @property {number[]} defaultBanknotes
 * @property {number[]} defaultCoins
 */

/** @type {Record<CurrencyCode, CurrencyProfile>} */
export const CURRENCY_PROFILES = {
  TWD: {
    code: 'TWD',
    name: { 'zh-TW': '新台幣', 'en-US': 'New Taiwan Dollar' },
    symbol: 'NT$',
    decimals: 0,
    defaultBanknotes: [2000, 1000, 500, 200, 100],
    defaultCoins: [50, 20, 10, 5, 1]
  },
  USD: {
    code: 'USD',
    name: { 'zh-TW': '美元', 'en-US': 'US Dollar' },
    symbol: '$',
    decimals: 2,
    defaultBanknotes: [100, 50, 20, 10, 5, 2, 1],
    defaultCoins: [0.5, 0.25, 0.1, 0.05, 0.01]
  },
  JPY: {
    code: 'JPY',
    name: { 'zh-TW': '日圓', 'en-US': 'Japanese Yen' },
    symbol: '¥',
    decimals: 0,
    defaultBanknotes: [10000, 5000, 2000, 1000],
    defaultCoins: [500, 100, 50, 10, 5, 1]
  },
  KRW: {
    code: 'KRW',
    name: { 'zh-TW': '韓元', 'en-US': 'South Korean Won' },
    symbol: '₩',
    decimals: 0,
    defaultBanknotes: [50000, 10000, 5000, 1000],
    defaultCoins: [500, 100, 50, 10]
  },
  CNY: {
    code: 'CNY',
    name: { 'zh-TW': '人民幣', 'en-US': 'Chinese Yuan' },
    symbol: '¥',
    decimals: 2,
    defaultBanknotes: [100, 50, 20, 10, 5, 1],
    defaultCoins: [1, 0.5, 0.1]
  },
  HKD: {
    code: 'HKD',
    name: { 'zh-TW': '港幣', 'en-US': 'Hong Kong Dollar' },
    symbol: 'HK$',
    decimals: 2,
    defaultBanknotes: [1000, 500, 100, 50, 20, 10],
    defaultCoins: [10, 5, 2, 1, 0.5, 0.2, 0.1]
  },
  EUR: {
    code: 'EUR',
    name: { 'zh-TW': '歐元', 'en-US': 'Euro' },
    symbol: '€',
    decimals: 2,
    defaultBanknotes: [500, 200, 100, 50, 20, 10, 5],
    defaultCoins: [2, 1, 0.5, 0.2, 0.1, 0.05, 0.02, 0.01]
  },
  THB: {
    code: 'THB',
    name: { 'zh-TW': '泰銖', 'en-US': 'Thai Baht' },
    symbol: '฿',
    decimals: 2,
    defaultBanknotes: [1000, 500, 100, 50, 20],
    defaultCoins: [10, 5, 2, 1, 0.5, 0.25]
  }
};

const MULTI_CHAR_SYMBOL_TOKENS = ['NT$', 'HK$'];
const KNOWN_SYMBOL_TOKENS = ['NT$', 'HK$', '$', '¥', '€', '฿', '₩', '￡'];
const ALLOWED_SYMBOLS_BY_CURRENCY = {
  TWD: ['NT$', '$'],
  USD: ['$'],
  JPY: ['¥'],
  KRW: ['₩'],
  CNY: ['¥'],
  HKD: ['HK$'],
  EUR: ['€'],
  THB: ['฿']
};

function uniqueDenominations(denominations) {
  return denominations.filter((value, index, array) => array.indexOf(value) === index);
}

function countDecimalPlaces(value) {
  const str = String(value);
  const dot = str.indexOf('.');
  if (dot === -1) return 0;
  return str.length - dot - 1;
}

function normalizeAmountString(value) {
  return String(value).trim();
}

function resolveCurrencyProfile(input = 'TWD') {
  if (input && typeof input === 'object' && typeof input.code === 'string') {
    const profile = CURRENCY_PROFILES[input.code];
    if (!profile) {
      throw new Error(`[Money Snap] Unsupported currency code: ${input.code}`);
    }
    return profile;
  }
  const code = input || 'TWD';
  const profile = CURRENCY_PROFILES[code];
  if (!profile) {
    throw new Error(`[Money Snap] Unsupported currency code: ${code}`);
  }
  return profile;
}

export function getCurrencyProfile(input = 'TWD') {
  return resolveCurrencyProfile(input);
}

export function getCurrencyScaleFactor(input = 'TWD') {
  const profile = resolveCurrencyProfile(input);
  return 10 ** profile.decimals;
}

export function getCurrencyDenominations(input = 'TWD') {
  const profile = resolveCurrencyProfile(input);
  return uniqueDenominations([...profile.defaultBanknotes, ...profile.defaultCoins]);
}

export function getAllowedCurrencySymbols(input = 'TWD') {
  const profile = resolveCurrencyProfile(input);
  return [...(ALLOWED_SYMBOLS_BY_CURRENCY[profile.code] || [profile.symbol])];
}

export function detectCurrencySymbolMismatch(rawValue, input = 'TWD') {
  const profile = resolveCurrencyProfile(input);
  const allowedSymbols = getAllowedCurrencySymbols(profile);
  let work = normalizeAmountString(rawValue);

  if (work.length === 0) {
    return null;
  }

  for (const token of MULTI_CHAR_SYMBOL_TOKENS) {
    const regex = new RegExp(token.replace('$', '\\$'), 'gi');
    if (regex.test(work)) {
      if (!allowedSymbols.includes(token)) {
        return token;
      }
      work = work.replace(regex, '');
    }
  }

  for (const token of KNOWN_SYMBOL_TOKENS) {
    if (MULTI_CHAR_SYMBOL_TOKENS.includes(token)) continue;
    if (work.includes(token) && !allowedSymbols.includes(token)) {
      return token;
    }
  }

  return null;
}

export function stripAllowedCurrencySymbols(rawValue, input = 'TWD') {
  const profile = resolveCurrencyProfile(input);
  let normalized = normalizeAmountString(rawValue);
  for (const token of getAllowedCurrencySymbols(profile)) {
    if (MULTI_CHAR_SYMBOL_TOKENS.includes(token)) {
      const regex = new RegExp(token.replace('$', '\\$'), 'gi');
      normalized = normalized.replace(regex, '');
    } else {
      normalized = normalized.split(token).join('');
    }
  }
  return normalized;
}

export function scaleAmount(value, input = 'TWD') {
  const profile = resolveCurrencyProfile(input);
  const decimals = profile.decimals;
  const factor = BigInt(10 ** decimals);
  const raw = normalizeAmountString(value);

  if (!/^-?\d+(?:\.\d+)?$/.test(raw)) {
    throw new Error(`[Money Snap] Invalid amount format: ${value}`);
  }

  const negative = raw.startsWith('-');
  const normalized = negative ? raw.slice(1) : raw;
  const [intPart, fracPart = ''] = normalized.split('.');

  if (fracPart.length > decimals) {
    throw new Error(`[Money Snap] Amount ${value} exceeds ${decimals} decimal places for ${profile.code}`);
  }

  const paddedFraction = fracPart.padEnd(decimals, '0');
  const integerValue = BigInt(intPart || '0') * factor;
  const fractionValue = paddedFraction ? BigInt(paddedFraction) : 0n;
  const scaled = integerValue + fractionValue;
  return negative ? -scaled : scaled;
}

export function descaleAmount(value, input = 'TWD') {
  const profile = resolveCurrencyProfile(input);
  const factor = getCurrencyScaleFactor(profile);
  if (profile.decimals === 0) {
    return Number(value);
  }
  return Number(value) / factor;
}

export function toMinorUnitDenominations(denominations, input = 'TWD') {
  const profile = resolveCurrencyProfile(input);
  const factor = getCurrencyScaleFactor(profile);
  return denominations.map((denomination) => {
    if (countDecimalPlaces(denomination) > profile.decimals) {
      throw new Error(
        `[Money Snap] Denomination ${denomination} exceeds ${profile.decimals} decimal places for ${profile.code}`
      );
    }
    return {
      original: denomination,
      scaled: Math.round(Number(denomination) * factor)
    };
  }).sort((a, b) => b.scaled - a.scaled);
}
