// src/i18n.js
// 多語系字典與簡易翻譯工具

/** @typedef {'zh-TW'|'en-US'} LanguageCode */

export const DEFAULT_LANGUAGE = 'zh-TW';

export const dictionaries = {
  'zh-TW': {
    appTitle: '幫你算兌 Money Snap - 兌幣計算機',
    appDescription: '每月發薪換鈔算到頭痛？「幫你算兌 Money Snap - 兌幣計算機」讓你快速完成面額拆解！支援複製貼上多筆資料，即時產出銀行領款清單，免去人為計算錯誤。採用 100% 瀏覽器本地運算、無伺服器傳輸，確保財務數據絕對安全。',
    privacyTitle: '資料隱私保證',
    privacyBody: '所有計算 100% 在您的瀏覽器本機執行，資料不會上傳至任何伺服器。本工具為純前端應用，您的敏感資料完全保留在本機裝置。',
    languageLabel: '語系',
    currencyLabel: '貨幣',
    hasNameFlag: '貼上資料是否包含姓名欄位（取消勾選即可貼上純金額）',
    csvImport: 'CSV 檔案匯入',
    csvSample: '下載 CSV 範例',
    csvHintTitle: 'CSV 與貼上格式小提示：',
    csvHintLine1: '第一欄：姓名（選填，如：張三）｜第二欄：金額（必填，如：18500 或 "45,800" 或 "$32,000"）',
    csvHintLine2: 'CSV 檔案中若金額包含千分位逗號，請用雙引號包住（如："45,800"），避免被誤判為欄位分隔符',
    csvHintLine3: '支援 Excel 直接複製貼上或另存 CSV 上傳（系統將自動清洗引號、貨幣符號與千分位逗號）',
    inputLabelNamed: '請貼上資料（姓名,金額）：',
    inputLabelUnnamed: '請貼上資料（純金額）：',
    modeHintNamedBase: '格式：姓名,金額（手動輸入用逗號；從試算表複製貼上會自動辨識）\n注意：每次最多可貼入 1000 筆；每筆金額之整數部分上限為 999,999；姓名可重複多筆，系統會自動加總。',
    modeHintUnnamedBase: '格式：金額（每行一筆數字，姓名欄位系統自動編號為「項目 #1」、「項目 #2」...）\n注意：每次最多可貼入 1000 筆；每筆金額之整數部分上限為 999,999。',
    modeHintNamed: '格式：姓名,金額（手動輸入用逗號；從試算表複製貼上會自動辨識）\n注意：每次最多可貼入 1000 筆；每筆金額之整數部分上限為 999,999；姓名可重複多筆，系統會自動加總。',
    modeHintUnnamed: '格式：金額（每行一筆數字，姓名欄位系統自動編號為「項目 #1」、「項目 #2」...）\n注意：每次最多可貼入 1000 筆；每筆金額之整數部分上限為 999,999。',
    placeholderNamed: '例如：\n王小明,1200\n張三,300\n王小明,800',
    placeholderUnnamed: '例如：\n45,800\n32000\n18500',
    customDenomToggle: '啟用自訂面額設定',
    savePreference: '記住我的面額偏好（儲存至此瀏覽器）',
    selectAll: '全選',
    banknotes: '紙鈔面額',
    coins: '硬幣面額',
    clearAll: '清除所有資料',
    calculate: '點我才兌',
    bankTotalsTitle: '銀行領款總需求',
    totalAmount: '總金額',
    totalCount: '總筆數',
    personTitle: '個人領現明細',
    tableName: '姓名',
    tableAmount: '加總金額',
    tableBreakdown: '面額組合建議',
    copyBank: '複製銀行領款單',
    exportImage: '匯出領款明細圖',
    exportCsv: '匯出計算結果 (CSV)',
    disclaimerTitle: '⚠️ 免責與隱私聲明',
    disclaimerLine1: '1. 本工具提供的計算結果僅供參考，實際金額與面額組合請以人工核對為準。使用本工具所產生之任何結果，使用者需自行承擔相關責任。開發團隊不對計算錯誤或資料遺失負責。',
    disclaimerLine2: '2. 本站使用 Google Analytics 進行不具名流量統計，絕不收集、傳輸或儲存任何使用者輸入之業務敏感資料。',
    copiedBank: '✓ 已複製銀行領款單',
    copyFailed: '✗ 複製失敗，請手動複製',
    downloadSampleSuccess: '✓ 已下載範例 CSV 檔案',
    downloadFailed: '✗ 下載失敗，請稍後再試',
    importCsvSuccess: '✓ 成功匯入 {count} 筆資料',
    exportCsvSuccess: '✓ CSV 檔案已下載',
    noExportData: '✗ 目前沒有可匯出的計算結果',
    emptySelection: '⚠️ 請至少保留一種面額進行計算！',
    keepOneSuggestion: '⚠️ 請至少保留一種面額進行計算！建議保留 1 元面額以確保完全拆解。',
    clearConfirm: '確定要清除所有資料？此動作無法復原。',
    emptyInputAlert: '請貼上資料後再執行計算。',
    exportUnavailable: 'html2canvas 尚未載入',
    exportFailed: '匯出失敗，請重試',
    calculateAt: '計算時間',
    importedFrom: '資料來源由 {file} 匯入',
    activeDefaults: '已啟用 {currency} 預設面額：{denoms}',
    itemLabel: '項目 #{index}',
    unitsNote: '（建議保留）',
    unitsBill: '張',
    unitsCoin: '個',
    rowError: '第 {line} 行錯誤：{message} （{raw}）',
    amountLimit: '每筆金額之整數部分上限為 999,999',
    errorInvalidInputType: '輸入內容格式不正確',
    errorTooManyEntries: '輸入筆數超過上限 {max} 筆',
    errorMissingFields: '欄位數不足（需要姓名與金額）',
    errorEmptyNameOrAmount: '欄位數不足（姓名或金額為空）',
    errorEmptyAmount: '金額為空',
    errorCurrencySymbolMismatch: '金額幣別符號與目前選擇的 {currency} 不一致',
    errorInvalidAmountFormat: '金額格式錯誤：{value}',
    errorTooManyDecimals: '金額小數位數超過 {currency} 允許的 {decimals} 位：{value}',
    errorAmountExceedsLimit: '金額超過單筆上限 {max}',
    errorAmountTooLarge: '金額過大或格式錯誤：{value}',
    errorUnparseableAmount: '無法解析金額：{value}',
    errorPerPersonLimit: '驗證錯誤：{name} 的累計金額超過單人上限 {max}',
    errorTotalLimit: '驗證錯誤：總額超過上限 {max}',
    errorDoubleEntryMismatch: '財務嚴重警告：輸入總額 ({input}) 與面額拆解總金額 ({bank}) 不符。差額：{diff}（{direction} {diffAbs}）。請確認是否漏選最小面額，或面額設定導致無法完全拆解。',
    errorDirectionOver: '多',
    errorDirectionUnder: '少'
  },
  'en-US': {
    appTitle: 'Money Snap - Cash Breakdown Calculator',
    appDescription: 'Need a faster way to prepare cash payouts? Money Snap breaks down denominations from pasted rows or CSV imports and generates a bank withdrawal list entirely in your browser.',
    privacyTitle: 'Data Privacy Guarantee',
    privacyBody: 'All calculations run 100% locally in your browser. No payroll data is uploaded to any server.',
    languageLabel: 'Language',
    currencyLabel: 'Currency',
    hasNameFlag: 'Input includes names (uncheck for amount-only mode)',
    csvImport: 'Import CSV',
    csvSample: 'Download CSV Sample',
    csvHintTitle: 'CSV and paste tips:',
    csvHintLine1: 'Column 1: Name (optional, e.g. Alice) | Column 2: Amount (required, e.g. 18500 or "45,800" or "$32,000")',
    csvHintLine2: 'If the amount contains thousands separators, wrap it in quotes (e.g. "45,800") so CSV parsing stays correct.',
    csvHintLine3: 'Excel paste and CSV upload are both supported; quotes, currency symbols, and thousands separators are cleaned automatically.',
    inputLabelNamed: 'Paste data (Name,Amount):',
    inputLabelUnnamed: 'Paste data (Amount only):',
    modeHintNamedBase: 'Format: Name,Amount (comma-separated for typing; spreadsheet pastes are recognized)\nNotice: Up to 1,000 entries; integer part per amount up to 999,999; duplicate names are summed automatically.',
    modeHintUnnamedBase: 'Format: Amount (one number per line; names are auto-numbered as "Item #1", "Item #2"...)\nNotice: Up to 1,000 entries; integer part per amount up to 999,999.',
    modeHintNamed: 'Format: Name,Amount (comma-separated for typing; spreadsheet pastes are recognized)\nNotice: Up to 1,000 entries; integer part per amount up to 999,999; duplicate names are summed automatically.',
    modeHintUnnamed: 'Format: Amount (one number per line; names are auto-numbered as "Item #1", "Item #2"...)\nNotice: Up to 1,000 entries; integer part per amount up to 999,999.',
    placeholderNamed: 'For example:\nAlice,120.50\nBob,45.25\nAlice,19.25',
    placeholderUnnamed: 'For example:\n120.50\n45.25\n19.25',
    customDenomToggle: 'Enable Custom Denominations',
    savePreference: 'Remember my denomination preferences in this browser',
    selectAll: 'Select All',
    banknotes: 'Banknotes',
    coins: 'Coins',
    clearAll: 'Clear All',
    calculate: 'Calculate',
    bankTotalsTitle: 'Bank Withdrawal Summary',
    totalAmount: 'Total Amount',
    totalCount: 'Entry Count',
    personTitle: 'Per-person Cash Breakdown',
    tableName: 'Name',
    tableAmount: 'Amount',
    tableBreakdown: 'Suggested Breakdown',
    copyBank: 'Copy Bank List',
    exportImage: 'Export Image',
    exportCsv: 'Export Results (CSV)',
    disclaimerTitle: '⚠️ Disclaimer & Privacy',
    disclaimerLine1: '1. Results are for reference only. Please verify the final amounts and denomination mix manually before cash handling. The developers are not responsible for miscalculations or data loss.',
    disclaimerLine2: '2. This site uses Google Analytics for anonymous traffic analytics only and never transmits payroll names, amounts, or detail rows.',
    copiedBank: '✓ Bank list copied',
    copyFailed: '✗ Copy failed, please copy manually',
    downloadSampleSuccess: '✓ Sample CSV downloaded',
    downloadFailed: '✗ Download failed, please try again later',
    importCsvSuccess: '✓ Imported {count} rows successfully',
    exportCsvSuccess: '✓ CSV downloaded',
    noExportData: '✗ No calculation result available to export',
    emptySelection: '⚠️ Keep at least one denomination enabled.',
    keepOneSuggestion: '⚠️ Keep at least one denomination enabled. Keeping the smallest coin/note is recommended for exact breakdowns.',
    clearConfirm: 'Clear all data? This action cannot be undone.',
    emptyInputAlert: 'Paste some data before running the calculation.',
    exportUnavailable: 'html2canvas is not loaded yet',
    exportFailed: 'Export failed, please try again',
    calculateAt: 'Calculated at',
    importedFrom: 'Imported from {file}',
    activeDefaults: 'Active {currency} defaults: {denoms}',
    itemLabel: 'Item #{index}',
    unitsNote: '(recommended)',
    unitsBill: 'notes',
    unitsCoin: 'coins',
    rowError: 'Line {line} error: {message} ({raw})',
    amountLimit: 'Integer part per amount up to 999,999',
    errorInvalidInputType: 'Input must be a string',
    errorTooManyEntries: 'Entry count exceeds the limit of {max}',
    errorMissingFields: 'Missing required fields (name and amount are required)',
    errorEmptyNameOrAmount: 'Name or amount is empty',
    errorEmptyAmount: 'Amount is empty',
    errorCurrencySymbolMismatch: 'Currency symbol does not match the selected {currency}',
    errorInvalidAmountFormat: 'Invalid amount format: {value}',
    errorTooManyDecimals: 'Amount exceeds the allowed {decimals} decimal places for {currency}: {value}',
    errorAmountExceedsLimit: 'Amount exceeds the per-entry limit of {max}',
    errorAmountTooLarge: 'Amount is too large or malformed: {value}',
    errorUnparseableAmount: 'Unable to parse amount: {value}',
    errorPerPersonLimit: 'Validation error: {name} exceeds the per-person limit of {max}',
    errorTotalLimit: 'Validation error: total amount exceeds the limit of {max}',
    errorDoubleEntryMismatch: 'Critical finance warning: input total ({input}) does not match denomination breakdown total ({bank}). Difference: {diff} ({direction} {diffAbs}). Check whether the smallest denomination is missing or the selected denominations cannot fully break down the amount.',
    errorDirectionOver: 'over',
    errorDirectionUnder: 'under'
  }
};

let currentLanguage = DEFAULT_LANGUAGE;

export function getLanguage() {
  return currentLanguage;
}

export function setLanguage(language) {
  if (!dictionaries[language]) {
    throw new Error(`[Money Snap] Unsupported language: ${language}`);
  }
  currentLanguage = language;
  return currentLanguage;
}

export function interpolate(template, params = {}) {
  return String(template).replace(/\{(\w+)\}/g, (_, key) => {
    return Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : `{${key}}`;
  });
}

export function t(key, params = {}, language = currentLanguage) {
  const dict = dictionaries[language] || dictionaries[DEFAULT_LANGUAGE];
  const fallback = dictionaries[DEFAULT_LANGUAGE];
  const value = dict[key] ?? fallback[key] ?? key;
  return interpolate(value, params);
}
