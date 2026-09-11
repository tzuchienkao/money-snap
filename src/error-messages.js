// src/error-messages.js
// 統一處理錯誤碼到多語系顯示文字

import { t } from './i18n.js';

export function localizeParseError(error, language = 'zh-TW') {
  if (!error) return '';
  const meta = error.meta || {};
  switch (error.code) {
    case 'INVALID_INPUT_TYPE':
      return t('errorInvalidInputType', {}, language);
    case 'TOO_MANY_ENTRIES':
      return t('errorTooManyEntries', { max: meta.max }, language);
    case 'MISSING_FIELDS':
      return t('errorMissingFields', {}, language);
    case 'EMPTY_NAME_OR_AMOUNT':
      return t('errorEmptyNameOrAmount', {}, language);
    case 'EMPTY_AMOUNT':
      return t('errorEmptyAmount', {}, language);
    case 'CURRENCY_SYMBOL_MISMATCH':
      return t('errorCurrencySymbolMismatch', { currency: meta.currency }, language);
    case 'INVALID_AMOUNT_FORMAT':
      return t('errorInvalidAmountFormat', { value: meta.value }, language);
    case 'TOO_MANY_DECIMALS':
      return t('errorTooManyDecimals', { currency: meta.currency, decimals: meta.decimals, value: meta.value }, language);
    case 'AMOUNT_EXCEEDS_LIMIT':
      return t('errorAmountExceedsLimit', { max: meta.max }, language);
    case 'AMOUNT_TOO_LARGE':
      return t('errorAmountTooLarge', { value: meta.value }, language);
    case 'UNPARSEABLE_AMOUNT':
      return t('errorUnparseableAmount', { value: meta.value }, language);
    default:
      return error.message || '';
  }
}

export function localizeBankError(error, language = 'zh-TW') {
  if (!error) return '';
  const meta = error.meta || {};
  switch (error.code) {
    case 'DOUBLE_ENTRY_MISMATCH':
      const directionKey = meta.direction === 'over' ? 'errorDirectionOver' : 'errorDirectionUnder';
      return t('errorDoubleEntryMismatch', {
        input: meta.input,
        bank: meta.bank,
        diff: meta.diff,
        diffAbs: meta.diffAbs,
        direction: t(directionKey, {}, language)
      }, language);
    default:
      return error.message || '';
  }
}

export function localizeValidationError(code, meta = {}, language = 'zh-TW') {
  switch (code) {
    case 'PER_PERSON_LIMIT':
      return t('errorPerPersonLimit', { name: meta.name, max: meta.max }, language);
    case 'TOTAL_LIMIT':
      return t('errorTotalLimit', { max: meta.max }, language);
    default:
      return '';
  }
}
