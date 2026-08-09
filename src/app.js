// src/app.js
import { parseInput } from './parser.js';
import { aggregateEntries } from './aggregator.js';
import { breakdownAmount, aggregateBreakdowns } from './denomination.js';
import { computeBankTotals, verifyDoubleEntry } from './bank.js';
import { MAX_PER_PERSON, MAX_TOTAL } from './config.js';
import { downloadSampleCsv, parseCsvFile, exportResultsToCsv } from './csv.js';
import {
  DEFAULT_DENOMINATIONS,
  DEFAULT_ACTIVE_DENOMINATIONS,
  loadDenomConfig,
  saveDenomConfig,
  getActiveDenominations,
  setActiveDenominations,
  toggleSaveAsDefault,
  getCurrentConfig
} from './denomination-config.js';

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

// CSV-related DOM elements
const csvImportBtn = document.getElementById('csvImportBtn');
const csvFileInput = document.getElementById('csvFileInput');
const downloadSampleBtn = document.getElementById('downloadSampleBtn');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const csvSourceLabel = document.getElementById('csvSourceLabel');

// Denomination config UI elements
const enableCustomDenomCheckbox = document.getElementById('enableCustomDenom');
const defaultDenomHint = document.getElementById('defaultDenomHint');
const denomPanelContent = document.getElementById('denomPanelContent');
const saveDenomPreferenceCheckbox = document.getElementById('saveDenomPreference');
const billsSelectAllCheckbox = document.getElementById('billsSelectAll');
const coinsSelectAllCheckbox = document.getElementById('coinsSelectAll');

const saveKey = 'money-snap:mvp:v1';

// State variable to track if data is valid for export
let isDataValidForExport = false;

// State variable to store latest calculation result for CSV export
let latestSummaryResult = null;

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
    inputArea.inputMode = ""
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
    inputArea.inputMode = "decimal"
  }
}

// 初始化時設定 UI
updateUIForMode();

// ===== v0.4.0: Denomination Configuration Management =====

/**
 * 更新面額摘要文字（收合狀態顯示）
 */
/**
 * 同步 UI checkbox 狀態與內部設定
 */
function syncDenomCheckboxes() {
  const activeDenoms = getActiveDenominations();
  const config = getCurrentConfig();
  
  // 同步各面額 checkbox
  DEFAULT_DENOMINATIONS.forEach(d => {
    const checkbox = document.getElementById(`denom${d}`);
    if (checkbox) {
      checkbox.checked = activeDenoms.includes(d);
    }
  });
  
  // 同步「記住偏好」checkbox
  saveDenomPreferenceCheckbox.checked = config.saveAsDefault;
  
  // 同步「全選」checkbox 狀態
  updateSelectAllCheckboxes();
}

/**
 * 更新紙鈔/硬幣「全選」checkbox 的狀態（半選/全選/未選）
 */
function updateSelectAllCheckboxes() {
  // 紙鈔全選狀態
  const billCheckboxes = document.querySelectorAll('.denom-bill');
  const checkedBills = Array.from(billCheckboxes).filter(cb => cb.checked).length;
  billsSelectAllCheckbox.checked = checkedBills === billCheckboxes.length;
  billsSelectAllCheckbox.indeterminate = checkedBills > 0 && checkedBills < billCheckboxes.length;
  
  // 硬幣全選狀態
  const coinCheckboxes = document.querySelectorAll('.denom-coin');
  const checkedCoins = Array.from(coinCheckboxes).filter(cb => cb.checked).length;
  coinsSelectAllCheckbox.checked = checkedCoins === coinCheckboxes.length;
  coinsSelectAllCheckbox.indeterminate = checkedCoins > 0 && checkedCoins < coinCheckboxes.length;
}

/**
 * 收集當前 UI 勾選的面額
 */
function collectCheckedDenominations() {
  const checked = [];
  document.querySelectorAll('.denom-checkbox').forEach(cb => {
    if (cb.checked) {
      checked.push(Number(cb.dataset.value));
    }
  });
  return checked.sort((a, b) => b - a); // 由大到小排序
}

/**
 * 防空選檢查：至少保留一個面額
 */
function preventEmptySelection() {
  const checked = collectCheckedDenominations();
  if (checked.length === 0) {
    showToast('⚠️ 請至少保留一種面額進行計算！建議保留 1 元面額以確保完全拆解。', 3000, 'error');
    return false;
  }
  return true;
}

/**
 * 處理面額 checkbox 變更事件
 */
