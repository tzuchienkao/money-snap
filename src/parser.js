// src/parser.js
// 提供輸入解析功能：支援雙模式解析（含姓名 / 純金額）、逗號與 Tab 分隔、多行、去除空白行、貨幣符號與千分位處理
// Export: parseInput(text, hasNameFlag) -> { entries: [{name, amt}], inputSum, error: {line, raw, message} | null }

import { MAX_ENTRIES, MAX_PER_ENTRY } from './config.js';
import { detectCurrencySymbolMismatch, getCurrencyProfile, scaleAmount, stripAllowedCurrencySymbols } from './currency.js';

/**
 * @typedef {Object} ParsedEntry
 * @property {string} name - 姓名或項目編號
 * @property {number|bigint} amt - 金額（整數用 BigInt，小數用 Number）
 */

/**
 * @typedef {Object} ParseError
 * @property {number} line - 錯誤發生的行號（1-based）
 * @property {string} raw - 原始輸入行內容
 * @property {string} message - 錯誤訊息
 */

/**
 * @typedef {Object} ParseResult
 * @property {ParsedEntry[]} entries - 解析成功的項目陣列
 * @property {number|bigint} inputSum - 所有金額的總和
 * @property {ParseError|null} error - 錯誤物件，無錯誤時為 null
 */

/**
 * 雙模式文本解析器
 * 
 * 支援兩種模式：
 * - 含姓名模式（hasNameFlag = true）：每行格式為「姓名,金額」或「姓名\t金額」
 * - 純金額模式（hasNameFlag = false）：每行僅包含金額，系統自動編號為「項目 #1」、「項目 #2」...
 * 
 * 容錯處理：
 * - 自動清除貨幣符號（$、¥、€、￡）
 * - 支援千分位逗號（半形、全形）
 * - 支援 Tab、半形逗號、全形逗號作為分隔符
 * - 過濾空白行
 * - 支援負數和小數
 * 
 * 限制：
 * - 最多 {@link MAX_ENTRIES} 筆資料
 * - 單筆金額整數部分不超過 {@link MAX_PER_ENTRY}
 * 
 * @param {string} text - 輸入框原始文字（多行文本）
 * @param {boolean} [hasNameFlag=true] - 是否包含姓名欄位
 * @param {{ currencyCode?: import('./currency.js').CurrencyCode, currencyProfile?: import('./currency.js').CurrencyProfile, buildItemName?: (index:number) => string }} [options]
 * @returns {ParseResult} 解析結果物件
 * 
 * @example
 * // 含姓名模式
 * parseInput("王小明,1200\n張三,300", true)
 * // => { entries: [{name:"王小明",amt:1200n},{name:"張三",amt:300n}], inputSum:1500n, error:null }
 * 
 * @example
 * // 純金額模式
 * parseInput("1200\n300", false)
 * // => { entries: [{name:"項目 #1",amt:1200n},{name:"項目 #2",amt:300n}], inputSum:1500n, error:null }
 */
