import assert from 'assert';
import { parseInput } from '../src/parser.js';
import { aggregateEntries } from '../src/aggregator.js';
import {
  getCurrencyProfile,
  getCurrencyDenominations,
  scaleAmount,
  descaleAmount,
  detectCurrencySymbolMismatch,
  stripAllowedCurrencySymbols
} from '../src/currency.js';
import {
  setLanguage as setI18nLanguage,
  getLanguage as getI18nLanguage,
  t,
  dictionaries
} from '../src/i18n.js';
import { buildCurrencyAwareCopy, getCurrencyExamples } from '../src/currency-examples.js';
import { localizeBankError, localizeParseError, localizeValidationError } from '../src/error-messages.js';
import {
  loadDenomConfig,
  saveDenomConfig,
  getActiveDenominations,
  setActiveDenominations,
  toggleSaveAsDefault,
  getCurrentConfig,
  setCurrentCurrency,
  getCurrentCurrency,
  setLanguage as setConfigLanguage,
  getLanguage as getConfigLanguage,
  setCustomDenomEnabled,
  isCustomDenomEnabled,
  resetToDefaults
} from '../src/denomination-config.js';

function toComparableBig(v){
  if (typeof v === 'bigint') return v;
  return BigInt(Math.round(Number(v) || 0));
}

globalThis.localStorage = {
  _store: new Map(),
  getItem(key) {
    return this._store.has(key) ? this._store.get(key) : null;
  },
  setItem(key, value) {
    this._store.set(key, String(value));
  },
  removeItem(key) {
    this._store.delete(key);
  },
  clear() {
    this._store.clear();
  }
};
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

