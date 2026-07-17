import { parseInput } from '../src/parser.js';
import { aggregateEntries } from '../src/aggregator.js';
import { computeBankTotals } from '../src/bank.js';

const sample = `李四, 2,213
王小明, 25,480
李四, 25,480
張三, 1125
王小明, 25,480`;

console.log('Sample input:\n', sample);

const res = parseInput(sample);
if (res.error) {
  console.error('Parser error:', res.error);
  process.exit(2);
}
console.log('Parsed entries:', res.entries);
console.log('Input sum:', res.inputSum);

const people = aggregateEntries(res.entries);
console.log('Aggregated people:', people);

const bank = computeBankTotals(people);
console.log('Per-person breakdown:');
for (const p of bank.perPerson) {
  console.log(`- ${p.name}: ${p.total} ->`, p.breakdown);
}
console.log('Bank totals:', bank.totals);
console.log('Bank totalAmount:', bank.totalAmount);

function toComparableBig(v){
  if (typeof v === 'bigint') return v;
  return BigInt(Math.round(Number(v) || 0));
}
if (toComparableBig(res.inputSum) !== toComparableBig(bank.totalAmount)){
  console.error(`Mismatch: inputSum ${res.inputSum} != bankTotal ${bank.totalAmount}`);
  process.exit(3);
}
console.log('SUCCESS: inputSum equals bank totalAmount');
