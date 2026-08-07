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
const copyBankBtn = document.getElementById('copyBankBtn');
const errorMsg = document.getElementById('errorMsg');
const tbody = document.getElementById('personRows');
const limitsNoticeEl = document.getElementById('limitsNotice');
const calcTimestampEl = document.getElementById('calcTimestamp');
const hasNameFlagCheckbox = document.getElementById('hasNameFlag');
const inputLabel = document.getElementById('inputLabel');
const toastEl = document.getElementById('toast');

const saveKey = 'money-snap:mvp:v1';

// State variable to track if data is valid for export
let isDataValidForExport = false;

/**
 * 動態更新 UI 提示文字根據模式切換
 */
function updateUIForMode() {
  const hasNameFlag = hasNameFlagCheckbox.checked;
  
  if (hasNameFlag) {
    // 含姓名模式
    if (limitsNoticeEl) {
      limitsNoticeEl.textContent = `格式：姓名,金額（手動輸入用逗號；從試算表複製貼上會自動辨識）\n注意：每次最多可貼入 1000 筆；每筆金額之整數部分上限為 999,999；姓名可重複多筆，系統會自動加總。`;
    }
    if (inputLabel) {
      inputLabel.textContent = '請貼上資料（姓名,金額）：';
    }
    inputArea.placeholder = `例如：
王小明,1200
張三,300
王小明,800`;
  } else {
    // 純金額模式
    if (limitsNoticeEl) {
      limitsNoticeEl.textContent = `格式：金額（每行一筆數字，姓名欄位系統自動編號為「項目 #1」、「項目 #2」...）\n注意：每次最多可貼入 1000 筆；每筆金額之整數部分上限為 999,999。`;
    }
    if (inputLabel) {
      inputLabel.textContent = '請貼上資料（純金額）：';
    }
    inputArea.placeholder = `例如：
45,800
32000
18500`;
  }
}

// 初始化時設定 UI
updateUIForMode();

/**
 * 安全地發送 GA 事件的輔助函式
 * 確保如果全域 gtag 尚未載入完成時，程式不會崩潰
 */
function sendGaEvent(eventName, label) {
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, {
      'event_category': 'engagement',
      'event_label': label
    });
  } else {
    console.log(`[GA Simulation] Event: ${eventName}, Label: ${label}`);
  }
}

function saveState(payload) {
  try {
    // merge with existing saved state so callers can pass partial updates
    const raw = localStorage.getItem(saveKey);
    const prev = raw ? JSON.parse(raw) : {};
    const merged = Object.assign({}, prev, payload);
    
    // Custom JSON serialization to handle BigInt
    localStorage.setItem(saveKey, JSON.stringify(merged, (key, value) => {
      if (typeof value === 'bigint') {
        return value.toString();
      }
      return value;
    }));
  } catch (e) { 
    console.warn('saveState failed', e); 
    console.error('Failed payload:', payload);
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(saveKey);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { console.warn('loadState failed', e); return null; }
}

// Update button states based on textarea content and validation status
function updateButtonStates() {
  const hasContent = inputArea.value.trim().length > 0;
  
  // clearBtn: enabled only when there's content
  clearBtn.disabled = !hasContent;
  
  // calcBtn: enabled only when there's content
  calcBtn.disabled = !hasContent;
  
  // exportBtn & copyBankBtn: enabled only when data is valid (after successful calculation)
  exportBtn.disabled = !isDataValidForExport;
  copyBankBtn.disabled = !isDataValidForExport;
}

/**
 * 顯示 toast 通知
 * @param {string} message - 訊息內容
 * @param {number} duration - 顯示時長（毫秒）
 * @param {string} type - 類型：'success' 或 'error'
 */
function showToast(message, duration = 2000, type = 'success') {
  if (!toastEl) return;
  toastEl.textContent = message;
  // 清除舊的類型樣式
  toastEl.classList.remove('success', 'error');
  // 加入新的類型樣式
  toastEl.classList.add(type);
  toastEl.classList.add('show');
  setTimeout(() => {
    toastEl.classList.remove('show');
  }, duration);
}

/**
 * 格式化銀行領款清單為純文字
 */
function formatBankListText() {
  const totalAmount = document.getElementById('totalAmount').textContent;
  const totalCount = document.getElementById('totalCount').textContent;
  const d1000 = document.getElementById('d1000').textContent;
  const d500 = document.getElementById('d500').textContent;
  const d100 = document.getElementById('d100').textContent;
  const d50 = document.getElementById('d50').textContent;
  const d10 = document.getElementById('d10').textContent;
  const d5 = document.getElementById('d5').textContent;
  const d1 = document.getElementById('d1').textContent;
  
  return `【銀行領款總需求】
總金額：${totalAmount} 元 | 總筆數：${totalCount} 筆

1000元：${d1000} 張
500元：${d500} 張
100元：${d100} 張
50元：${d50} 個
10元：${d10} 個
5元：${d5} 個
1元：${d1} 個`;
}

/**
 * 一鍵複製銀行領款清單到剪貼簿
 */
async function copyBankListToClipboard() {
  try {
    const text = formatBankListText();
    
    // 嘗試使用 Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      showToast('✓ 已複製銀行領款單', 2000, 'success');
      sendGaEvent('click_copy_bank', '一鍵複製銀行領款單');
    } else {
      // Fallback: 使用 execCommand (deprecated but more compatible)
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      
      if (success) {
        showToast('✓ 已複製', 2000, 'success');
        sendGaEvent('click_copy_bank', '一鍵複製銀行領款單');
      } else {
        throw new Error('execCommand failed');
      }
    }
  } catch (error) {
    console.error('Copy failed:', error);
    showToast('✗ 複製失敗，請手動複製', 3000, 'error');
    // 顯示純文字讓使用者手動複製
    alert('自動複製失敗，請手動複製以下內容：\n\n' + formatBankListText());
  }
}

