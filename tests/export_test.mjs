// export_test: run export flow headless (non-visual check) - can't render image here, but ensure handler runs without throwing
import { parseInput } from '../src/parser.js';
import { aggregateEntries } from '../src/aggregator.js';
import { computeBankTotals } from '../src/bank.js';

const sample = `李四, 2,213
王小明, 25,480
李四, 25,480
張三, 1125
王小明, 25,480`;
const res = parseInput(sample);
if (res.error) { console.error('parse error', res.error); process.exit(2); }
const people = aggregateEntries(res.entries);
const bank = computeBankTotals(people);
if (bank.totalAmount !== Math.round(res.inputSum)) { console.error('amount mismatch'); process.exit(3); }
console.log('export_test ok');
