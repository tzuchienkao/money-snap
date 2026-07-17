// src/app.js
import { parseInput } from './parser.js';
import { aggregateEntries } from './aggregator.js';
import { breakdownAmount, aggregateBreakdowns } from './denomination.js';
import { computeBankTotals } from './bank.js';
import { MAX_PER_PERSON, MAX_TOTAL } from './config.js';

const inputArea = document.getElementById('inputArea');
const calcBtn = document.getElementById('calcBtn');
const clearBtn = document.getElementById('clearBtn');
const exportBtn = document.getElementById('exportBtn');
const errorMsg = document.getElementById('errorMsg');
const tbody = document.getElementById('personRows');
const limitsNoticeEl = document.getElementById('limitsNotice');

const saveKey = 'money-snap:mvp:v1';

// render dynamic limits if element present
if (limitsNoticeEl) {
  try {
    limitsNoticeEl.textContent = `注意：每次最多可貼入 ${MAX_ENTRIES.toLocaleString()} 筆；每筆金額之整數部分上限為 ${MAX_PER_ENTRY.toLocaleString()}（若超過會回傳錯誤）。`;
  } catch (e) {
    // ignore if config not available in this environment
  }
}

function saveState(payload) {
  try {
    // merge with existing saved state so callers can pass partial updates
    const raw = localStorage.getItem(saveKey);
    const prev = raw ? JSON.parse(raw) : {};
    const merged = Object.assign({}, prev, payload);
    localStorage.setItem(saveKey, JSON.stringify(merged));
  } catch (e) { console.warn('saveState failed', e); }
}

