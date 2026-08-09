// src/bank.js
// 計算銀行領款總表的輔助模組
// Export: computeBankTotals(people, denominations)
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
 * 計算銀行領款總表
 * 
 * 將每個人的金額進行面額拆解，並聚合成銀行領款清單。
 * 
 * 流程：
 * 1. 對每個人的金額進行面額拆解
 * 2. 聚合所有人的面額需求
 * 3. 回傳個人明細與銀行總計
 * 
 * @param {PersonTotal[]} people - 人員陣列，每個元素包含 name 和 total
 * @param {number[]} [denominations=[1000,500,100,50,10,5,1]] - 面額陣列（由大到小）
 * @returns {BankTotalsResult} 銀行領款總表結果物件
 * 
 * @example
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
