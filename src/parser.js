// src/parser.js
// 提供輸入解析功能：支援雙模式解析（含姓名 / 純金額）、逗號與 Tab 分隔、多行、去除空白行、貨幣符號與千分位處理
// Export: parseInput(text, hasNameFlag) -> { entries: [{name, amt}], inputSum, error: {line, raw, message} | null }

import { MAX_ENTRIES, MAX_PER_ENTRY } from './config.js';

/**
 * 雙模式文本解析器
 * @param {string} text - 輸入框原始文字
 * @param {boolean} hasNameFlag - 是否包含姓名欄位（預設 true）
 * @returns {{entries: Array<{name: string, amt: number|bigint}>, inputSum: number|bigint, error: {line: number, raw: string, message: string}|null}}
 */
export function parseInput(text, hasNameFlag = true) {
  if (typeof text !== 'string') {
    return { entries: [], inputSum: 0, error: { line: 0, raw: '', message: '輸入非字串' } };
  }
  const rawLines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (rawLines.length > MAX_ENTRIES) {
    return { entries: [], inputSum: 0, error: { line: 0, raw: '', message: `輸入筆數超過上限 ${MAX_ENTRIES} 筆` } };
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
        return { entries: [], inputSum: 0, error: { line: i + 1, raw, message: '欄位數不足（需要姓名與金額）' } };
      }
      const idx = match.index;
      namePart = raw.slice(0, idx).trim();
      amtPart = raw.slice(idx + 1).trim();
      if (!namePart || !amtPart) {
        return { entries: [], inputSum: 0, error: { line: i + 1, raw, message: '欄位數不足（姓名或金額為空）' } };
      }
    } else {
      // 純金額模式：整行當作金額，姓名自動編號
      namePart = `項目 #${i + 1}`;
      amtPart = raw.trim();
      if (!amtPart) {
        return { entries: [], inputSum: 0, error: { line: i + 1, raw, message: '金額為空' } };
      }
    }

    // 金額容錯：移除貨幣符號、空白，保留千分位逗號以利後續清理
    let amtRaw = amtPart.replace(/[\$¥€￡¥]/g, '');
    // 移除千分位逗號（包含全形逗號）與空白
    amtRaw = amtRaw.replace(/[\,，\s]/g, '');

    // 允許負號與小數點
    if (!/^-?\d+(?:\.\d+)?$/.test(amtRaw)) {
      return { entries: [], inputSum: 0, error: { line: i + 1, raw, message: `金額格式錯誤：'${amtPart}'` } };
    }
    // 若為整數（無小數點），使用 BigInt 以避免大數精度問題；否則使用 Number
    let amt;
    if (/^-?\d+$/.test(amtRaw)) {
      try {
        amt = BigInt(amtRaw);
      } catch (e) {
        return { entries: [], inputSum: 0, error: { line: i + 1, raw, message: `金額過大或格式錯誤：'${amtPart}'` } };
      }
      // per-entry limit check
      const abs = (amt < 0n) ? -amt : amt;
      if (abs > BigInt(MAX_PER_ENTRY)) {
        return { entries: [], inputSum: 0, error: { line: i + 1, raw, message: `金額超過單筆上限 ${MAX_PER_ENTRY}` } };
      }
    } else {
      // 小數情況，保留為 Number（若需要更高精度可改為 cents-based BigInt）
      amt = Number(amtRaw);
      if (Number.isNaN(amt)) {
        return { entries: [], inputSum: 0, error: { line: i + 1, raw, message: `無法解析金額：'${amtPart}'` } };
      }
      if (Math.abs(Math.floor(amt)) > MAX_PER_ENTRY) {
        return { entries: [], inputSum: 0, error: { line: i + 1, raw, message: `金額超過單筆上限 ${MAX_PER_ENTRY}` } };
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