function handleDenomCheckboxChange(event) {
  const checkbox = event.target;
  const denomValue = Number(checkbox.dataset.value);
  
  // 如果取消勾選，檢查是否會導致空選
  if (!checkbox.checked) {
    const otherChecked = collectCheckedDenominations().filter(d => d !== denomValue);
    if (otherChecked.length === 0) {
      checkbox.checked = true; // 強制保持勾選
      showToast('⚠️ 請至少保留一種面額進行計算！', 3000, 'error');
      return;
    }
  }
  
  // 更新內部設定
  const newDenoms = collectCheckedDenominations();
  setActiveDenominations(newDenoms);
  
  // 更新 UI 狀態
  updateSelectAllCheckboxes();
  
  // GA4 事件追蹤
  sendGaEvent('change_custom_denomination', {
    denom_value: denomValue,
    active: checkbox.checked
  });
}

/**
 * 處理「記住偏好」checkbox 變更事件
 */
function handleSavePreferenceChange(event) {
  const enabled = event.target.checked;
  toggleSaveAsDefault(enabled);
  
  // GA4 事件追蹤
  sendGaEvent('toggle_save_denom_preference', {
    enabled: enabled
  });
  
  if (enabled) {
    showToast('✓ 已記住您的面額偏好設定', 2000, 'success');
  } else {
    showToast('已清除面額偏好記憶', 2000, 'success');
  }
}

/**
 * 處理紙鈔「全選」checkbox 變更事件
 */
function handleBillsSelectAllChange(event) {
  const checked = event.target.checked;
  document.querySelectorAll('.denom-bill').forEach(cb => {
    cb.checked = checked;
  });
  
  // 檢查防空選
  if (!preventEmptySelection()) {
    // 如果會導致空選，撤銷操作
    event.target.checked = !checked;
    document.querySelectorAll('.denom-bill').forEach(cb => {
      cb.checked = !checked;
    });
    return;
  }
  
  // 更新內部設定
  const newDenoms = collectCheckedDenominations();
  setActiveDenominations(newDenoms);
  
  // 更新 UI 狀態
  updateSelectAllCheckboxes();
  
  // GA4 事件追蹤
  sendGaEvent('click_select_all_paper', {
    action: 'select_all_paper'
  });
}

/**
 * 處理硬幣「全選」checkbox 變更事件
 */
function handleCoinsSelectAllChange(event) {
  const checked = event.target.checked;
  document.querySelectorAll('.denom-coin').forEach(cb => {
    cb.checked = checked;
  });
  
  // 檢查防空選
  if (!preventEmptySelection()) {
    // 如果會導致空選，撤銷操作
    event.target.checked = !checked;
    document.querySelectorAll('.denom-coin').forEach(cb => {
      cb.checked = !checked;
    });
    return;
  }
  
  // 更新內部設定
  const newDenoms = collectCheckedDenominations();
  setActiveDenominations(newDenoms);
  
  // 更新 UI 狀態
  updateSelectAllCheckboxes();
  
  // GA4 事件追蹤
  sendGaEvent('click_select_all_coin', {
    action: 'select_all_coin'
  });
}

/**
 * 處理主開關 checkbox 變更事件（v0.4.0）
 */
function handleEnableCustomDenomChange(event) {
  const enabled = event.target.checked;
  
  if (enabled) {
    // 顯示面額設定面板
    denomPanelContent.classList.remove('hidden');
    defaultDenomHint.classList.add('hidden');
    // 載入使用者自訂面額（若有 localStorage）
    const config = loadDenomConfig();
    if (config.activeDenominations && config.activeDenominations.length > 0) {
      setActiveDenominations(config.activeDenominations);
      syncDenomCheckboxes();
    }
  } else {
    // 隱藏面額設定面板
    denomPanelContent.classList.add('hidden');
    defaultDenomHint.classList.remove('hidden');
    // 注意：關閉時不重置 activeDenominations，保留使用者自訂設定
    // 計算時會由 parseAndCompute() 根據 enabled 狀態決定使用預設或自訂面額
  }
  
  // GA4 事件追蹤
  sendGaEvent('toggle_custom_denom_switch', {
    enabled: enabled
  });
  
  // 儲存至 localStorage（若勾選「記住偏好」）
  if (saveDenomPreferenceCheckbox.checked) {
    saveDenomConfig({
      enabled: enabled,
      activeDenominations: getActiveDenominations(),
      saveAsDefault: true
    });
  }
}

// 初始化面額設定
const savedConfig = loadDenomConfig();
syncDenomCheckboxes();

// 初始化主開關狀態（v0.4.0）
enableCustomDenomCheckbox.checked = savedConfig.enabled || false;
if (savedConfig.enabled) {
  denomPanelContent.classList.remove('hidden');
  defaultDenomHint.classList.add('hidden');
} else {
  denomPanelContent.classList.add('hidden');
  defaultDenomHint.classList.remove('hidden');
}

