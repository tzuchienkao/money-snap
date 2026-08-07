import assert from 'assert';
import { parseInput } from '../src/parser.js';
import { aggregateEntries } from '../src/aggregator.js';

function toComparableBig(v){
  if (typeof v === 'bigint') return v;
  return BigInt(Math.round(Number(v) || 0));
}
function testParse(description, input, expected, hasNameFlag = true) {
  const res = parseInput(input, hasNameFlag);
  if (expected.error) {
    assert(res.error, `${description} expected error`);
    assert.strictEqual(res.error.line, expected.error.line);
  } else {
    assert(!res.error, `${description} unexpected error ${res.error && res.error.message}`);
    assert.strictEqual(toComparableBig(res.inputSum).toString(), toComparableBig(expected.inputSum).toString());
    // normalize amounts to string for comparison to handle BigInt
    const a = res.entries.map(e=>({name:e.name, amt: (typeof e.amt === 'bigint')? e.amt.toString() : String(e.amt)}));
    const b = expected.entries.map(e=>({name:e.name, amt: String(e.amt)}));
    assert.deepStrictEqual(a, b);
  }
}

function testAggregate(description, entries, expected) {
  const out = aggregateEntries(entries);
  // sort by name for deterministic compare; compare totals as strings to handle BigInt
  const a = out.map(o=>({name:o.name, total: (typeof o.total === 'bigint')? o.total.toString() : String(o.total)})).sort((x,y)=>x.name.localeCompare(y.name));
  const b = expected.map(o=>({name:o.name, total:String(o.total)})).sort((x,y)=>x.name.localeCompare(y.name));
  assert.deepStrictEqual(a,b, description);
}

// Tests
console.log('Running parser tests...');

// 1. thousand separators and currency symbols
testParse('千分位與貨幣符號', '王小明,$1,200\n張三,¥300', {
  inputSum: 1500,
  entries: [ { name: '王小明', amt: 1200 }, { name: '張三', amt: 300 } ]
});

// 2. fullwidth comma and space
testParse('全形逗號與空白', '李四， 2,000\n\n  ', {
  inputSum: 2000,
  entries: [ { name: '李四', amt: 2000 } ]
});

// 3. tab separated
testParse('Tab 分隔', 'A\t100\nB\t200', { inputSum: 300, entries: [ {name:'A', amt:100}, {name:'B', amt:200} ] });

// 4. missing field -> error line
const resMissing = parseInput('OnlyName\nB,100');
assert(resMissing.error && resMissing.error.line === 1, '缺欄位應回傳第1行錯誤');

// 5. invalid amount
const resInvalid = parseInput('X,12a0');
assert(resInvalid.error && resInvalid.error.line === 1, '金額格式錯誤應回傳第1行');

// 6. entry count limit
import { MAX_ENTRIES, MAX_PER_ENTRY } from '../src/config.js';
const many = Array.from({length: MAX_ENTRIES + 1}, (_,i)=>`N${i},1`).join('\n');
const resTooMany = parseInput(many);
assert(resTooMany.error && /超過上限/.test(resTooMany.error.message), '超過筆數應回傳錯誤');

// 7. per-entry amount limit
const bigAmt = `A,${MAX_PER_ENTRY + 1}`;
const resBig = parseInput(bigAmt);
assert(resBig.error && /超過單筆上限/.test(resBig.error.message), '超過單筆金額應回傳錯誤');

console.log('Parser tests passed.');

// ===== 雙模式測試 =====
console.log('Running dual-mode parser tests...');

// 8. 純金額模式 - 單行
testParse('純金額模式 - 單行', '45800', {
  inputSum: 45800,
  entries: [ { name: '項目 #1', amt: 45800 } ]
}, false);

// 9. 純金額模式 - 多行
const pureAmountInput = '45800\n32000\n18500';
const resPureAmount = parseInput(pureAmountInput, false);
assert(!resPureAmount.error, '純金額模式多行應成功');
assert.strictEqual(toComparableBig(resPureAmount.inputSum).toString(), '96300');
assert.strictEqual(resPureAmount.entries.length, 3);
assert.strictEqual(resPureAmount.entries[0].name, '項目 #1');
assert.strictEqual(resPureAmount.entries[1].name, '項目 #2');
assert.strictEqual(resPureAmount.entries[2].name, '項目 #3');