function clearAll() {
  if (!confirm('確定要清除所有資料？此動作無法復原。')) return;
  inputArea.value = '';
  tbody.innerHTML = '';
  ['d1000','d500','d100','d50','d10','d5','d1','totalAmount','totalCount'].forEach(id=>document.getElementById(id).textContent='0');
  errorMsg.textContent = '';
  calcTimestampEl.textContent = ''; // Clear timestamp
  isDataValidForExport = false;
  localStorage.removeItem(saveKey);
  updateButtonStates(); // Update button states after clearing
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
  document.getElementById('totalCount').textContent = bank.perPerson.length.toLocaleString();
  return bank;
}


// Helper: select (highlight) a specific line in textarea
function selectLineInTextarea(textarea, lineNumber) {
  const lines = textarea.value.split(/\r?\n/);
  if (lineNumber < 1 || lineNumber > lines.length) return;
  
  // Calculate character position of the target line (0-based line index = lineNumber - 1)
  let start = 0;
  for (let i = 0; i < lineNumber - 1; i++) {
    start += lines[i].length + 1; // +1 for newline character
  }
  const end = start + lines[lineNumber - 1].length;
  
  // Add error-highlight class for custom selection color
  textarea.classList.add('error-highlight');
  textarea.focus();
  textarea.setSelectionRange(start, end);
}