// 綁定面額面板事件監聽器
enableCustomDenomCheckbox.addEventListener('change', handleEnableCustomDenomChange);
document.querySelectorAll('.denom-checkbox').forEach(cb => {
  cb.addEventListener('change', handleDenomCheckboxChange);
});
saveDenomPreferenceCheckbox.addEventListener('change', handleSavePreferenceChange);
billsSelectAllCheckbox.addEventListener('change', handleBillsSelectAllChange);
coinsSelectAllCheckbox.addEventListener('change', handleCoinsSelectAllChange);

// ===== End of Denomination Configuration Management =====

/**
 * 安全地發送 GA 事件的輔助函式
 * 確保如果全域 gtag 尚未載入完成時，程式不會崩潰
 * @param {string} eventName - 事件名稱
 * @param {Object|string} params - 事件參數（物件或字串）
 */
function sendGaEvent(eventName, params) {
  if (typeof window.gtag === 'function') {
    // 如果參數是物件，直接使用；否則當作 event_label
    const eventParams = typeof params === 'object' 
      ? Object.assign({ event_category: 'engagement' }, params)
      : {
          event_category: 'engagement',
          event_label: params
        };
    window.gtag('event', eventName, eventParams);
  } else {
    const paramsStr = typeof params === 'object' ? JSON.stringify(params) : params;
    console.log(`[GA Simulation] Event: ${eventName}, Params: ${paramsStr}`);
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
  
  // exportBtn & copyBankBtn & exportCsvBtn: enabled only when data is valid (after successful calculation)
  exportBtn.disabled = !isDataValidForExport;
  copyBankBtn.disabled = !isDataValidForExport;
  exportCsvBtn.disabled = !isDataValidForExport;
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
  
  // 錯誤訊息顯示時間較長
  const displayDuration = type === 'error' ? Math.max(duration, 5000) : duration;
  
  setTimeout(() => {
    toastEl.classList.remove('show');
  }, displayDuration);
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
  // v0.4.0: 清除所有 10 種面額顯示
  ['d2000','d1000','d500','d200','d100','d50','d20','d10','d5','d1','totalAmount','totalCount'].forEach(id=>document.getElementById(id).textContent='0');
  errorMsg.textContent = '';
  calcTimestampEl.textContent = ''; // Clear timestamp
  csvSourceLabel.textContent = ''; // Clear CSV source label
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

// 清空結果顯示區域（當驗證失敗時使用）
function clearResults() {
  tbody.innerHTML = '';
  DEFAULT_DENOMINATIONS.forEach(d => {
    const spanId = `d${d}`;
    const spanEl = document.getElementById(spanId);
    if (spanEl) {
      spanEl.textContent = '0';
    }
  });
  document.getElementById('totalAmount').textContent = '0';
  document.getElementById('totalCount').textContent = '0';
}

// 僅渲染結果到 UI（驗證通過後才調用）
function renderResultsToUI(bank, denom) {
  tbody.innerHTML = '';
  
  for (const p of bank.perPerson){
    const rowDenom = p.breakdown;
    const personSum = p.total; // may be BigInt or number
    const tr = document.createElement('tr');
    // create badge-style breakdown for readability (v0.4.0: 僅顯示啟用的面額)
    const breakdownHtml = denom.map(d => {
      const c = rowDenom[d] || 0;
      return `<span class="inline-block bg-gray-100 text-gray-800 px-2 py-0.5 rounded mr-1 text-xs">${d}×${c}</span>`;
    }).join('');
    tr.innerHTML = `<td class="p-2">${p.name}</td><td class="p-2 text-center">${formatAmount(p.total)}</td><td class="p-2 text-sm">${breakdownHtml}</td>`;
    tbody.appendChild(tr);
  }

  // render totals (formatted) - v0.4.0: 動態更新所有面額（若未啟用則顯示 0）
  DEFAULT_DENOMINATIONS.forEach(d => {
    const spanId = `d${d}`;
    const spanEl = document.getElementById(spanId);
    if (spanEl) {
      const count = bank.totals[d] || 0;
      spanEl.textContent = count.toLocaleString();
    }
  });
  
  document.getElementById('totalAmount').textContent = formatAmount(bank.totalAmount);
  document.getElementById('totalCount').textContent = bank.perPerson.length.toLocaleString();
}

function renderResults(entries) {
  // Legacy function for backward compatibility - computes and renders
  const denom = getActiveDenominations();
  const people = aggregateEntries(entries);
  const bank = computeBankTotals(people, denom);
  renderResultsToUI(bank, denom);
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
  
  // Clear CSV source label when manually editing
  csvSourceLabel.textContent = '';
  
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
    clearResults(); // 清空結果顯示
    updateButtonStates();
    return;
  }

  // 先計算銀行需求（用於驗證），但尚未渲染到畫面
  // v0.4.0: 根據主開關判斷使用哪組面額
  const enableCustomDenom = enableCustomDenomCheckbox?.checked ?? false;
  const denom = enableCustomDenom 
    ? getActiveDenominations()  // 自訂面額
    : DEFAULT_ACTIVE_DENOMINATIONS;  // 預設面額
  const people = aggregateEntries(result.entries);
  const bank = computeBankTotals(people, denom);
  
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
      clearResults(); // 清空結果顯示
      exportBtn.disabled = true;
      saveState({ input: inputArea.value, lastParsedAt: new Date().toISOString(), parsedEntries: result.entries, bank, lastValid: false });
      updateButtonStates();
      return;
    }
  }
  const totalAsBig = (typeof breakdownSumRaw === 'bigint') ? breakdownSumRaw : BigInt(Math.round(Number(breakdownSumRaw) || 0));
  if (totalAsBig > BigInt(MAX_TOTAL)) {
    errorMsg.textContent = `✗ 驗證錯誤：總額超過上限 ${MAX_TOTAL}`;
    clearResults(); // 清空結果顯示
    exportBtn.disabled = true;
    saveState({ input: inputArea.value, lastParsedAt: new Date().toISOString(), parsedEntries: result.entries, bank, lastValid: false });
    updateButtonStates();
    return;
  }

  // v0.4.0: 使用新的雙重對帳驗證函式
  try {
    verifyDoubleEntry(inputSumRaw, breakdownSumRaw);
    valid = true;
  } catch (error) {
    errorMsg.textContent = `✗ ${error.message}`;
    clearResults(); // 清空結果顯示
    exportBtn.disabled = true;
    saveState({ input: inputArea.value, lastParsedAt: new Date().toISOString(), parsedEntries: result.entries, bank, lastValid: false });
    updateButtonStates();
    return;
  }
  
  // 所有驗證通過，現在渲染結果到畫面
  renderResultsToUI(bank, denom);
  
  if (valid) { 
    errorMsg.textContent = ''; 
    exportBtn.disabled = false;
    isDataValidForExport = true; // Set validation state to true
    
    // Store latest summary result for CSV export
    latestSummaryResult = {
      totalAmount: Number(bank.totalAmount),
      totalCount: bank.perPerson.length,
      bankTotals: bank.totals,
      items: bank.perPerson.map(p => ({
        person: {
          name: p.name,
          amount: Number(p.total)
        },
        breakdown: p.breakdown
      }))
    };
    
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

// Download CSV sample button
downloadSampleBtn.addEventListener('click', () => {
  try {
    downloadSampleCsv();
    sendGaEvent('click_download_sample', 'Data_Import');
    showToast('✓ 已下載範例 CSV 檔案', 2000, 'success');
  } catch (error) {
    console.error('[App] 下載範例失敗:', error);
    showToast('✗ 下載失敗，請稍後再試', 3000, 'error');
  }
});

// CSV import button (triggers file input)
csvImportBtn.addEventListener('click', () => {
  csvFileInput.click();
});

// CSV file input change event
csvFileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  // Validate file type
  if (!file.name.toLowerCase().endsWith('.csv')) {
    showToast('✗ 請選擇 CSV 檔案', 3000, 'error');
    csvFileInput.value = ''; // Reset input
    return;
  }
  
  // Validate file size (1MB limit)
  const maxSize = 1 * 1024 * 1024; // 1MB
  if (file.size > maxSize) {
    showToast('✗ 檔案過大（上限 1MB）', 3000, 'error');
    csvFileInput.value = ''; // Reset input
    return;
  }
  
  const hasNameFlag = hasNameFlagCheckbox.checked;
  
  parseCsvFile(file, hasNameFlag, 
    (parsedItems) => {
      // Success callback
      // Convert to text format and populate textarea
      const textLines = parsedItems.map(item => {
        if (hasNameFlag) {
          return `${item.name},${item.amount}`;
        } else {
          return `${item.amount}`;
        }
      });
      inputArea.value = textLines.join('\n');
      
      // Display CSV source filename
      csvSourceLabel.textContent = `資料來源由 ${file.name} 匯入`;
      
      // Save state and trigger calculation
      saveState({ 
        input: inputArea.value,
        hasNameFlag: hasNameFlag
      });
      
      updateButtonStates();
      
      showToast(`✓ 成功匯入 ${parsedItems.length} 筆資料`, 2000, 'success');
      sendGaEvent('click_import_csv', 'Data_Import');
      
      // Reset file input
      csvFileInput.value = '';
    },
    (errorMessage) => {
      // Error callback
      showToast(`✗ ${errorMessage}`, 8000, 'error');
      csvFileInput.value = ''; // Reset input
    }
  );
});