// 1. thousand separators and matching currency symbols
testParse('千分位與台幣符號', '王小明,$1,200\n張三,3200', {
  inputSum: 4400,
  entries: [ { name: '王小明', amt: 1200 }, { name: '張三', amt: 3200 } ]
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

// 10. 純金額模式 - 含千分位與當前幣別符號
const resPureWithComma = parseInput('$1,200\n$2,500', false);
assert(!resPureWithComma.error, '純金額模式應支援千分位與當前幣別符號');
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

console.log('Running multi-currency scaling tests...');

const usdProfile = getCurrencyProfile('USD');
assert.strictEqual(usdProfile.code, 'USD');
assert.strictEqual(usdProfile.decimals, 2);
assert.deepStrictEqual(
  getCurrencyDenominations('USD'),
  [100, 50, 20, 10, 5, 2, 1, 0.5, 0.25, 0.1, 0.05, 0.01],
  'USD 預設面額應包含紙鈔與硬幣'
);
assert.strictEqual(scaleAmount('120.50', 'USD').toString(), '12050');
assert.strictEqual(descaleAmount(12050n, 'USD'), 120.5);

const usdParsed = parseInput('Alice,120.50\nBob,$45.25', true, { currencyCode: 'USD' });
assert(!usdParsed.error, `USD parsing should succeed: ${usdParsed.error && usdParsed.error.message}`);
assert.strictEqual(usdParsed.inputSum.toString(), '16575');
assert.deepStrictEqual(
  usdParsed.entries.map((entry) => ({ name: entry.name, amt: entry.amt.toString() })),
  [
    { name: 'Alice', amt: '12050' },
    { name: 'Bob', amt: '4525' }
  ],
  'USD parsing should scale to cents'
);

const usdTooPrecise = parseInput('Alice,12.345', true, { currencyCode: 'USD' });
assert(usdTooPrecise.error, '超過貨幣允許小數位數應回傳錯誤');

const eurSymbolMismatch = parseInput('Alice,฿120.50\nBob,$999.76', true, { currencyCode: 'EUR' });
assert(eurSymbolMismatch.error, 'EUR 模式應拒絕非歐元符號');
assert.strictEqual(eurSymbolMismatch.error.line, 1, '應在第一個錯誤符號行失敗');

const eurAllowedSymbol = parseInput('Alice,€120.50\nBob,999.76', true, { currencyCode: 'EUR' });
assert(!eurAllowedSymbol.error, 'EUR 模式應接受歐元符號與無符號輸入');

assert.strictEqual(detectCurrencySymbolMismatch('฿120.50', 'EUR'), '฿');
assert.strictEqual(detectCurrencySymbolMismatch('$999.76', 'EUR'), '$');
assert.strictEqual(detectCurrencySymbolMismatch('NT$32,000', 'TWD'), null);
assert.strictEqual(stripAllowedCurrencySymbols('NT$32,000', 'TWD'), '32,000');
assert.strictEqual(stripAllowedCurrencySymbols('€120.50', 'EUR'), '120.50');

const usdDenoms = getCurrencyDenominations('USD');
const usdAmount = scaleAmount('120.86', 'USD');
const usdBreakdown = breakdownAmount(usdAmount, usdDenoms, { currencyCode: 'USD' });
assert.strictEqual(usdBreakdown.remainder.toString(), '0', 'USD 拆解不應有殘額');
assert.strictEqual(usdBreakdown.breakdown[100], 1, '應有一張 100 美元');
assert.strictEqual(usdBreakdown.breakdown[20], 1, '應有一張 20 美元');
assert.strictEqual(usdBreakdown.breakdown[0.5], 1, '應有一枚 50 cent');
assert.strictEqual(usdBreakdown.breakdown[0.25], 1, '應有一枚 quarter');
assert.strictEqual(usdBreakdown.breakdown[0.1], 1, '應有一枚 dime');
assert.strictEqual(usdBreakdown.breakdown[0.01], 1, '應有一枚 penny');

const usdAgg = aggregateBreakdowns([usdBreakdown.breakdown], usdDenoms, { currencyCode: 'USD' });
assert.strictEqual(usdAgg.totalAmount.toString(), '12086', 'USD 聚合總額應以 cents 回傳');

const usdPeople = [
  { name: 'Alice', total: scaleAmount('120.50', 'USD') },
  { name: 'Bob', total: scaleAmount('45.25', 'USD') }
];
const usdBank = computeBankTotals(usdPeople, usdDenoms, { currencyCode: 'USD' });
assert.strictEqual(usdBank.totalAmount.toString(), '16575', 'USD 銀行總額應以 cents 對帳');
assert.strictEqual(verifyDoubleEntry(usdParsed.inputSum, usdBank.totalAmount), true, 'USD 對帳應通過');

const jpyProfile = getCurrencyProfile('JPY');
assert.strictEqual(jpyProfile.decimals, 0, 'JPY 應為 0 位小數');
assert.deepStrictEqual(
  getCurrencyDenominations('JPY'),
  [10000, 5000, 2000, 1000, 500, 100, 50, 10, 5, 1],
  'JPY 預設面額應正確'
);

const krwProfile = getCurrencyProfile('KRW');
assert.strictEqual(krwProfile.decimals, 0, 'KRW 應為 0 位小數');
assert.deepStrictEqual(
  getCurrencyDenominations('KRW'),
  [50000, 10000, 5000, 1000, 500, 100, 50, 10],
  'KRW 預設面額應正確'
);

const cnyProfile = getCurrencyProfile('CNY');
assert.strictEqual(cnyProfile.decimals, 2, 'CNY 應為 2 位小數');
assert.deepStrictEqual(
  getCurrencyDenominations('CNY'),
  [100, 50, 20, 10, 5, 1, 0.5, 0.1],
  'CNY 面額應去除重複的 1 元'
);
assert.strictEqual(scaleAmount('120.50', 'CNY').toString(), '12050');

const hkdProfile = getCurrencyProfile('HKD');
assert.strictEqual(hkdProfile.decimals, 2, 'HKD 應為 2 位小數');
assert.deepStrictEqual(
  getCurrencyDenominations('HKD'),
  [1000, 500, 100, 50, 20, 10, 5, 2, 1, 0.5, 0.2, 0.1],
  'HKD 面額應去除重複的 10 元'
);
assert.strictEqual(detectCurrencySymbolMismatch('HK$999.10', 'HKD'), null);
assert.strictEqual(detectCurrencySymbolMismatch('HK$999.10', 'USD'), 'HK$');
assert.strictEqual(stripAllowedCurrencySymbols('HK$999.10', 'HKD'), '999.10');
const hkdParsed = parseInput('Alex,HK$999.10\nMay,120.50', true, { currencyCode: 'HKD' });
assert(!hkdParsed.error, 'HKD 應接受 HK$ 與無符號輸入');

const krwParsed = parseInput('Minsu,₩45,800\nSujin,32000', true, { currencyCode: 'KRW' });
assert(!krwParsed.error, 'KRW 應接受 ₩ 與無符號輸入');
assert.strictEqual(krwParsed.inputSum.toString(), '77800');

console.log('Multi-currency scaling tests passed.');

console.log('Running i18n tests...');
assert.strictEqual(getI18nLanguage(), 'zh-TW');
assert.strictEqual(dictionaries['zh-TW'].appTitle, '幫你算兌 Money Snap - 兌幣計算機');
assert.strictEqual(dictionaries['en-US'].calculate, 'Calculate');
assert.strictEqual(t('appTitle'), '幫你算兌 Money Snap - 兌幣計算機');
setI18nLanguage('en-US');
assert.strictEqual(getI18nLanguage(), 'en-US');
assert.strictEqual(t('calculate'), 'Calculate');
assert.strictEqual(t('importCsvSuccess', { count: 3 }), '✓ Imported 3 rows successfully');
const englishParseError = parseInput('Alice,฿120.50', true, { currencyCode: 'EUR' }).error;
assert(englishParseError, '應產生 parser error');
assert.strictEqual(
  localizeParseError(englishParseError, 'en-US'),
  'Currency symbol does not match the selected EUR'
);
try {
  verifyDoubleEntry(1000n, 995n);
  throw new Error('expected mismatch');
} catch (error) {
  assert.strictEqual(error.code, 'DOUBLE_ENTRY_MISMATCH');
  assert(localizeBankError(error, 'en-US').includes('Critical finance warning'), '銀行驗證錯誤應可英文化');
}
assert.strictEqual(
  localizeValidationError('TOTAL_LIMIT', { max: 9999999999 }, 'en-US'),
  'Validation error: total amount exceeds the limit of 9999999999'
);
setI18nLanguage('zh-TW');
console.log('i18n tests passed.');

console.log('Running currency-aware copy tests...');
const twdCopy = buildCurrencyAwareCopy('TWD', 'zh-TW', true);
assert(twdCopy.csvHintLine1.includes('18500'), 'TWD tip 應包含整數示例');
assert(twdCopy.csvHintLine1.includes('45,800'), 'TWD tip 應包含千分位示例');
assert(twdCopy.csvHintLine1.includes('NT$32,000'), 'TWD tip 應包含 TWD 貨幣符號示例');
assert(!twdCopy.csvHintLine1.includes('選填'), '姓名欄位提示不應再標示選填');
assert(twdCopy.csvHintLine1.includes('姓名（必填'), '勾選姓名模式時應明確標示姓名必填');
assert(twdCopy.placeholderNamed.includes('張三,18500'), 'TWD named placeholder 應符合台幣格式');
assert(twdCopy.placeholderUnnamed.includes('NT$32,000'), 'TWD unnamed placeholder 應包含台幣符號');

const usdCopy = buildCurrencyAwareCopy('USD', 'en-US', true);
assert(usdCopy.csvHintLine1.includes('120.50'), 'USD tip 應包含純數字示例');
assert(usdCopy.csvHintLine1.includes('1,245.75'), 'USD tip 應包含千分位示例');
assert(usdCopy.csvHintLine1.includes('$999.99'), 'USD tip 應包含美元符號示例');
assert(!usdCopy.csvHintLine1.includes('optional'), 'English hint should not say optional');
assert(usdCopy.csvHintLine1.includes('Name (required'), 'Checked name mode should say name is required');
assert(usdCopy.modeHintNamed.includes('Alice,120.50'), 'USD named mode hint 應顯示純數字美元範例');
assert(usdCopy.placeholderUnnamed.includes('$999.99'), 'USD unnamed placeholder 應顯示美元符號示例');

const usdAmountOnlyCopy = buildCurrencyAwareCopy('USD', 'en-US', false);
assert(!usdAmountOnlyCopy.csvHintLine1.includes('Column 1: Name'), 'Amount-only mode should not mention name column');
assert(usdAmountOnlyCopy.csvHintLine1.includes('Amount only mode'), 'Amount-only mode should explain amount-only input');

const jpyExamples = getCurrencyExamples('JPY', 'en-US');
assert.strictEqual(jpyExamples.namedRows[0][1], '45800', 'JPY 範例應提供純數字格式');
assert.strictEqual(jpyExamples.namedRows[1][1], '32,000', 'JPY 範例應提供千分位格式');
assert.strictEqual(jpyExamples.namedRows[2][1], '¥18,500', 'JPY 範例應提供符號格式');

const krwCopy = buildCurrencyAwareCopy('KRW', 'en-US', true);
assert(krwCopy.csvHintLine1.includes('₩18,500'), 'KRW tip 應包含韓元符號示例');

const cnyCopy = buildCurrencyAwareCopy('CNY', 'zh-TW', true);
assert(cnyCopy.csvHintLine1.includes('120.50'), 'CNY tip 應包含純數字示例');
assert(cnyCopy.csvHintLine1.includes('1,245.75'), 'CNY tip 應包含千分位示例');
assert(cnyCopy.csvHintLine1.includes('¥999.10'), 'CNY tip 應包含人民幣符號示例');

const hkdCopy = buildCurrencyAwareCopy('HKD', 'en-US', false);
assert(hkdCopy.csvHintLine1.includes('HK$999.10'), 'HKD 純金額模式應包含港幣符號示例');

const eurCopy = buildCurrencyAwareCopy('EUR', 'en-US', true);
assert(eurCopy.csvHintLine1.includes('120.50'), 'EUR tip 應包含純數字示例');
assert(eurCopy.csvHintLine1.includes('1,245.75'), 'EUR tip 應包含千分位示例');
assert(eurCopy.csvHintLine1.includes('€999.76'), 'EUR tip 應包含歐元符號示例');
console.log('Currency-aware copy tests passed.');

console.log('Running multi-currency config tests...');
localStorage.clear();
resetToDefaults();
loadDenomConfig();
assert.strictEqual(getCurrentCurrency(), 'TWD');
assert.strictEqual(getConfigLanguage(), 'zh-TW');
assert.deepStrictEqual(getActiveDenominations(), [1000, 500, 100, 50, 10, 5, 1]);

setCurrentCurrency('USD');
assert.strictEqual(getCurrentCurrency(), 'USD');
assert.deepStrictEqual(getActiveDenominations(), [100, 50, 20, 10, 5, 1, 0.25, 0.1, 0.05, 0.01]);
assert.strictEqual(isCustomDenomEnabled(), false);

setCurrentCurrency('HKD');
assert.deepStrictEqual(getActiveDenominations(), [1000, 500, 100, 50, 20, 10, 5, 2, 1, 0.5, 0.2, 0.1], 'HKD 預設啟用面額應正確');

setCurrentCurrency('CNY');
assert.deepStrictEqual(getActiveDenominations(), [100, 50, 20, 10, 5, 1, 0.5, 0.1], 'CNY 預設啟用面額應正確');

setCurrentCurrency('KRW');
assert.deepStrictEqual(getActiveDenominations(), [50000, 10000, 5000, 1000, 500, 100, 50, 10], 'KRW 預設啟用面額應正確');

setCurrentCurrency('USD');
setCustomDenomEnabled(true);
setActiveDenominations([100, 20, 10, 1, 0.25, 0.1, 0.05, 0.01]);
assert.strictEqual(isCustomDenomEnabled(), true);
assert.deepStrictEqual(getActiveDenominations(), [100, 20, 10, 1, 0.25, 0.1, 0.05, 0.01]);

setConfigLanguage('en-US');
toggleSaveAsDefault(true);
assert.strictEqual(getCurrentConfig().saveAsDefault, true);

setCurrentCurrency('TWD');
assert.deepStrictEqual(getActiveDenominations(), [1000, 500, 100, 50, 10, 5, 1], '切回 TWD 應保留 TWD 預設');

loadDenomConfig();
setCurrentCurrency('USD');
assert.strictEqual(getConfigLanguage(), 'en-US', '應從 localStorage 還原語系');
assert.strictEqual(isCustomDenomEnabled(), true, '應從 localStorage 還原自訂開關');
assert.deepStrictEqual(
  getActiveDenominations(),
  [100, 20, 10, 1, 0.25, 0.1, 0.05, 0.01],
  '應從 localStorage 還原各幣別啟用面額'
);

saveDenomConfig({
  language: 'zh-TW',
  currency: 'EUR',
  saveAsDefault: false,
  currencies: {
    EUR: {
      isCustomEnabled: true,
      activeDenominations: [200, 100, 50, 20, 10, 5, 2, 1]
    }
  }
});
assert.strictEqual(localStorage.getItem('money_snap_multi_currency_config_v5'), null, 'saveAsDefault=false 不應寫入 localStorage');
console.log('Multi-currency config tests passed.');

// ===== v0.4.0: Custom Denomination Configuration Tests =====
console.log('Running v0.4.0 denomination config tests...');
import { verifyDoubleEntry } from '../src/bank.js';

// Test Case 1: 銀行 50 元硬幣短缺情境（取消 50 元）
console.log('  Test 1: 銀行 50 元硬幣短缺情境...');
const customDenom1 = [1000, 500, 100, 10, 5, 1]; // 取消 50 元
const bd1 = breakdownAmount(185, customDenom1);
assert.strictEqual(bd1.breakdown[100], 1, '應使用 1 張 100 元');
assert.strictEqual(bd1.breakdown[10], 8, '應使用 8 個 10 元（原本 50 元×1 + 10 元×3 改為 10 元×8）');
assert.strictEqual(bd1.breakdown[5], 1, '應使用 1 個 5 元');
assert.strictEqual(bd1.breakdown[50], undefined, '不應包含 50 元');
const total1 = 100 * 1 + 10 * 8 + 5 * 1;
assert.strictEqual(total1, 185, '總和應為 185 元');
console.log('  ✓ Test 1 passed');

// Test Case 2: 排除 2000/200 元鈔票情境
console.log('  Test 2: 排除 2000/200 元鈔票情境...');
const customDenom2 = [1000, 500, 100, 50, 10, 5, 1]; // 取消 2000 與 200
const bd2 = breakdownAmount(4400, customDenom2);
assert.strictEqual(bd2.breakdown[1000], 4, '應使用 4 張 1000 元（不使用 2000 元）');
assert.strictEqual(bd2.breakdown[100], 4, '應使用 4 張 100 元（不使用 200 元）');
assert.strictEqual(bd2.breakdown[2000], undefined, '不應包含 2000 元');
assert.strictEqual(bd2.breakdown[200], undefined, '不應包含 200 元');
const total2 = 1000 * 4 + 100 * 4;
assert.strictEqual(total2, 4400, '總和應為 4400 元');
console.log('  ✓ Test 2 passed');

// Test Case 3: 彈性面額拆解（排除多種面額）
console.log('  Test 3: 彈性面額拆解（排除多種面額）...');
const customDenom3 = [1000, 100, 10, 1]; // 僅保留 4 種面額
const bd3 = breakdownAmount(1366, customDenom3);
assert.strictEqual(bd3.breakdown[1000], 1, '應使用 1 張 1000 元');
assert.strictEqual(bd3.breakdown[100], 3, '應使用 3 張 100 元');
assert.strictEqual(bd3.breakdown[10], 6, '應使用 6 個 10 元');
assert.strictEqual(bd3.breakdown[1], 6, '應使用 6 個 1 元');
const total3 = 1000 * 1 + 100 * 3 + 10 * 6 + 1 * 6;
assert.strictEqual(total3, 1366, '總和應為 1366 元');
console.log('  ✓ Test 3 passed');

// Test Case 4: 防呆檢查 - 空陣列應拋出錯誤
console.log('  Test 4: 防呆檢查 - 空陣列應拋出錯誤...');
try {
  breakdownAmount(100, []);
  throw new Error('空陣列應拋出錯誤');
} catch (e) {
  assert.strictEqual(e.message.includes('請至少選擇一種有效面額'), true, '錯誤訊息應包含提示');
}
console.log('  ✓ Test 4 passed');

// Test Case 5: 殘額檢查 - 無 1 元導致殘額
console.log('  Test 5: 殘額檢查 - 無 1 元導致殘額...');
const customDenom5 = [1000, 100, 10]; // 無 1 元
const bd5 = breakdownAmount(1366, customDenom5);
assert(bd5.remainder > 0, '應有殘額（無法完全拆解）');
assert.strictEqual(bd5.remainder, 6, '殘額應為 6 元');
console.log('  ✓ Test 5 passed');

// Test Case 6: 雙重對帳驗證 - 成功情境
console.log('  Test 6: 雙重對帳驗證 - 成功情境...');
const result6 = verifyDoubleEntry(1000n, 1000n);
assert.strictEqual(result6, true, '相同金額應驗證通過');
console.log('  ✓ Test 6 passed');

// Test Case 7: 雙重對帳驗證 - 失敗情境
console.log('  Test 7: 雙重對帳驗證 - 失敗情境...');
try {
  verifyDoubleEntry(1000n, 995n);
  throw new Error('金額不符應拋出錯誤');
} catch (e) {
  assert(e.message.includes('財務嚴重警告'), '錯誤訊息應包含財務警告');
  assert(e.message.includes('差額'), '錯誤訊息應包含差額資訊');
}
console.log('  ✓ Test 7 passed');

// Test Case 8: computeBankTotals 使用彈性面額
console.log('  Test 8: computeBankTotals 使用彈性面額...');
const customDenom8 = [1000, 500, 100, 10, 5, 1]; // 排除 50 元
const people8 = [ { name: '張三', total: 185 } ];
const bank8 = computeBankTotals(people8, customDenom8);
assert.strictEqual(bank8.totals[100], 1, '應使用 1 張 100 元');
assert.strictEqual(bank8.totals[10], 8, '應使用 8 個 10 元');
assert.strictEqual(bank8.totals[5], 1, '應使用 1 個 5 元');
assert.strictEqual(bank8.totals[50], undefined, '50 元不在啟用面額中，應為 undefined');
assert.strictEqual(Number(bank8.totalAmount), 185, '總金額應為 185 元');
console.log('  ✓ Test 8 passed');

// Test Case 9: aggregateBreakdowns 使用彈性面額
console.log('  Test 9: aggregateBreakdowns 使用彈性面額...');
const customDenom9 = [1000, 100, 10, 1];
const bd9a = breakdownAmount(1200, customDenom9);
const bd9b = breakdownAmount(300, customDenom9);
const agg9 = aggregateBreakdowns([bd9a.breakdown, bd9b.breakdown], customDenom9);
assert.strictEqual(agg9.totals[1000], 1, '總計應有 1 張 1000 元');
assert.strictEqual(agg9.totals[100], 5, '總計應有 5 張 100 元');
assert.strictEqual(Number(agg9.totalAmount), 1500, '總金額應為 1500 元');
console.log('  ✓ Test 9 passed');

console.log('v0.4.0 denomination config tests passed.');

console.log('All tests passed.');