function parseAndCompute() {
  errorMsg.textContent = '';
  isDataValidForExport = false; // Reset validation state
  exportBtn.disabled = true; // disable until checks pass
  
  // Remove error-highlight class when re-running computation
  inputArea.classList.remove('error-highlight');
  
  const text = inputArea.value;
  if (!text || text.trim().length === 0) { 
    alert('請貼上資料後再執行計算。'); 
    updateButtonStates();
    return; 
  }
  
  // 讀取模式開關狀態
  const hasNameFlag = hasNameFlagCheckbox.checked;
  
  // 傳入 hasNameFlag 參數到 parser
  const result = parseInput(text, hasNameFlag);
  if (result.error) {
    errorMsg.textContent = `第 ${result.error.line} 行錯誤：${result.error.message} （${result.error.raw}）`;
    // Auto-select (highlight) the error line
    selectLineInTextarea(inputArea, result.error.line);
    updateButtonStates();
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
      errorMsg.textContent = `✗ 驗證錯誤：${p.name} 的累計金額超過單人上限 ${MAX_PER_PERSON}`;
      exportBtn.disabled = true;
      saveState({ input: inputArea.value, lastParsedAt: new Date().toISOString(), parsedEntries: result.entries, bank, lastValid: false });
      updateButtonStates();
      return;
    }
  }
  const totalAsBig = (typeof breakdownSumRaw === 'bigint') ? breakdownSumRaw : BigInt(Math.round(Number(breakdownSumRaw) || 0));
  if (totalAsBig > BigInt(MAX_TOTAL)) {
    errorMsg.textContent = `✗ 驗證錯誤：總額超過上限 ${MAX_TOTAL}`;
    exportBtn.disabled = true;
    saveState({ input: inputArea.value, lastParsedAt: new Date().toISOString(), parsedEntries: result.entries, bank, lastValid: false });
    updateButtonStates();
    return;
  }

  if (typeof inputSumRaw === 'bigint' || typeof breakdownSumRaw === 'bigint') {
    const inB = (typeof inputSumRaw === 'bigint') ? inputSumRaw : BigInt(Math.round(Number(inputSumRaw) || 0));
    const brB = (typeof breakdownSumRaw === 'bigint') ? breakdownSumRaw : BigInt(Math.round(Number(breakdownSumRaw) || 0));
    valid = (inB === brB);
    if (!valid) {
      const diff = inB - brB;
      errorMsg.textContent = `✗ 驗證錯誤：輸入總額 (${formatAmount(inB)}) 與拆解總額 (${formatAmount(brB)}) 不一致，差額：${formatAmount(diff)} 元。請人工核對。`;
      exportBtn.disabled = true;
    }
  } else {
    const inN = Number(inputSumRaw || 0);
    const brN = Number(breakdownSumRaw || 0);
    valid = (Math.round(inN) === Math.round(brN));
    if (!valid) {
      const diff = Math.round(inN) - Math.round(brN);
      errorMsg.textContent = `✗ 驗證錯誤：輸入總額 (${formatAmount(inN)}) 與拆解總額 (${formatAmount(brN)}) 不一致，差額：${diff} 元。請人工核對。`;
      exportBtn.disabled = true;
    }
  }
  if (valid) { 
    errorMsg.textContent = ''; 
    exportBtn.disabled = false;
    isDataValidForExport = true; // Set validation state to true
    
    // Update timestamp display
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timeStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const timestampISO = now.toISOString();
    calcTimestampEl.textContent = `計算時間：${timeStr}`;
    
    // Store timestamp in state for restoration
    saveState({
      input: inputArea.value,
      lastParsedAt: timestampISO,
      calcTimestamp: timeStr, // Store formatted timestamp
      parsedEntries: result.entries,
      bank: bank,
      lastValid: valid,
      hasNameFlag: hasNameFlag
    });
  } else {
    // Save invalid state without timestamp
    saveState({
      input: inputArea.value,
      lastParsedAt: new Date().toISOString(),
      parsedEntries: result.entries,
      bank: bank,
      lastValid: valid,
      hasNameFlag: hasNameFlag
    });
  }

  // Update button states after validation
  updateButtonStates();
}

// 事件綁定
calcBtn.addEventListener('click', () => {
  // 觸發 GA 事件：點擊計算（不搜集任何隱私文字與金額數值）
  sendGaEvent('click_calculate', '計算與統計');
  parseAndCompute();
});
clearBtn.addEventListener('click', () => {
  // 觸發 GA 事件：點擊一鍵清除
  sendGaEvent('click_clear', '一鍵清除');
  clearAll();
});

// 模式切換 checkbox 事件
hasNameFlagCheckbox.addEventListener('change', () => {
  const hasNameFlag = hasNameFlagCheckbox.checked;
  // 觸發 GA 事件：切換模式
  sendGaEvent('toggle_name_mode', `hasNameFlag=${hasNameFlag}`);
  // 更新 UI 提示
  updateUIForMode();
  // 清除錯誤訊息與高亮
  errorMsg.textContent = '';
  inputArea.classList.remove('error-highlight');
});

// 一鍵複製銀行領款單事件
copyBankBtn.addEventListener('click', () => {
  copyBankListToClipboard();
});