// 10. 純金額模式 - 含千分位與貨幣符號
const resPureWithComma = parseInput('$1,200\n¥2,500', false);
assert(!resPureWithComma.error, '純金額模式應支援千分位與貨幣符號');
assert.strictEqual(toComparableBig(resPureWithComma.inputSum).toString(), '3700');
assert.strictEqual(resPureWithComma.entries[0].name, '項目 #1');
assert.strictEqual(resPureWithComma.entries[1].name, '項目 #2');

// 11. 純金額模式 - 負數
const resPureNegative = parseInput('-100\n200', false);
assert(!resPureNegative.error, '純金額模式應支援負數');
assert.strictEqual(toComparableBig(resPureNegative.inputSum).toString(), '100');

// 12. 純金額模式 - 小數
const resPureDecimal = parseInput('123.45\n678.90', false);
assert(!resPureDecimal.error, '純金額模式應支援小數');
assert.strictEqual(Math.round(Number(resPureDecimal.inputSum)), 802);

// 13. 純金額模式 - 錯誤格式（含文字）
const resPureError = parseInput('100\nabc\n200', false);
assert(resPureError.error, '純金額模式遇到非數字應回傳錯誤');
assert.strictEqual(resPureError.error.line, 2, '錯誤行應為第2行');

// 14. 純金額模式 - 空行過濾
const resPureEmptyLines = parseInput('100\n\n200\n  \n300', false);
assert(!resPureEmptyLines.error, '純金額模式應過濾空行');
assert.strictEqual(resPureEmptyLines.entries.length, 3);
assert.strictEqual(resPureEmptyLines.entries[0].name, '項目 #1');
assert.strictEqual(resPureEmptyLines.entries[2].name, '項目 #3');

// 15. 含姓名模式仍正常運作（確保向下相容）
const resNameMode = parseInput('王小明,1200\n張三,300', true);
assert(!resNameMode.error, '含姓名模式應正常運作');
assert.strictEqual(resNameMode.entries[0].name, '王小明');
assert.strictEqual(resNameMode.entries[1].name, '張三');

console.log('Dual-mode parser tests passed.');

console.log('Running aggregator tests...');

// aggregator - case insensitivity and trim
testAggregate('合併相同姓名', [ {name: 'Alice', amt:100}, {name:' alice ', amt:200}, {name:'ALICE', amt:50} ], [ {name:'Alice', total:350} ]);

// normalization: full-width and extra spaces
testAggregate('姓名正規化（全形與空白）', [ {name: 'Ａlice ', amt:100}, {name:' alice', amt:50}, {name:' Alice  B ', amt:200} ], [ {name:'Alice', total:150}, {name:'Alice B', total:200} ]);

console.log('Aggregator tests passed.');

console.log('Running denomination tests...');
import { breakdownAmount, aggregateBreakdowns } from '../src/denomination.js';
import { computeBankTotals } from '../src/bank.js';

const bd = breakdownAmount(1366);
// remainder may be number or BigInt
if ((typeof bd.remainder === 'bigint' ? bd.remainder !== BigInt(0) : bd.remainder !== 0)) throw new Error('remainder should be 0');
const expected = {1000:1,500:0,100:3,50:1,10:1,5:1,1:1};
for (const d of [1000,500,100,50,10,5,1]){
  if (bd.breakdown[d] !== expected[d]) throw new Error(`denom ${d} mismatch`);
}

// aggregateBreakdowns
const agg = aggregateBreakdowns([bd.breakdown]);
if ((typeof agg.totalAmount === 'bigint' ? agg.totalAmount !== BigInt(1366) : agg.totalAmount !== 1366)) throw new Error('aggregate total mismatch');

// computeBankTotals
const people = [ { name: 'A', total: 1366 }, { name: 'B', total: 100 } ];
const bank = computeBankTotals(people);
if ((typeof bank.totalAmount === 'bigint' ? bank.totalAmount !== BigInt(1466) : bank.totalAmount !== 1466)) throw new Error('computeBankTotals total mismatch');
if (bank.totals[100] < 3) throw new Error('computeBankTotals incorrect totals');

console.log('Denomination tests passed.');

console.log('All tests passed.');
