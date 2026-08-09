// src/aggregator.js
// 更完整的合併與加總模組
// 功能：
// - name normalization（全形轉半形、去除多餘空白、collapse spaces）
// - case-insensitive 合併
// - 保留第一次出現的姓名原樣作為輸出名稱
// - 回傳按姓名（大小寫不敏感）排序的陣列以確保 deterministic output

/**
 * @typedef {Object} InputEntry
 * @property {string} name - 姓名或項目名稱
 * @property {number|bigint} amt - 金額
 */

/**
 * @typedef {Object} AggregatedPerson
 * @property {string} name - 標準化後的姓名（保留首次出現的原樣）
 * @property {number|bigint} total - 該人員的金額總和
 */

/**
 * @typedef {Object} AggregateOptions
 * @property {boolean} [sort=true] - 是否按姓名排序（大小寫不敏感）
 */

/**
 * 將全形字元轉換為半形字元
 * 
 * @private
 * @param {string} str - 輸入字串
 * @returns {string} 轉換後的半形字串
 */
function toHalfWidth(str) {
  // 將常見全形 ASCII 與全形空白轉半形
  return str.replace(/\u3000/g, ' ').replace(/[\uFF01-\uFF5E]/g, function(ch) {
    return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
  });
}

/**
 * 標準化姓名
 * 
 * 處理步驟：
 * 1. 全形轉半形
 * 2. 移除控制字元與零寬字元
 * 3. 去除前後空白
 * 4. 將多個連續空白合併為單一空白
 * 
 * @param {string|null|undefined} name - 原始姓名
 * @returns {string} 標準化後的姓名
 * 
 * @example
 * normalizeName("　王小明　") // => "王小明"
 * normalizeName("ＡＢＣＤ") // => "ABCD"
 */
export function normalizeName(name) {
  if (name == null) return '';
  let s = String(name);
  s = toHalfWidth(s);
  // 移除 control chars & zero-width
  s = s.replace(/[\u200B-\u200F\u202A-\u202E\u0000-\u001F]/g, '');
  // trim and collapse multiple whitespace to single space
  s = s.trim().replace(/\s+/g, ' ');
  return s;
}

/**
 * 聚合並加總同名項目
 * 
 * 特性：
 * - 大小寫不敏感合併（"John" 與 "john" 視為同一人）
 * - 保留首次出現的姓名大小寫作為輸出
 * - 自動處理 BigInt 與 Number 混合加總
 * - 預設按姓名字母順序排序
 * 
 * @param {InputEntry[]} entries - 輸入項目陣列
 * @param {AggregateOptions} [options={}] - 選項物件
 * @returns {AggregatedPerson[]} 聚合後的人員陣列
 * 
 * @example
 * aggregateEntries([
 *   {name:"王小明", amt:1200n},
 *   {name:"張三", amt:300n},
 *   {name:"王小明", amt:800n}
 * ])
 * // => [
 * //   {name:"張三", total:300n},
 * //   {name:"王小明", total:2000n}
 * // ]
 */
export function aggregateEntries(entries, options = {}) {
  // options: { sort: true }
  const map = new Map();
  for (const e of entries) {
    const rawName = e.name == null ? '' : String(e.name);
    const nameNorm = normalizeName(rawName);
    const key = nameNorm.toLowerCase();
    const amt = (typeof e.amt === 'bigint') ? e.amt : (Number(e.amt) || 0);
    if (!map.has(key)) {
      // store canonical name as first occurrence (preserve original trimmed form)
      map.set(key, { name: nameNorm, total: (typeof amt === 'bigint') ? BigInt(0) : 0 });
    }
    const cur = map.get(key);
    // perform type-consistent addition
    if (typeof cur.total === 'bigint' && typeof amt === 'bigint') {
      cur.total = cur.total + amt;
    } else if (typeof cur.total === 'number' && typeof amt === 'number') {
      cur.total = cur.total + amt;
    } else {
      // mixed types: convert numbers to BigInt where possible
      const left = (typeof cur.total === 'bigint') ? cur.total : BigInt(Math.round(cur.total));
      const right = (typeof amt === 'bigint') ? amt : BigInt(Math.round(amt));
      cur.total = left + right;
    }
  }
  const out = Array.from(map.values());
  if (options.sort !== false) {
    out.sort((a,b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
  }
  return out;
}