export function parseInput(text, hasNameFlag = true, options = {}) {
  const makeError = (line, raw, code, message, meta = {}) => ({
    entries: [],
    inputSum: 0,
    error: { line, raw, code, meta, message }
  });
  if (typeof text !== 'string') {
    return makeError(0, '', 'INVALID_INPUT_TYPE', '輸入非字串');
  }
  const profile = options.currencyProfile || getCurrencyProfile(options.currencyCode || 'TWD');
  const buildItemName = typeof options.buildItemName === 'function'
    ? options.buildItemName
    : (index) => `項目 #${index}`;
  const rawLines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (rawLines.length > MAX_ENTRIES) {
    return makeError(0, '', 'TOO_MANY_ENTRIES', `輸入筆數超過上限 ${MAX_ENTRIES} 筆`, { max: MAX_ENTRIES });
  }
  const entries = [];
  for (let i = 0; i < rawLines.length; i++) {
    const raw = rawLines[i];
    let namePart = '';
    let amtPart = '';
    
    if (hasNameFlag) {
      // 含姓名模式：找第一個欄位分隔符（Tab、半形逗號、全形逗號），避免把金額內的千分位逗號切開
      const match = raw.match(/[\t,，]/);
      if (!match) {
        return makeError(i + 1, raw, 'MISSING_FIELDS', '欄位數不足（需要姓名與金額）');
      }
      const idx = match.index;
      namePart = raw.slice(0, idx).trim();
      amtPart = raw.slice(idx + 1).trim();
      if (!namePart || !amtPart) {
        return makeError(i + 1, raw, 'EMPTY_NAME_OR_AMOUNT', '欄位數不足（姓名或金額為空）');
      }
    } else {
      // 純金額模式：整行當作金額，姓名自動編號
      namePart = buildItemName(i + 1);
      amtPart = raw.trim();
      if (!amtPart) {
        return makeError(i + 1, raw, 'EMPTY_AMOUNT', '金額為空');
      }
    }

    const mismatchedSymbol = detectCurrencySymbolMismatch(amtPart, profile);
    if (mismatchedSymbol) {
      return makeError(
        i + 1,
        raw,
        'CURRENCY_SYMBOL_MISMATCH',
        `金額幣別符號與目前選擇的 ${profile.code} 不一致：'${amtPart}'`,
        { currency: profile.code, symbol: mismatchedSymbol, value: amtPart }
      );
    }

    // 金額容錯：僅移除當前幣別允許的貨幣符號與空白，保留千分位逗號以利後續清理
    let amtRaw = stripAllowedCurrencySymbols(amtPart, profile);
    // 移除千分位逗號（包含全形逗號）與空白
    amtRaw = amtRaw.replace(/[\,，\s]/g, '');

    // 允許負號與小數點
    if (!/^-?\d+(?:\.\d+)?$/.test(amtRaw)) {
      return makeError(i + 1, raw, 'INVALID_AMOUNT_FORMAT', `金額格式錯誤：'${amtPart}'`, { value: amtPart });
    }
    // 若為整數（無小數點），使用 BigInt 以避免大數精度問題；否則使用 Number
    let amt;
    if (profile.decimals > 0) {
      const fraction = amtRaw.split('.')[1] || '';
      if (fraction.length > profile.decimals) {
        return makeError(
          i + 1,
          raw,
          'TOO_MANY_DECIMALS',
          `金額小數位數超過 ${profile.code} 允許的 ${profile.decimals} 位：'${amtPart}'`,
          { currency: profile.code, decimals: profile.decimals, value: amtPart }
        );
      }
      const integerPart = amtRaw.replace(/^-/, '').split('.')[0] || '0';
      if (BigInt(integerPart) > BigInt(MAX_PER_ENTRY)) {
        return makeError(i + 1, raw, 'AMOUNT_EXCEEDS_LIMIT', `金額超過單筆上限 ${MAX_PER_ENTRY}`, { max: MAX_PER_ENTRY });
      }
      try {
        amt = scaleAmount(amtRaw, profile);
      } catch (e) {
        return makeError(i + 1, raw, 'INVALID_AMOUNT_FORMAT', `金額格式錯誤：'${amtPart}'`, { value: amtPart });
      }
    } else if (/^-?\d+$/.test(amtRaw)) {
      try {
        amt = BigInt(amtRaw);
      } catch (e) {
        return makeError(i + 1, raw, 'AMOUNT_TOO_LARGE', `金額過大或格式錯誤：'${amtPart}'`, { value: amtPart });
      }
      // per-entry limit check
      const abs = (amt < 0n) ? -amt : amt;
      if (abs > BigInt(MAX_PER_ENTRY)) {
        return makeError(i + 1, raw, 'AMOUNT_EXCEEDS_LIMIT', `金額超過單筆上限 ${MAX_PER_ENTRY}`, { max: MAX_PER_ENTRY });
      }
    } else {
      // 小數情況，保留為 Number（若需要更高精度可改為 cents-based BigInt）
      amt = Number(amtRaw);
      if (Number.isNaN(amt)) {
        return makeError(i + 1, raw, 'UNPARSEABLE_AMOUNT', `無法解析金額：'${amtPart}'`, { value: amtPart });
      }
      if (Math.abs(Math.floor(amt)) > MAX_PER_ENTRY) {
        return makeError(i + 1, raw, 'AMOUNT_EXCEEDS_LIMIT', `金額超過單筆上限 ${MAX_PER_ENTRY}`, { max: MAX_PER_ENTRY });
      }
    }
    entries.push({ name: namePart, amt });
  }
  // 合計：若有 BigInt 則使用 BigInt 合計
  const hasBig = entries.some(e => typeof e.amt === 'bigint');
  let inputSum;
  if (hasBig) {
    inputSum = entries.reduce((s, e) => {
      const val = (typeof e.amt === 'bigint') ? e.amt : BigInt(Math.round(Number(e.amt) || 0));
      return (typeof s === 'bigint') ? s + val : BigInt(s) + val;
    }, BigInt(0));
  } else {
    inputSum = entries.reduce((s, e) => s + Number(e.amt || 0), 0);
  }
  return { entries, inputSum, error: null };
}