// Export CSV button
exportCsvBtn.addEventListener('click', () => {
  if (!latestSummaryResult) {
    showToast('✗ 目前沒有可匯出的計算結果', 3000, 'error');
    return;
  }
  
  exportResultsToCsv(latestSummaryResult,
    () => {
      // Success callback
      showToast('✓ CSV 檔案已下載', 2000, 'success');
      sendGaEvent('click_export_csv', 'Export');
    },
    (errorMessage) => {
      // Error callback
      showToast(`✗ ${errorMessage}`, 4000, 'error');
    }
  );
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
    const csvSourceLabel = document.getElementById('csvSourceLabel'); // CSV 來源標籤 (v0.4.0)
    const csvButtonsSection = document.getElementById('csvButtonsSection'); // CSV 按鈕區塊 (v0.4.0)
    const csvFormatHint = document.getElementById('csvFormatHint'); // CSV 格式提示 (v0.4.0)
    const denomSwitchSection = document.getElementById('denomSwitchSection'); // 自訂面額主開關區塊 (v0.4.0)
    const denomPanelSection = document.getElementById('denomPanelSection'); // 自訂面額設定面板 (v0.4.0)

    // hide export button, bottom control buttons, error message, timestamp, checkbox, format notice, copy button, CSV elements, and denom sections - use visibility to prevent layout jump
    const prevExportVisibility = exportBtn.style.visibility;
    const prevClearBtnVisibility = clearBtn.style.display;
    const prevCalcBtnVisibility = calcBtn.style.display;
    const prevErrorVisibility = errorMsgEl ? errorMsgEl.style.visibility : null;
    const prevTimestampVisibility = calcTimestamp ? calcTimestamp.style.visibility : null;
    const prevCheckboxVisibility = hasNameFlagCheckbox ? hasNameFlagCheckbox.style.display : null;
    const prevLimitsVisibility = limitsNotice ? limitsNotice.style.display : null;
    const prevLabelVisibility = inputLabel ? inputLabel.style.visibility : null;
    const prevCopyBtnVisibility = copyBankBtn ? copyBankBtn.style.visibility : null;
    const prevCsvLabelVisibility = csvSourceLabel ? csvSourceLabel.style.visibility : null;
    const prevCsvButtonsVisibility = csvButtonsSection ? csvButtonsSection.style.display : null;
    const prevCsvFormatHintVisibility = csvFormatHint ? csvFormatHint.style.display : null;
    const prevDenomSwitchVisibility = denomSwitchSection ? denomSwitchSection.style.display : null;
    const prevDenomPanelVisibility = denomPanelSection ? denomPanelSection.style.display : null;
    
    exportBtn.style.visibility = 'hidden';
    clearBtn.style.display = 'none';
    calcBtn.style.display = 'none';
    if (errorMsgEl) errorMsgEl.style.visibility = 'hidden';
    // if (calcTimestamp) calcTimestamp.style.visibility = 'hidden';
    if (hasNameFlagCheckbox) hasNameFlagCheckbox.style.display = 'none';
    if (limitsNotice) limitsNotice.style.display = 'none';
    if (inputLabel) inputLabel.style.visibility = 'hidden';
    if (copyBankBtn) copyBankBtn.style.visibility = 'hidden';
    if (csvSourceLabel) csvSourceLabel.style.visibility = 'hidden';
    if (csvButtonsSection) csvButtonsSection.style.display = 'none';
    if (csvFormatHint) csvFormatHint.style.display = 'none';
    if (denomSwitchSection) denomSwitchSection.style.display = 'none';
    if (denomPanelSection) denomPanelSection.style.display = 'none';
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
    if (csvSourceLabel) csvSourceLabel.style.visibility = prevCsvLabelVisibility || '';
    if (csvButtonsSection) csvButtonsSection.style.display = prevCsvButtonsVisibility || '';
    if (csvFormatHint) csvFormatHint.style.display = prevCsvFormatHintVisibility || '';
    if (denomSwitchSection) denomSwitchSection.style.display = prevDenomSwitchVisibility || '';
    if (denomPanelSection) denomPanelSection.style.display = prevDenomPanelVisibility || '';

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