function formatDateForWatermark(d){
  const pad=(n)=>String(n).padStart(2,'0');
  return `圖片匯出時間：${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

exportBtn.addEventListener('click', async ()=>{
  if (typeof html2canvas === 'undefined') { alert('html2canvas 尚未載入'); return; }

  // 觸發 GA 事件：點擊匯出明細圖片
  sendGaEvent('click_export_image', '匯出明細圖');
  
  const shutterFlash = document.getElementById('shutterFlash');
  const orig = document.getElementById('app') || document.body;
  const errorMsgEl = document.getElementById('errorMsg');
  const textarea = orig.querySelector('textarea');
  const calcTimestamp = document.getElementById('calcTimestamp');

  try {
    // Step 1: Trigger shutter flash effect (fade in) - faster timing
    shutterFlash.classList.add('active');
    await new Promise(resolve => setTimeout(resolve, 80)); // Reduced from 150ms to 80ms

    // Step 2: While screen is white, make DOM changes (hide buttons, replace textarea)
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

    // Get elements to hide during export (elements that should NOT be in the screenshot)
    const hasNameFlagCheckbox = document.getElementById('hasNameFlag')?.parentElement; // checkbox label
    const limitsNotice = document.getElementById('limitsNotice'); // 格式說明
    const inputLabel = document.getElementById('inputLabel'); // label
    const copyBankBtn = document.getElementById('copyBankBtn')?.parentElement; // 按鈕群組 container

    // hide export button, bottom control buttons, error message, timestamp, checkbox, format notice, and copy button - use visibility to prevent layout jump
    const prevExportVisibility = exportBtn.style.visibility;
    const prevClearBtnVisibility = clearBtn.style.display;
    const prevCalcBtnVisibility = calcBtn.style.display;
    const prevErrorVisibility = errorMsgEl ? errorMsgEl.style.visibility : null;
    const prevTimestampVisibility = calcTimestamp ? calcTimestamp.style.visibility : null;
    const prevCheckboxVisibility = hasNameFlagCheckbox ? hasNameFlagCheckbox.style.display : null;
    const prevLimitsVisibility = limitsNotice ? limitsNotice.style.display : null;
    const prevLabelVisibility = inputLabel ? inputLabel.style.visibility : null;
    const prevCopyBtnVisibility = copyBankBtn ? copyBankBtn.style.visibility : null;
    
    exportBtn.style.visibility = 'hidden';
    clearBtn.style.display = 'none';
    calcBtn.style.display = 'none';
    if (errorMsgEl) errorMsgEl.style.visibility = 'hidden';
    // if (calcTimestamp) calcTimestamp.style.visibility = 'hidden';
    if (hasNameFlagCheckbox) hasNameFlagCheckbox.style.display = 'none';
    if (limitsNotice) limitsNotice.style.display = 'none';
    if (inputLabel) inputLabel.style.visibility = 'hidden';
    if (copyBankBtn) copyBankBtn.style.visibility = 'hidden';
    textarea.parentNode.replaceChild(replacement, textarea);

    // Wait for browser to complete reflow after DOM changes
    await new Promise(resolve => requestAnimationFrame(resolve));

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

    // Wait another frame to ensure all changes are rendered
    await new Promise(resolve => requestAnimationFrame(resolve));

    // Step 3: Capture screenshot (while flash is still active)
    const canvas = await html2canvas(orig, { 
      useCORS: true, 
      logging: false, 
      scale: Math.max(1, window.devicePixelRatio),
      backgroundColor: getComputedStyle(orig).backgroundColor || '#ffffff'
    });
    
    // Step 4: Restore DOM elements before fading out flash
    watermark.remove();
    replacement.parentNode.replaceChild(textarea, replacement);
    exportBtn.style.visibility = prevExportVisibility || '';
    clearBtn.style.display = prevClearBtnVisibility || '';
    calcBtn.style.display = prevCalcBtnVisibility || '';
    if (errorMsgEl) errorMsgEl.style.visibility = prevErrorVisibility || '';
    // if (calcTimestamp) calcTimestamp.style.visibility = prevTimestampVisibility || '';
    if (hasNameFlagCheckbox) hasNameFlagCheckbox.style.display = prevCheckboxVisibility || '';
    if (limitsNotice) limitsNotice.style.display = prevLimitsVisibility || '';
    if (inputLabel) inputLabel.style.visibility = prevLabelVisibility || '';
    if (copyBankBtn) copyBankBtn.style.visibility = prevCopyBtnVisibility || '';

    // Step 5: Fade out shutter flash
    shutterFlash.classList.remove('active');
    
    // Step 6: Download the image
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `money-snap-${new Date().toISOString().slice(0,16).replace('T','_')}.png`;
    a.click();
    
    // record export timestamp/meta (no image saved)
    try{ saveState({ lastExportAt: new Date().toISOString() }); }catch(e){/*ignore*/}
    
  } catch (error) {
    // On error, ensure flash is removed and elements are restored
    console.error('Export failed:', error);
    shutterFlash.classList.remove('active');
    alert('匯出失敗，請重試');
  }
});

inputArea.addEventListener('input', ()=>{ 
  // Clear calculation results when input changes
  saveState({ 
    input: inputArea.value,
    bank: null,
    calcTimestamp: null,
    lastValid: false
  }); 
  updateButtonStates(); // Update button states on input change
});

// 載入先前狀態
const prev = loadState();
if (prev && prev.input) {
  inputArea.value = prev.input;
  
  // Restore checkbox state if available
  if (prev.hasOwnProperty('hasNameFlag')) {
    hasNameFlagCheckbox.checked = prev.hasNameFlag;
    updateUIForMode(); // Update UI based on restored mode
  }
  
  // Restore UI from saved state if available
  if (prev.bank && prev.lastValid) {
    setTimeout(() => {
      try {
        // Restore results display
        const bank = prev.bank;
        tbody.innerHTML = '';
        const denom = [1000,500,100,50,10,5,1];
        
        for (const p of bank.perPerson) {
          const rowDenom = p.breakdown;
          const tr = document.createElement('tr');
          const breakdownHtml = denom.map(d => {
            const c = rowDenom[d] || 0;
            return `<span class="inline-block bg-gray-100 text-gray-800 px-2 py-0.5 rounded mr-1 text-xs">${d}×${c}</span>`;
          }).join('');
          tr.innerHTML = `<td class="p-2">${p.name}</td><td class="p-2 text-center">${formatAmount(p.total)}</td><td class="p-2 text-sm">${breakdownHtml}</td>`;
          tbody.appendChild(tr);
        }
        
        // Restore totals
        document.getElementById('d1000').textContent = (bank.totals[1000] || 0).toLocaleString();
        document.getElementById('d500').textContent = (bank.totals[500] || 0).toLocaleString();
        document.getElementById('d100').textContent = (bank.totals[100] || 0).toLocaleString();
        document.getElementById('d50').textContent = (bank.totals[50] || 0).toLocaleString();
        document.getElementById('d10').textContent = (bank.totals[10] || 0).toLocaleString();
        document.getElementById('d5').textContent = (bank.totals[5] || 0).toLocaleString();
        document.getElementById('d1').textContent = (bank.totals[1] || 0).toLocaleString();
        document.getElementById('totalAmount').textContent = formatAmount(bank.totalAmount);
        document.getElementById('totalCount').textContent = (bank.perPerson.length || 0).toLocaleString();
        
        // Restore timestamp if available
        if (prev.calcTimestamp) {
          calcTimestampEl.textContent = `計算時間：${prev.calcTimestamp}`;
        }
        
        // Restore validation state
        isDataValidForExport = true;
        exportBtn.disabled = false;
        updateButtonStates();
      } catch (e) {
        console.warn('restore state failed', e);
        updateButtonStates();
      }
    }, 50);
  } else {
    // If no valid saved state, just update button states
    setTimeout(() => updateButtonStates(), 50);
  }
} else {
  // No previous data, initialize button states
  updateButtonStates();
}

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(registration => {
      console.log('SW registered: ', registration);
    }).catch(registrationError => {
      console.log('SW registration failed: ', registrationError);
    });
  });
}

export { };
