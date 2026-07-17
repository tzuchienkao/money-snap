// src/denomination.js
// 面額拆解模組
// Export:
// - breakdownAmount(amount, denominations) -> { breakdown: {denom: count}, remainder }
// - aggregateBreakdowns(breakdowns) -> { totals: {denom: totalCount}, totalAmount }

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