function loadState() {
  try {
    const raw = localStorage.getItem(saveKey);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { console.warn('loadState failed', e); return null; }
}

function clearAll() {
  if (!confirm('確定要清除所有資料？此動作無法復原。')) return;
  inputArea.value = '';
  tbody.innerHTML = '';
  ['d1000','d500','d100','d50','d10','d5','d1','totalAmount'].forEach(id=>document.getElementById(id).textContent='0');
  errorMsg.textContent = '';
  localStorage.removeItem(saveKey);
}

function numberWithCommas(s){
  // s is string of digits with optional leading -
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
function formatAmount(v){
  if (typeof v === 'bigint') return numberWithCommas(v.toString());
  if (typeof v === 'number') return Number(v).toLocaleString();
  if (typeof v === 'string') return v;
  return String(v);
}

function renderResults(entries) {
  tbody.innerHTML = '';
  const denom = [1000,500,100,50,10,5,1];

  // 使用 aggregator 模組合併
  const people = aggregateEntries(entries);

  // Use computeBankTotals to get per-person breakdown and aggregated totals
  const bank = computeBankTotals(people, denom);

  for (const p of bank.perPerson){
    const rowDenom = p.breakdown;
    const personSum = p.total; // may be BigInt or number
    const tr = document.createElement('tr');
    // create badge-style breakdown for readability
    const breakdownHtml = denom.map(d => {
      const c = rowDenom[d] || 0;
      return `<span class="inline-block bg-gray-100 text-gray-800 px-2 py-0.5 rounded mr-1 text-xs">${d}×${c}</span>`;
    }).join('');
    tr.innerHTML = `<td class="p-2">${p.name}</td><td class="p-2 text-center">${formatAmount(p.total)}</td><td class="p-2 text-sm">${breakdownHtml}</td>`;
    tbody.appendChild(tr);
  }

  // render totals (formatted)
  document.getElementById('d1000').textContent = (bank.totals[1000] || 0).toLocaleString();
  document.getElementById('d500').textContent = (bank.totals[500] || 0).toLocaleString();
  document.getElementById('d100').textContent = (bank.totals[100] || 0).toLocaleString();
  document.getElementById('d50').textContent = (bank.totals[50] || 0).toLocaleString();
  document.getElementById('d10').textContent = (bank.totals[10] || 0).toLocaleString();
  document.getElementById('d5').textContent = (bank.totals[5] || 0).toLocaleString();
  document.getElementById('d1').textContent = (bank.totals[1] || 0).toLocaleString();
  document.getElementById('totalAmount').textContent = formatAmount(bank.totalAmount);
  return bank;
}


function parseAndCompute() {
  errorMsg.textContent = '';
  exportBtn.disabled = true; // disable until checks pass
  const text = inputArea.value;
  if (!text || text.trim().length === 0) { alert('請貼上資料後再執行計算。'); return; }
  const result = parseInput(text);
  if (result.error) {
    errorMsg.textContent = `第 ${result.error.line} 行錯誤：${result.error.message} （${result.error.raw}）`;
    return;
  }
  const bank = renderResults(result.entries);
  // 驗證 — 支援 BigInt 與 Number
  const inputSumRaw = result.inputSum;
  const breakdownSumRaw = bank.totalAmount;
  let valid = false;

  // 先檢查 per-person 與 total 限制
  // bank.perPerson[].total may be BigInt or Number
  for (const p of bank.perPerson) {
    const totalVal = p.total;
    const asBig = (typeof totalVal === 'bigint') ? totalVal : BigInt(Math.round(Number(totalVal) || 0));
    if (asBig > BigInt(MAX_PER_PERSON)) {
      errorMsg.textContent = `驗證錯誤：${p.name} 的累計金額超過單人上限 ${MAX_PER_PERSON}`;
      exportBtn.disabled = true;
      saveState({ input: inputArea.value, lastParsedAt: new Date().toISOString(), parsedEntries: result.entries, bank, lastValid: false });
      return;
    }
  }
  const totalAsBig = (typeof breakdownSumRaw === 'bigint') ? breakdownSumRaw : BigInt(Math.round(Number(breakdownSumRaw) || 0));
  if (totalAsBig > BigInt(MAX_TOTAL)) {
    errorMsg.textContent = `驗證錯誤：總額超過上限 ${MAX_TOTAL}`;
    exportBtn.disabled = true;
    saveState({ input: inputArea.value, lastParsedAt: new Date().toISOString(), parsedEntries: result.entries, bank, lastValid: false });
    return;
  }

  if (typeof inputSumRaw === 'bigint' || typeof breakdownSumRaw === 'bigint') {
    const inB = (typeof inputSumRaw === 'bigint') ? inputSumRaw : BigInt(Math.round(Number(inputSumRaw) || 0));
    const brB = (typeof breakdownSumRaw === 'bigint') ? breakdownSumRaw : BigInt(Math.round(Number(breakdownSumRaw) || 0));
    valid = (inB === brB);
    if (!valid) {
      errorMsg.textContent = `驗證錯誤：輸入總額 ${formatAmount(inB)} 與拆解總額 ${formatAmount(brB)} 不一致，請人工核對。`;
      exportBtn.disabled = true;
    }
  } else {
    const inN = Number(inputSumRaw || 0);
    const brN = Number(breakdownSumRaw || 0);
    valid = (Math.round(inN) === Math.round(brN));
    if (!valid) {
      errorMsg.textContent = `驗證錯誤：輸入總額 ${formatAmount(inN)} 與拆解總額 ${formatAmount(brN)} 不一致，請人工核對。`;
      exportBtn.disabled = true;
    }
  }
  if (valid) { errorMsg.textContent = ''; exportBtn.disabled = false; }

  // 儲存整個狀態（合併舊資料）
  saveState({
    input: inputArea.value,
    lastParsedAt: new Date().toISOString(),
    parsedEntries: result.entries,
    bank: bank,
    lastValid: valid
  });
}

// 事件綁定
calcBtn.addEventListener('click', parseAndCompute);
clearBtn.addEventListener('click', clearAll);
function formatDateForWatermark(d){
  const pad=(n)=>String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

exportBtn.addEventListener('click', async ()=>{
  if (typeof html2canvas === 'undefined') { alert('html2canvas 尚未載入'); return; }
  const orig = document.getElementById('app') || document.body;
  const controls = document.getElementById('topControls');
  const textarea = orig.querySelector('textarea');

  // create replacement div for textarea to preserve line breaks
  const replacement = document.createElement('div');
  replacement.className = textarea.className;
  replacement.textContent = textarea.value;
  Object.assign(replacement.style, {
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
    minHeight: getComputedStyle(textarea).height || '80px',
    padding: getComputedStyle(textarea).padding,
    border: getComputedStyle(textarea).border,
    background: getComputedStyle(textarea).backgroundColor,
    color: getComputedStyle(textarea).color,
    borderRadius: getComputedStyle(textarea).borderRadius,
    lineHeight: '1.25'
  });
  replacement.classList.add('export-text-replacement');

  // hide controls and replace textarea in-place
  const prevDisplay = controls ? controls.style.display : null;
  if (controls) controls.style.display = 'none';
  textarea.parentNode.replaceChild(replacement, textarea);

  // add watermark element
  const watermark = document.createElement('div');
  watermark.id = 'export-watermark';
  watermark.textContent = formatDateForWatermark(new Date());
  Object.assign(watermark.style, {
    position: 'absolute',
    right: '12px',
    bottom: '12px',
    opacity: '0.45',
    color: '#111827',
    background: 'rgba(255,255,255,0.6)',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    zIndex: 9999,
    pointerEvents: 'none'
  });
  if (getComputedStyle(orig).position === 'static') orig.style.position = 'relative';
  orig.appendChild(watermark);

  try{
    // compute bounding box of orig
    const rect = orig.getBoundingClientRect();
    const bgColor = getComputedStyle(orig).backgroundColor || '#ffffff';

    // create an isolated wrapper positioned at same viewport location
    const wrapper = document.createElement('div');
    wrapper.id = 'export-wrapper';
    Object.assign(wrapper.style, {
      position: 'absolute',
      left: `${rect.left + window.scrollX}px`,
      top: `${rect.top + window.scrollY}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      backgroundColor: bgColor,
      zIndex: 2147483000,
      overflow: 'hidden'
    });

    // clone content into wrapper
    const clone = orig.cloneNode(true);
    // remove control buttons inside clone to be safe
    const cloneControls = clone.querySelector('#topControls');
    if (cloneControls) cloneControls.remove();
    // replace textarea with div in clone
    const cloneTextareas = clone.querySelectorAll('textarea');
    cloneTextareas.forEach(ta => {
      const d = document.createElement('div');
      d.className = ta.className;
      d.textContent = ta.value || '';
      Object.assign(d.style, {
        whiteSpace: 'pre-wrap',
        overflowWrap: 'break-word',
        minHeight: getComputedStyle(ta).height || '80px',
        padding: getComputedStyle(ta).padding,
        border: getComputedStyle(ta).border,
        background: getComputedStyle(ta).backgroundColor,
        color: getComputedStyle(ta).color,
        borderRadius: getComputedStyle(ta).borderRadius,
        lineHeight: '1.25'
      });
      ta.parentNode.replaceChild(d, ta);
    });

    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    // wait two frames to ensure layout & paint
    await new Promise((res)=> requestAnimationFrame(()=> requestAnimationFrame(res)));

    const canvas = await html2canvas(wrapper, { useCORS: true, logging: false, scale: Math.max(1, window.devicePixelRatio), backgroundColor: bgColor });
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `money-snap-${new Date().toISOString().slice(0,16).replace('T','_')}.png`;
    a.click();
    // record export timestamp/meta (no image saved)
    try{ saveState({ lastExportAt: new Date().toISOString() }); }catch(e){/*ignore*/}
  }finally{
    // restore
    const wrapperEl = document.getElementById('export-wrapper');
    if (wrapperEl) wrapperEl.remove();
    watermark.remove();
    replacement.parentNode.replaceChild(textarea, replacement);
    if (controls) controls.style.display = prevDisplay || '';
  }
});

inputArea.addEventListener('input', ()=>{ saveState({ input: inputArea.value }); });

// 載入先前狀態
const prev = loadState();
if (prev && prev.input) {
  inputArea.value = prev.input;
  // rerun compute to restore UI; run after a short delay so DOM is ready
  setTimeout(()=>{ try{ parseAndCompute(); }catch(e){ console.warn('restore parse failed', e); } }, 50);
}

export { };
