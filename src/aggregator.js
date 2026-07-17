// src/aggregator.js
// 更完整的合併與加總模組
// 功能：
// - name normalization（全形轉半形、去除多餘空白、collapse spaces）
// - case-insensitive 合併
// - 保留第一次出現的姓名原樣作為輸出名稱
// - 回傳按姓名（大小寫不敏感）排序的陣列以確保 deterministic output

function toHalfWidth(str) {
  // 將常見全形 ASCII 與全形空白轉半形
  return str.replace(/\u3000/g, ' ').replace(/[\uFF01-\uFF5E]/g, function(ch) {
    return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
  });
}

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
