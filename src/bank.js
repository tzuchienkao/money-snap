// src/bank.js
// 計算銀行領款總表的輔助模組
// Export: computeBankTotals(people, denominations)
// people: [{ name, total }]
// returns: { perPerson: [{ name, total, breakdown }], totals: {denom:count}, totalAmount }

import { breakdownAmount, aggregateBreakdowns } from './denomination.js';

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
