// src/app.js
import { parseInput } from './parser.js';
import { aggregateEntries } from './aggregator.js';
import { computeBankTotals, verifyDoubleEntry } from './bank.js';
import { MAX_PER_PERSON, MAX_TOTAL } from './config.js';
import { downloadSampleCsv, parseCsvFile, exportResultsToCsv } from './csv.js';
import {
  loadDenomConfig,
  getActiveDenominations,
  setActiveDenominations,
  toggleSaveAsDefault,
  getCurrentConfig,
  setCurrentCurrency,
  getCurrentCurrency,
  setLanguage as setConfigLanguage,
  getLanguage as getConfigLanguage,
  setCustomDenomEnabled,
  isCustomDenomEnabled
} from './denomination-config.js';
import { getCurrencyDenominations, getCurrencyProfile, descaleAmount } from './currency.js';
import { t, setLanguage as setI18nLanguage } from './i18n.js';
import { buildCurrencyAwareCopy } from './currency-copy.js';
import { localizeBankError, localizeParseError, localizeValidationError } from './error-messages.js';

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
const languageSelect = document.getElementById('languageSelect');
const currencySelect = document.getElementById('currencySelect');
const bankTotalsGrid = document.getElementById('bankTotalsGrid');
const denominationSections = document.getElementById('denominationSections');

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

const saveKey = 'money-snap:mvp:v1';

// State variable to track if data is valid for export
let isDataValidForExport = false;

// State variable to store latest calculation result for CSV export
let latestSummaryResult = null;

let currentLanguage = getConfigLanguage();
let currentCurrency = getCurrentCurrency();

function getCurrentProfile() {
  return getCurrencyProfile(currentCurrency);
}

function isDecimalCurrency() {
  return getCurrentProfile().decimals > 0;
}

function getCurrentCalculationDenominations() {
  return isCustomDenomEnabled(currentCurrency)
    ? getActiveDenominations(currentCurrency)
    : getCurrencyDenominations(currentCurrency);
}

function formatDenominationValue(value, currencyCode = currentCurrency) {
  const profile = getCurrencyProfile(currencyCode);
  const decimals = profile.decimals;
  const formatter = new Intl.NumberFormat(currentLanguage === 'en-US' ? 'en-US' : 'zh-TW', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : decimals,
    maximumFractionDigits: decimals
  });
  return `${profile.symbol}${formatter.format(Number(value))}`;
}

function formatAmount(v, currencyCode = currentCurrency) {
  const profile = getCurrencyProfile(currencyCode);
  const locale = currentLanguage === 'en-US' ? 'en-US' : 'zh-TW';
  if (typeof v === 'bigint') {
    if (profile.decimals > 0) {
      return new Intl.NumberFormat(locale, {
        minimumFractionDigits: profile.decimals,
        maximumFractionDigits: profile.decimals
      }).format(descaleAmount(v, profile));
    }
    return numberWithCommas(v.toString());
  }
  if (typeof v === 'number') {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: Number.isInteger(v) ? 0 : profile.decimals,
      maximumFractionDigits: profile.decimals
    }).format(v);
  }
  if (typeof v === 'string') return v;
  return String(v);
}

