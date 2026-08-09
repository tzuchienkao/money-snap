// src/bank.js
// 計算銀行領款總表的輔助模組
// Export: computeBankTotals(people, denominations), verifyDoubleEntry(inputSum, bankTotalAmount)
// people: [{ name, total }]
// returns: { perPerson: [{ name, total, breakdown }], totals: {denom:count}, totalAmount }

import { breakdownAmount, aggregateBreakdowns } from './denomination.js';

/**
 * @typedef {Object} PersonTotal
 * @property {string} name - 姓名
 * @property {number|bigint} total - 該人員的金額總計
 */

/**
 * @typedef {Object} PersonBreakdown
 * @property {string} name - 姓名
 * @property {number|bigint} total - 該人員的金額總計
 * @property {Object.<number, number>} breakdown - 該人員的面額拆解結果
 */

/**
 * @typedef {Object} BankTotalsResult
 * @property {PersonBreakdown[]} perPerson - 每個人的面額拆解明細
 * @property {Object.<number, number>} totals - 銀行領款總計（各面額張數）
 * @property {bigint} totalAmount - 總金額
 */

/**
 * 雙重對帳驗證函式（v0.4.0 新增）
 * 
 * 驗證輸入總額與面額拆解總額是否相符，確保財務數據正確性。
 * 這是防止面額設定錯誤（如缺少 1 元導致殘額）的最後防線。
 * 
 * @param {number|bigint} inputSum - 輸入的原始金額總和
 * @param {number|bigint} bankTotalAmount - 面額拆解後的總金額
 * @returns {boolean} 對帳是否通過
 * @throws {Error} 若對帳失敗，拋出包含差額資訊的錯誤
 * 
 * @example
 * verifyDoubleEntry(3125n, 3125n); // => true
 * verifyDoubleEntry(3125n, 3120n); // => 拋出錯誤：差額 5 元
 */
export function verifyDoubleEntry(inputSum, bankTotalAmount) {
  // 統一轉換為 BigInt 進行比較（確保精度）
  const inputBig = BigInt(inputSum);
  const bankBig = BigInt(bankTotalAmount);
  
  if (inputBig !== bankBig) {
    const diff = inputBig - bankBig;
    const diffAbs = diff < 0n ? -diff : diff;
    throw new Error(
      `【財務嚴重警告】輸入總額 ($${inputBig}) 與面額拆解總金額 ($${bankBig}) 不符！\n` +
      `差額：${diff > 0n ? '+' : ''}${diff} 元（${diff > 0n ? '多' : '少'} ${diffAbs} 元）\n` +
      `請確認是否漏選 1 元面額，或面額設定導致無法完全拆解。`
    );
  }
  
  return true;
}

/**
 * 計算銀行領款總表（v0.4.0 強化版）
 * 
 * 將每個人的金額進行面額拆解，並聚合成銀行領款清單。
 * 支援彈性面額陣列，可自訂啟用的面額組合。
 * 
 * 流程：
 * 1. 對每個人的金額進行面額拆解
 * 2. 聚合所有人的面額需求
 * 3. 回傳個人明細與銀行總計
 * 
 * @param {PersonTotal[]} people - 人員陣列，每個元素包含 name 和 total
 * @param {number[]} [denominations=[1000,500,100,50,10,5,1]] - 面額陣列（由大到小排序）
 * @returns {BankTotalsResult} 銀行領款總表結果物件
 * 
 * @example
 * // 標準計算
 * computeBankTotals([
 *   {name:"張三", total:1125n},
 *   {name:"王小明", total:2000n}
 * ])
 * // => {
 * //   perPerson: [
 * //     {name:"張三", total:1125n, breakdown:{1000:1,500:0,100:1,50:0,10:2,5:1,1:0}},
 * //     {name:"王小明", total:2000n, breakdown:{1000:2,500:0,100:0,50:0,10:0,5:0,1:0}}
 * //   ],
 * //   totals: {1000:3, 500:0, 100:1, 50:0, 10:2, 5:1, 1:0},
 * //   totalAmount: 3125n
 * // }
 * 
 * @example
 * // 彈性面額（排除 50 元硬幣）
 * computeBankTotals([
 *   {name:"張三", total:185n}
 * ], [1000, 500, 100, 10, 5, 1])
 * // => {
 * //   perPerson: [{name:"張三", total:185n, breakdown:{1000:0,500:0,100:1,10:8,5:1,1:0}}],
 * //   totals: {1000:0, 500:0, 100:1, 10:8, 5:1, 1:0},
 * //   totalAmount: 185n
 * // }
 */
export function computeBankTotals(people, denominations = [1000,500,100,50,10,5,1]){
  const perPerson = [];
  const breakdowns = [];
  for (const p of people){
    const { breakdown, remainder } = breakdownAmount(p.total, denominations);
    // remainder should be 0 for integer totals
    perPerson.push({ name: p.name, total: p.total, breakdown });
    breakdowns.push(breakdown);
  }
  const agg = aggregateBreakdowns(breakdowns, denominations);
  return { perPerson, totals: agg.totals, totalAmount: agg.totalAmount };
}
