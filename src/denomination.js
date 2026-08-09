// src/denomination.js
// 面額拆解模組
// Export:
// - breakdownAmount(amount, denominations) -> { breakdown: {denom: count}, remainder }
// - aggregateBreakdowns(breakdowns) -> { totals: {denom: totalCount}, totalAmount }

/**
 * @typedef {1000|500|100|50|10|5|1} Denomination
 * 合法的面額值（新台幣）
 */

/**
 * @typedef {Object.<number, number>} BreakdownMap
 * 面額拆解結果的對應表，key 為面額（1000/500/100/50/10/5/1），value 為張數/個數
 */

/**
 * @typedef {Object} BreakdownResult
 * @property {BreakdownMap} breakdown - 各面額的張數/個數
 * @property {number|bigint} remainder - 剩餘金額（應為 0，若非零則表示拆解不完全）
 */

/**
 * @typedef {Object} AggregateBreakdownResult
 * @property {BreakdownMap} totals - 所有人員的面額總計
 * @property {bigint} totalAmount - 總金額（使用 BigInt 確保精度）
 */

/**
 * 將金額拆解為面額組合
 * 
 * 使用貪婪演算法，從最大面額開始依序拆解。
 * 支援 BigInt（大額整數）和 Number（小數）兩種型別。
 * 
 * @param {number|bigint} amount - 待拆解的金額
 * @param {number[]} [denominations=[1000,500,100,50,10,5,1]] - 面額陣列（由大到小）
 * @returns {BreakdownResult} 拆解結果物件
 * 
 * @example
 * breakdownAmount(1350)
 * // => { breakdown: {1000:1, 500:0, 100:3, 50:1, 10:0, 5:0, 1:0}, remainder:0 }
 * 
 * @example
 * breakdownAmount(77800n)
 * // => { breakdown: {1000:77, 500:1, 100:3, 50:0, 10:0, 5:0, 1:0}, remainder:0n }
 */
export function breakdownAmount(amount, denominations = [1000,500,100,50,10,5,1]){
  const breakdown = {};
  // support BigInt and Number
  const isBig = (typeof amount === 'bigint');
  if (isBig) {
    let remainder = amount;
    const denoms = denominations.map(d => BigInt(d));
    for (const d of denoms) {
      const count = remainder / d;
      breakdown[Number(d)] = Number(count);
      remainder = remainder % d;
    }
    return { breakdown, remainder };
  } else {
    let remainder = Math.round(Number(amount) || 0);
    for (const d of denominations){
      const count = Math.floor(remainder / d);
      breakdown[d] = count;
      remainder = remainder % d;
    }
    return { breakdown, remainder };
  }
}

/**
 * 聚合多個面額拆解結果
 * 
 * 將多人的面額拆解結果加總，計算銀行領款總需求。
 * 回傳值的 totalAmount 使用 BigInt 以確保大額金額的精度。
 * 
 * @param {BreakdownMap[]} listOfBreakdowns - 面額拆解結果陣列
 * @param {number[]} [denominations=[1000,500,100,50,10,5,1]] - 面額陣列
 * @returns {AggregateBreakdownResult} 聚合結果物件
 * 
 * @example
 * aggregateBreakdowns([
 *   {1000:1, 500:0, 100:2, 50:0, 10:0, 5:0, 1:0},
 *   {1000:0, 500:1, 100:0, 50:1, 10:0, 5:0, 1:0}
 * ])
 * // => {
 * //   totals: {1000:1, 500:1, 100:2, 50:1, 10:0, 5:0, 1:0},
 * //   totalAmount: 1750n
 * // }
 */
export function aggregateBreakdowns(listOfBreakdowns, denominations = [1000,500,100,50,10,5,1]){
  const totals = {};
  for (const d of denominations) totals[d] = 0;
  // compute totalAmount as BigInt to be safe for very large sums
  let totalAmount = BigInt(0);
  for (const bd of listOfBreakdowns){
    for (const d of denominations){
      const c = bd[d] || 0;
      totals[d] += c;
      totalAmount += BigInt(c) * BigInt(d);
    }
  }
  return { totals, totalAmount };
}