function formatItemLabel(index) {
  return t('itemLabel', { index });
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function getDenomElementId(value) {
  return `d${String(value).replace('.', '_')}`;
}

function renderBankTotalsGrid() {
  const profile = getCurrentProfile();
  const denominations = getCurrencyDenominations(currentCurrency);
  bankTotalsGrid.innerHTML = denominations.map((denom) => {
    const unit = profile.defaultBanknotes.includes(denom) ? t('unitsBill') : t('unitsCoin');
    return `<div>${formatDenominationValue(denom)}：<span id="${getDenomElementId(denom)}">0</span> ${unit}</div>`;
  }).join('');
}

function renderDefaultDenominationHint() {
  const denoms = getCurrencyDenominations(currentCurrency).map((d) => formatDenominationValue(d)).join(', ');
  defaultDenomHint.textContent = t('activeDefaults', {
    currency: currentCurrency,
    denoms
  });
}

function renderDenominationControls() {
  const profile = getCurrentProfile();
  const activeDenoms = getActiveDenominations(currentCurrency);
  const billItems = profile.defaultBanknotes;
  const coinItems = profile.defaultCoins.filter((value) => !profile.defaultBanknotes.includes(value));

  const renderSection = (label, items, className, selectAllId) => `
    <div class="mb-4">
      <div class="flex items-center mb-2">
        <label class="text-sm font-medium text-gray-700">${label}：</label>
      </div>
      <div class="flex flex-wrap gap-3">
        <label class="inline-flex items-center cursor-pointer">
          <input type="checkbox" id="${selectAllId}" class="mr-1 w-3.5 h-3.5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500">
          <span>${t('selectAll')}</span>
        </label>
        ${items.map((value) => {
          const checked = activeDenoms.includes(value) ? 'checked' : '';
          const note = value === items[items.length - 1] ? ` <span class="text-xs text-gray-500">${t('unitsNote')}</span>` : '';
          return `<label class="inline-flex items-center cursor-pointer">
            <input type="checkbox" class="denom-checkbox ${className} mr-2 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500" data-value="${value}" ${checked}>
            <span class="text-sm">${formatDenominationValue(value)}${note}</span>
          </label>`;
        }).join('')}
      </div>
    </div>
  `;

  denominationSections.innerHTML = [
    renderSection(t('banknotes'), billItems, 'denom-bill', 'billsSelectAll'),
    renderSection(t('coins'), coinItems, 'denom-coin', 'coinsSelectAll')
  ].join('');

  document.querySelectorAll('.denom-checkbox').forEach((cb) => cb.addEventListener('change', handleDenomCheckboxChange));
  document.getElementById('billsSelectAll')?.addEventListener('change', (event) => handleSelectAllChange(event, '.denom-bill', 'paper'));
  document.getElementById('coinsSelectAll')?.addEventListener('change', (event) => handleSelectAllChange(event, '.denom-coin', 'coin'));
  updateSelectAllCheckboxes();
}

/**
 * 動態更新 UI 提示文字根據模式切換
 */
function updateUIForMode() {
  const hasNameFlag = hasNameFlagCheckbox.checked;
  const currencyCopy = buildCurrencyAwareCopy(currentCurrency, currentLanguage, hasNameFlag);
  
  if (hasNameFlag) {
    if (limitsNoticeEl) {
      limitsNoticeEl.textContent = currencyCopy.modeHintNamed;
    }
    if (inputLabel) {
      inputLabel.textContent = t('inputLabelNamed');
    }
    inputArea.placeholder = currencyCopy.placeholderNamed;
    inputArea.inputMode = '';
  } else {
    if (limitsNoticeEl) {
      limitsNoticeEl.textContent = currencyCopy.modeHintUnnamed;
    }
    if (inputLabel) {
      inputLabel.textContent = t('inputLabelUnnamed');
    }
    inputArea.placeholder = currencyCopy.placeholderUnnamed;
    inputArea.inputMode = 'decimal';
  }
}

function syncDenomCheckboxes() {
  const activeDenoms = getActiveDenominations(currentCurrency);
  const config = getCurrentConfig();

  document.querySelectorAll('.denom-checkbox').forEach((checkbox) => {
    checkbox.checked = activeDenoms.includes(Number(checkbox.dataset.value));
  });
  saveDenomPreferenceCheckbox.checked = config.saveAsDefault;
  enableCustomDenomCheckbox.checked = isCustomDenomEnabled(currentCurrency);
  renderDefaultDenominationHint();
  updateSelectAllCheckboxes();
}

function updateSelectAllCheckboxes() {
  const billCheckboxes = document.querySelectorAll('.denom-bill');
  const checkedBills = Array.from(billCheckboxes).filter(cb => cb.checked).length;
  const billsSelectAllCheckbox = document.getElementById('billsSelectAll');
  if (billsSelectAllCheckbox) {
    billsSelectAllCheckbox.checked = billCheckboxes.length > 0 && checkedBills === billCheckboxes.length;
    billsSelectAllCheckbox.indeterminate = checkedBills > 0 && checkedBills < billCheckboxes.length;
  }
  const coinCheckboxes = document.querySelectorAll('.denom-coin');
  const checkedCoins = Array.from(coinCheckboxes).filter(cb => cb.checked).length;
  const coinsSelectAllCheckbox = document.getElementById('coinsSelectAll');
  if (coinsSelectAllCheckbox) {
    coinsSelectAllCheckbox.checked = coinCheckboxes.length > 0 && checkedCoins === coinCheckboxes.length;
    coinsSelectAllCheckbox.indeterminate = checkedCoins > 0 && checkedCoins < coinCheckboxes.length;
  }
}

function collectCheckedDenominations() {
  const checked = [];
  document.querySelectorAll('.denom-checkbox').forEach(cb => {
    if (cb.checked) {
      checked.push(Number(cb.dataset.value));
    }
  });
  return checked.sort((a, b) => b - a); // 由大到小排序
}

function preventEmptySelection() {
  const checked = collectCheckedDenominations();
  if (checked.length === 0) {
    showToast(t('keepOneSuggestion'), 3000, 'error');
    return false;
  }
  return true;
}

function handleDenomCheckboxChange(event) {
  const checkbox = event.target;
  const denomValue = Number(checkbox.dataset.value);

  if (!checkbox.checked) {
    const otherChecked = collectCheckedDenominations().filter(d => d !== denomValue);
    if (otherChecked.length === 0) {
      checkbox.checked = true;
      showToast(t('emptySelection'), 3000, 'error');
      return;
    }
  }

  const newDenoms = collectCheckedDenominations();
  setActiveDenominations(newDenoms, currentCurrency);
  updateSelectAllCheckboxes();
  renderDefaultDenominationHint();

  sendGaEvent('toggle_custom_denomination', {
    enabled: checkbox.checked,
    currency: currentCurrency
  });
}

function handleSavePreferenceChange(event) {
  const enabled = event.target.checked;
  toggleSaveAsDefault(enabled);
  sendGaEvent('toggle_save_denom_preference', {
    enabled: enabled
  });

  if (enabled) {
    showToast(currentLanguage === 'en-US' ? '✓ Preferences saved' : '✓ 已記住您的面額偏好設定', 2000, 'success');
  } else {
    showToast(currentLanguage === 'en-US' ? 'Preference memory cleared' : '已清除面額偏好記憶', 2000, 'success');
  }
}

function handleSelectAllChange(event, selector, eventSuffix) {
  const checked = event.target.checked;
  document.querySelectorAll(selector).forEach(cb => {
    cb.checked = checked;
  });

  if (!preventEmptySelection()) {
    event.target.checked = !checked;
    document.querySelectorAll(selector).forEach(cb => {
      cb.checked = !checked;
    });
    return;
  }

  const newDenoms = collectCheckedDenominations();
  setActiveDenominations(newDenoms, currentCurrency);
  updateSelectAllCheckboxes();
  renderDefaultDenominationHint();
  sendGaEvent(`click_select_all_${eventSuffix}`, {
    currency: currentCurrency
  });
}

function handleEnableCustomDenomChange(event) {
  const enabled = event.target.checked;

  if (enabled) {
    denomPanelContent.classList.remove('hidden');
    defaultDenomHint.classList.add('hidden');
    syncDenomCheckboxes();
  } else {
    denomPanelContent.classList.add('hidden');
    defaultDenomHint.classList.remove('hidden');
  }
  setCustomDenomEnabled(enabled, currentCurrency);
  sendGaEvent('toggle_custom_denomination', {
    enabled,
    currency: currentCurrency
  });
}

function updateStaticTexts() {
  const currencyCopy = buildCurrencyAwareCopy(currentCurrency, currentLanguage, hasNameFlagCheckbox.checked);
  document.documentElement.lang = currentLanguage === 'en-US' ? 'en-US' : 'zh-Hant';
  document.title = `${t('appTitle')} v0.5.0`;
  document.querySelector('meta[name="description"]')?.setAttribute('content', t('appDescription'));
  setText('appTitle', t('appTitle'));
  setText('privacyTitle', t('privacyTitle'));
  setText('privacyBody', t('privacyBody'));
  setText('languageLabel', t('languageLabel'));
  setText('currencyLabel', t('currencyLabel'));
  setText('hasNameFlagText', t('hasNameFlag'));
  setText('csvImportBtnText', t('csvImport'));
  setText('downloadSampleBtnText', t('csvSample'));
  setText('csvHintTitle', t('csvHintTitle'));
  setText('csvHintLine1', `• ${currencyCopy.csvHintLine1}`);
  setText('csvHintLine2', `• ${t('csvHintLine2')}`);
  setText('csvHintLine3', `• ${t('csvHintLine3')}`);
  setText('savePreferenceText', t('savePreference'));
  setText('bankTotalsTitle', t('bankTotalsTitle'));
  setText('totalAmountLabel', t('totalAmount'));
  setText('totalAmountUnit', currentLanguage === 'en-US' ? currentCurrency : '元');
  setText('totalCountLabel', t('totalCount'));
  setText('totalCountUnit', currentLanguage === 'en-US' ? 'rows' : '筆');
  setText('personTitle', t('personTitle'));
  setText('tableName', t('tableName'));
  setText('tableAmount', t('tableAmount'));
  setText('tableBreakdown', t('tableBreakdown'));
  setText('disclaimerTitle', t('disclaimerTitle'));
  setText('disclaimerLine1', t('disclaimerLine1'));
  setText('disclaimerLine2', t('disclaimerLine2'));
  calcBtn.textContent = t('calculate');
  clearBtn.textContent = t('clearAll');
  copyBankBtn.textContent = t('copyBank');
  exportBtn.textContent = t('exportImage');
  setText('exportCsvBtnText', t('exportCsv'));
  const customDenomLabel = enableCustomDenomCheckbox.parentElement?.querySelector('span');
  if (customDenomLabel) customDenomLabel.textContent = t('customDenomToggle');
}

function applyLanguageAndCurrencyUI() {
  setI18nLanguage(currentLanguage);
  languageSelect.value = currentLanguage;
  currencySelect.value = currentCurrency;
  updateStaticTexts();
  updateUIForMode();
  renderDenominationControls();
  renderDefaultDenominationHint();
  renderBankTotalsGrid();
  const enabled = isCustomDenomEnabled(currentCurrency);
  enableCustomDenomCheckbox.checked = enabled;
  denomPanelContent.classList.toggle('hidden', !enabled);
  defaultDenomHint.classList.toggle('hidden', enabled);
}

loadDenomConfig();
currentLanguage = getConfigLanguage();
currentCurrency = getCurrentCurrency();
applyLanguageAndCurrencyUI();
saveDenomPreferenceCheckbox.checked = getCurrentConfig().saveAsDefault;

enableCustomDenomCheckbox.addEventListener('change', handleEnableCustomDenomChange);
saveDenomPreferenceCheckbox.addEventListener('change', handleSavePreferenceChange);

/**
 * 安全地發送 GA 事件的輔助函式
 * 確保如果全域 gtag 尚未載入完成時，程式不會崩潰
 * @param {string} eventName - 事件名稱
 * @param {Object|string} params - 事件參數（物件或字串）
 */
function sendGaEvent(eventName, params) {
  const allowedAnonymousEvents = new Set([
    'change_language',
    'change_currency',
    'toggle_custom_denomination'
  ]);
  const sanitizedParams = typeof params === 'object' && params !== null ? { ...params } : params;
  if (allowedAnonymousEvents.has(eventName) && typeof sanitizedParams === 'object') {
    delete sanitizedParams.name;
    delete sanitizedParams.amount;
    delete sanitizedParams.raw;
    delete sanitizedParams.detail;
  }
  if (typeof window.gtag === 'function') {
    const eventParams = typeof sanitizedParams === 'object' 
      ? Object.assign({ event_category: 'engagement' }, sanitizedParams)
      : {
          event_category: 'engagement',
          event_label: sanitizedParams
        };
    window.gtag('event', eventName, eventParams);
  } else {
    const paramsStr = typeof sanitizedParams === 'object' ? JSON.stringify(sanitizedParams) : sanitizedParams;
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
  const profile = getCurrentProfile();
  const lines = getCurrentCalculationDenominations().map((denom) => {
    const unit = profile.defaultBanknotes.includes(denom) ? t('unitsBill') : t('unitsCoin');
    const value = document.getElementById(getDenomElementId(denom))?.textContent || '0';
    return `${formatDenominationValue(denom)}：${value} ${unit}`;
  });

  return `${t('bankTotalsTitle')}
${t('totalAmount')}：${totalAmount} ${currentLanguage === 'en-US' ? currentCurrency : '元'} | ${t('totalCount')}：${totalCount} ${currentLanguage === 'en-US' ? 'rows' : '筆'}

${lines.join('\n')}`;
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
      showToast(t('copiedBank'), 2000, 'success');
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
        showToast(t('copiedBank'), 2000, 'success');
        sendGaEvent('click_copy_bank', '一鍵複製銀行領款單');
      } else {
        throw new Error('execCommand failed');
      }
    }
  } catch (error) {
    console.error('Copy failed:', error);
    showToast(t('copyFailed'), 3000, 'error');
    alert(`${t('copyFailed')}\n\n${formatBankListText()}`);
  }
}

function clearAll() {
  if (!confirm(t('clearConfirm'))) return;
  inputArea.value = '';
  clearResults();
  errorMsg.textContent = '';
  calcTimestampEl.textContent = '';
  csvSourceLabel.textContent = '';
  isDataValidForExport = false;
  localStorage.removeItem(saveKey);
  updateButtonStates(); // Update button states after clearing
}

function numberWithCommas(s){
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function clearResults() {
  tbody.innerHTML = '';
  getCurrencyDenominations(currentCurrency).forEach(d => {
    const spanId = getDenomElementId(d);
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
  const profile = getCurrentProfile();
  
  for (const p of bank.perPerson){
    const rowDenom = p.breakdown;
    const tr = document.createElement('tr');
    const breakdownHtml = denom.map(d => {
      const c = rowDenom[d] || 0;
      return `<span class="inline-block bg-gray-100 text-gray-800 px-2 py-0.5 rounded mr-1 text-xs">${formatDenominationValue(d)}×${c}</span>`;
    }).join('');
    tr.innerHTML = `<td class="p-2">${p.name}</td><td class="p-2 text-center">${formatAmount(p.total, currentCurrency)}</td><td class="p-2 text-sm">${breakdownHtml}</td>`;
    tbody.appendChild(tr);
  }

  getCurrencyDenominations(currentCurrency).forEach(d => {
    const spanId = getDenomElementId(d);
    const spanEl = document.getElementById(spanId);
    if (spanEl) {
      const count = bank.totals[d] || 0;
      spanEl.textContent = count.toLocaleString();
    }
  });
  
  document.getElementById('totalAmount').textContent = formatAmount(bank.totalAmount, currentCurrency);
  document.getElementById('totalCount').textContent = bank.perPerson.length.toLocaleString();
}

function renderResults(entries) {
  const denom = getCurrentCalculationDenominations();
  const people = aggregateEntries(entries);
  const bank = computeBankTotals(people, denom, { currencyCode: currentCurrency });
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
    alert(t('emptyInputAlert')); 
    updateButtonStates();
    return; 
  }
  
  // 讀取模式開關狀態
  const hasNameFlag = hasNameFlagCheckbox.checked;
  
  // 傳入 hasNameFlag 參數到 parser
  const result = parseInput(text, hasNameFlag, {
    currencyCode: currentCurrency,
    buildItemName: formatItemLabel
  });
  if (result.error) {
    errorMsg.textContent = t('rowError', {
      line: result.error.line,
      message: localizeParseError(result.error, currentLanguage),
      raw: result.error.raw
    });
    selectLineInTextarea(inputArea, result.error.line);
    clearResults();
    updateButtonStates();
    return;
  }

  const denom = getCurrentCalculationDenominations();
  const people = aggregateEntries(result.entries);
  const bank = computeBankTotals(people, denom, { currencyCode: currentCurrency });
  
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
      errorMsg.textContent = `✗ ${localizeValidationError('PER_PERSON_LIMIT', { name: p.name, max: MAX_PER_PERSON }, currentLanguage)}`;
      clearResults();
      exportBtn.disabled = true;
      saveState({ input: inputArea.value, lastParsedAt: new Date().toISOString(), parsedEntries: result.entries, bank, lastValid: false });
      updateButtonStates();
      return;
    }
  }
  const totalAsBig = (typeof breakdownSumRaw === 'bigint') ? breakdownSumRaw : BigInt(Math.round(Number(breakdownSumRaw) || 0));
  if (totalAsBig > BigInt(MAX_TOTAL)) {
    errorMsg.textContent = `✗ ${localizeValidationError('TOTAL_LIMIT', { max: MAX_TOTAL }, currentLanguage)}`;
    clearResults();
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
    errorMsg.textContent = `✗ ${localizeBankError(error, currentLanguage)}`;
    clearResults();
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
    
    latestSummaryResult = {
      currencyCode: currentCurrency,
      totalCount: bank.perPerson.length,
      bankTotals: bank.totals,
      items: bank.perPerson.map(p => ({
        person: {
          name: p.name,
          amount: formatAmount(p.total, currentCurrency)
        },
        breakdown: p.breakdown
      })),
      totalAmount: formatAmount(bank.totalAmount, currentCurrency),
      rawTotalAmount: String(bank.totalAmount)
    };
    
    // Update timestamp display
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timeStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const timestampISO = now.toISOString();
    calcTimestampEl.textContent = `${t('calculateAt')}：${timeStr}`;
    
    // Store timestamp in state for restoration
    saveState({
      input: inputArea.value,
      lastParsedAt: timestampISO,
      calcTimestamp: timeStr, // Store formatted timestamp
      parsedEntries: result.entries,
      bank: bank,
      lastValid: valid,
      hasNameFlag: hasNameFlag,
      currency: currentCurrency,
      language: currentLanguage
    });
  } else {
    saveState({
      input: inputArea.value,
      lastParsedAt: new Date().toISOString(),
      parsedEntries: result.entries,
      bank: bank,
      lastValid: valid,
      hasNameFlag: hasNameFlag,
      currency: currentCurrency,
      language: currentLanguage
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
  sendGaEvent('toggle_name_mode', `hasNameFlag=${hasNameFlag}`);
  updateStaticTexts();
  updateUIForMode();
  errorMsg.textContent = '';
  inputArea.classList.remove('error-highlight');
});

languageSelect.addEventListener('change', () => {
  currentLanguage = languageSelect.value;
  setConfigLanguage(currentLanguage);
  setI18nLanguage(currentLanguage);
  applyLanguageAndCurrencyUI();
  if (calcTimestampEl.textContent) {
    const text = calcTimestampEl.textContent.split('：').slice(1).join('：') || calcTimestampEl.textContent.split(':').slice(1).join(':');
    calcTimestampEl.textContent = text ? `${t('calculateAt')}：${text.trim()}` : '';
  }
  if (inputArea.value.trim()) {
    parseAndCompute();
  }
  sendGaEvent('change_language', { lang: currentLanguage });
});

currencySelect.addEventListener('change', () => {
  currentCurrency = currencySelect.value;
  setCurrentCurrency(currentCurrency);
  applyLanguageAndCurrencyUI();
  clearResults();
  if (inputArea.value.trim()) {
    parseAndCompute();
  } else {
    updateButtonStates();
  }
  sendGaEvent('change_currency', { currency: currentCurrency });
});

// 一鍵複製銀行領款單事件
copyBankBtn.addEventListener('click', () => {
  copyBankListToClipboard();
});

// Download CSV sample button
downloadSampleBtn.addEventListener('click', () => {
  try {
    downloadSampleCsv({ currencyCode: currentCurrency, language: currentLanguage });
    sendGaEvent('click_download_sample', 'Data_Import');
    showToast(t('downloadSampleSuccess'), 2000, 'success');
  } catch (error) {
    console.error('[App] 下載範例失敗:', error);
    showToast(t('downloadFailed'), 3000, 'error');
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
    showToast(currentLanguage === 'en-US' ? '✗ Please select a CSV file' : '✗ 請選擇 CSV 檔案', 3000, 'error');
    csvFileInput.value = ''; // Reset input
    return;
  }
  
  // Validate file size (1MB limit)
  const maxSize = 1 * 1024 * 1024; // 1MB
  if (file.size > maxSize) {
    showToast(currentLanguage === 'en-US' ? '✗ File too large (max 1MB)' : '✗ 檔案過大（上限 1MB）', 3000, 'error');
    csvFileInput.value = ''; // Reset input
    return;
  }
  
  const hasNameFlag = hasNameFlagCheckbox.checked;
  
  parseCsvFile(file, hasNameFlag, 
    (parsedItems) => {
      const textLines = parsedItems.map(item => {
        if (hasNameFlag) {
          return `${item.name},${item.amount}`;
        } else {
          return `${item.amount}`;
        }
      });
      inputArea.value = textLines.join('\n');
      
      csvSourceLabel.textContent = t('importedFrom', { file: file.name });
      
      saveState({ 
        input: inputArea.value,
        hasNameFlag: hasNameFlag,
        currency: currentCurrency,
        language: currentLanguage
      });
      
      updateButtonStates();
      
      showToast(t('importCsvSuccess', { count: parsedItems.length }), 2000, 'success');
      sendGaEvent('click_import_csv', 'Data_Import');
      parseAndCompute();
      
      csvFileInput.value = '';
    },
    (errorMessage) => {
      showToast(`✗ ${errorMessage}`, 8000, 'error');
      csvFileInput.value = ''; // Reset input
    },
    { currencyCode: currentCurrency, language: currentLanguage }
  );
});

// Export CSV button
exportCsvBtn.addEventListener('click', () => {
  if (!latestSummaryResult) {
    showToast(t('noExportData'), 3000, 'error');
    return;
  }
  
  exportResultsToCsv(latestSummaryResult,
    () => {
      showToast(t('exportCsvSuccess'), 2000, 'success');
      sendGaEvent('click_export_csv', 'Export');
    },
    (errorMessage) => {
      showToast(`✗ ${errorMessage}`, 4000, 'error');
    },
    { currencyCode: currentCurrency, language: currentLanguage }
  );
});

function formatDateForWatermark(d){
  const pad=(n)=>String(n).padStart(2,'0');
  return `${t('calculateAt')}：${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

exportBtn.addEventListener('click', async ()=>{
  if (typeof html2canvas === 'undefined') { alert(t('exportUnavailable')); return; }

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
    console.error('Export failed:', error);
    shutterFlash.classList.remove('active');
    alert(t('exportFailed'));
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

const prev = loadState();
if (prev && prev.input) {
  inputArea.value = prev.input;
  if (prev.language) {
    currentLanguage = prev.language;
    setConfigLanguage(currentLanguage);
  }
  if (prev.currency) {
    currentCurrency = prev.currency;
    setCurrentCurrency(currentCurrency);
  }
  applyLanguageAndCurrencyUI();
  
  if (prev.hasOwnProperty('hasNameFlag')) {
    hasNameFlagCheckbox.checked = prev.hasNameFlag;
    updateUIForMode();
  }
  
  if (prev.lastValid) {
    setTimeout(() => {
      try {
        parseAndCompute();
      } catch (e) {
        console.warn('restore state failed', e);
        updateButtonStates();
      }
    }, 50);
  } else {
    setTimeout(() => updateButtonStates(), 50);
  }
} else {
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
