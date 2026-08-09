// src/csv.js
// CSV 匯入/匯出模組
// 負責 PapaParse 整合、CSV 檔案解析、範例下載、計算結果匯出
// Export:
// - downloadSampleCsv() - 下載標準範例 CSV 檔案（UTF-8 BOM）
// - parseCsvFile(file, hasNameFlag, callback) - 解析上傳的 CSV 檔案
// - exportResultsToCsv(summaryResult) - 匯出計算結果為 CSV

/**
 * @typedef {Object} ParsedItem
 * @property {string} id - 唯一識別碼
 * @property {string} name - 姓名或項目名稱
 * @property {number} amount - 應發總金額（正整數）
 * @property {boolean} [isMerged] - 是否經過同名合併
 * @property {number} [mergedCount] - 合併筆數
 */

/**
 * @typedef {Object} BreakdownResult
 * @property {ParsedItem} person - 人員資訊
 * @property {Record<number, number>} breakdown - 面額分布（面額 -> 張/個數）
 */

/**
 * @typedef {Object} SummaryResult
 * @property {number} totalAmount - 本次發放總金額
 * @property {number} totalCount - 總發放人次/筆數
 * @property {Record<number, number>} bankTotals - 銀行領款各面額張/個數
 * @property {BreakdownResult[]} items - 各個人薪資袋面額明細
 */

/**
 * 檢查 PapaParse 是否已載入
 * @private
 * @returns {boolean} 是否可用
 */
function isPapaParseAvailable() {
  return typeof window.Papa !== 'undefined' && typeof window.Papa.parse === 'function';
}

/**
 * 下載帶有 UTF-8 BOM 的標準範例 CSV 檔案（防止 Excel 開啟亂碼）
 * 
 * 檔案內容包含：
 * - 表頭列（姓名,應發金額）
 * - 3 筆範例資料（含千分位與貨幣符號測試）
 * 
 * @throws {Error} 若瀏覽器不支援 Blob 或下載功能
 * 
 * @example
 * downloadSampleCsv(); // 觸發瀏覽器下載 MoneySnap_匯入範例.csv
 */
export function downloadSampleCsv() {
  try {
    // UTF-8 BOM (\uFEFF) + 表頭 + 範例資料
    // 金額用雙引號包住，避免千分位逗號被誤認為分隔符
    const sampleContent = '\uFEFF姓名,應發金額\n張三,"45,800"\n李四,"$32,000"\n王五,18500';
    const blob = new Blob([sampleContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (typeof link.download === 'undefined') {
      throw new Error('您的瀏覽器不支援檔案下載功能');
    }
    
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'MoneySnap_匯入範例.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up blob URL
    setTimeout(() => URL.revokeObjectURL(link.href), 100);
    
    console.log('[CSV] 已下載範例檔案');
  } catch (error) {
    console.error('[CSV] 下載範例檔案失敗:', error);
    throw error;
  }
}

/**
 * 處理上傳的 CSV 檔案並解析為標準化項目陣列
 * 
 * 支援功能：
 * - 雙模式解析（含姓名/純金額）
 * - 同名自動加總（大小寫敏感）
 * - 自動過濾非數字字元（$, 千分位逗號）
 * - 跳過表頭列（如「姓名」、「金額」等關鍵字）
 * - 過濾 0 元或負數項目
 * 
 * @param {File} file - 要解析的 CSV 檔案物件
 * @param {boolean} hasNameFlag - 是否包含姓名欄位（true: 含姓名模式; false: 純金額模式）
 * @param {Function} callback - 解析完成後的回調函式，接收 ParsedItem[] 參數
 * @param {Function} errorCallback - 錯誤回調函式，接收錯誤訊息字串
 * 
 * @example
 * parseCsvFile(fileObject, true, (items) => {
 *   console.log('解析成功:', items);
 * }, (error) => {
 *   console.error('解析失敗:', error);
 * });
 */
export function parseCsvFile(file, hasNameFlag, callback, errorCallback) {
  if (!isPapaParseAvailable()) {
    errorCallback('CSV 解析套件尚未載入，請稍後再試');
    return;
  }
  
  // Additional validation
  if (!file || !(file instanceof File)) {
    errorCallback('無效的檔案物件');
    return;
  }
  
  if (file.size === 0) {
    errorCallback('檔案為空，請選擇包含資料的 CSV 檔案');
    return;
  }
  
  window.Papa.parse(file, {
    skipEmptyLines: true,
    encoding: 'UTF-8',
    complete: function(results) {
      try {
        if (!results || !results.data) {
          errorCallback('CSV 檔案格式錯誤，無法解析');
          return;
        }
        
        const parsedItems = [];
        const nameMap = new Map();
        let itemCounter = 1;
        let validRowCount = 0;
        const errors = []; // 收集錯誤資訊
        const warnings = []; // 收集警告資訊（非致命）
        
        // 常見表頭關鍵字（用於過濾表頭列）
        const headerKeywords = ['姓名', '名字', 'name', '金額', '薪資', '應發', 'amount', 'salary'];
        
        results.data.forEach((row, rowIndex) => {
          const lineNumber = rowIndex + 1; // 1-based line number
          
          if (!row || row.length === 0) return;
          
          let name = '';
          let rawAmountStr = '';
          let isHeaderRow = false;
          
          if (hasNameFlag) {
            // 含姓名模式：第一欄為姓名，第二欄為金額
            name = row[0] ? String(row[0]).trim() : '';
            rawAmountStr = row[1] !== undefined ? String(row[1]) : '';
            
            // 跳過表頭列（檢查姓名或金額是否為關鍵字）
            if (headerKeywords.some(kw => name.toLowerCase().includes(kw.toLowerCase()) || 
                                          rawAmountStr.toLowerCase().includes(kw.toLowerCase()))) {
              isHeaderRow = true;
              return;
            }
            
            // Validate row has enough columns
            if (row.length < 2) {
              errors.push(`第 ${lineNumber} 行：欄位不足（需要姓名與金額兩欄）`);
              return;
            }
            
            if (!name) {
              errors.push(`第 ${lineNumber} 行：姓名欄位為空`);
              return;
            }
            
            if (!rawAmountStr || rawAmountStr.trim() === '') {
              errors.push(`第 ${lineNumber} 行：金額欄位為空（姓名：${name}）`);
              return;
            }
          } else {
            // 純金額模式：整列為金額，姓名自動編號
            rawAmountStr = String(row[0]);
            
            // 跳過表頭列
            if (headerKeywords.some(kw => rawAmountStr.toLowerCase().includes(kw.toLowerCase()))) {
              isHeaderRow = true;
              return;
            }
            
            if (!rawAmountStr || rawAmountStr.trim() === '') {
              errors.push(`第 ${lineNumber} 行：金額欄位為空`);
              return;
            }
            
            name = `項目 #${itemCounter}`;
            itemCounter++;
          }
          
          // 自動過濾非數字字元（如 $, ,, 空白）
          const cleanedAmount = rawAmountStr.replace(/[^\d]/g, '');
          
          // 檢查清理後是否還有數字
          if (cleanedAmount === '') {
            errors.push(`第 ${lineNumber} 行：金額格式錯誤，無法解析為數字（原始值：「${rawAmountStr}」${hasNameFlag ? `，姓名：${name}` : ''}）`);
            return;
          }
          
          const amount = parseInt(cleanedAmount, 10);
          
          // 檢查金額是否有效
          if (isNaN(amount) || amount <= 0) {
            errors.push(`第 ${lineNumber} 行：金額必須為正整數（原始值：「${rawAmountStr}」${hasNameFlag ? `，姓名：${name}` : ''}）`);
            return;
          }
          
          // 檢查金額是否超過六位數上限（999,999）
          if (amount > 999999) {
            errors.push(`第 ${lineNumber} 行：金額超過單筆上限 999,999（原始值：「${rawAmountStr}」${hasNameFlag ? `，姓名：${name}` : ''}）`);
            return;
          }
          
          validRowCount++;
          
          // 同名加總邏輯
          if (hasNameFlag && nameMap.has(name)) {
            const existing = nameMap.get(name);
            existing.amount += amount;
            existing.mergedCount += 1;
            existing.isMerged = true;
            warnings.push(`第 ${lineNumber} 行：姓名「${name}」重複，已自動加總金額`);
          } else {
            const itemObj = {
              id: `item-${parsedItems.length}`,
              name: name,
              amount: amount,
              isMerged: false,
              mergedCount: 1
            };
            nameMap.set(name, itemObj);
            parsedItems.push(itemObj);
          }
        });
        
        // 如果有錯誤，顯示詳細錯誤訊息
        if (errors.length > 0) {
          const errorSummary = `CSV 檔案包含 ${errors.length} 個錯誤：\n\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n... 還有 ${errors.length - 5} 個錯誤` : ''}`;
          errorCallback(errorSummary);
          return;
        }
        
        // 如果沒有有效資料
        if (parsedItems.length === 0) {
          errorCallback('CSV 檔案中沒有有效的資料行，請檢查檔案格式');
          return;
        }
        
        // 檢查資料筆數是否超過上限 1000 筆
        if (parsedItems.length > 1000) {
          errorCallback(`CSV 檔案包含 ${parsedItems.length} 筆資料，超過上限 1000 筆`);
          return;
        }
        
        // 成功：記錄警告（如果有）
        if (warnings.length > 0) {
          console.log(`[CSV] 警告：${warnings.join('; ')}`);
        }
        
        console.log(`[CSV] 解析成功：共 ${parsedItems.length} 筆資料（處理 ${validRowCount} 筆有效行）`);
        callback(parsedItems);
      } catch (err) {
        console.error('[CSV] 解析過程發生錯誤:', err);
        errorCallback(`CSV 解析失敗：${err.message || '未知錯誤'}`);
      }
    },
    error: function(err) {
      console.error('[CSV] PapaParse 錯誤:', err);
      errorCallback(`CSV 檔案讀取失敗：${err.message || '檔案格式可能不正確'}`);
    }
  });
}

/**
 * 將計算結果匯出為 CSV 檔案（包含個人明細與總計列）
 * 
 * 匯出格式：
 * - 表頭列：姓名,應領金額,2000元,1000元,500元,200元,100元,50元,20元,10元,5元,1元
 * - 個人明細列：逐一轉出每筆記錄及對應面額數量
 * - 總計列：姓名欄為「總計」，記錄總金額與銀行領款總面額需求
 * - 編碼：UTF-8 BOM（確保 Excel 開啟無亂碼）
 * - 檔名：MoneySnap_面額明細_YYYYMMDD.csv
 * 
 * @param {SummaryResult} summaryResult - 計算結果物件
 * @param {Function} successCallback - 成功回調函式
 * @param {Function} errorCallback - 錯誤回調函式
 * 
 * @example
 * exportResultsToCsv(summaryResult, 
 *   () => console.log('匯出成功'),
 *   (error) => console.error('匯出失敗:', error)
 * );
 */
export function exportResultsToCsv(summaryResult, successCallback, errorCallback) {
  if (!isPapaParseAvailable()) {
    errorCallback('CSV 解析套件尚未載入，請稍後再試');
    return;
  }
  
  if (!summaryResult || !summaryResult.items || summaryResult.items.length === 0) {
    errorCallback('目前沒有可匯出的計算結果，請先執行計算');
    return;
  }
  
  try {
    // Validate summaryResult structure
    if (typeof summaryResult.totalAmount === 'undefined' || !summaryResult.bankTotals) {
      throw new Error('計算結果資料結構不完整');
    }
    
    // 標準面額列表（與規格書一致）
    const denoms = [2000, 1000, 500, 200, 100, 50, 20, 10, 5, 1];
    
    // 1. 組裝個人資料列
    const exportRows = summaryResult.items.map((item, index) => {
      if (!item.person || typeof item.person.name === 'undefined' || typeof item.person.amount === 'undefined') {
        throw new Error(`第 ${index + 1} 筆資料格式錯誤`);
      }
      
      const row = {
        '姓名': item.person.name,
        '應領金額': item.person.amount
      };
      denoms.forEach(d => {
        row[`${d}元`] = item.breakdown[d] || 0;
      });
      return row;
    });
    
    // 2. 附加最後一列「總計」
    const totalRow = {
      '姓名': '總計',
      '應領金額': summaryResult.totalAmount
    };
    denoms.forEach(d => {
      totalRow[`${d}元`] = summaryResult.bankTotals[d] || 0;
    });
    exportRows.push(totalRow);
    
    // 3. 使用 PapaParse 自動格式化成符合 RFC 4180 的 CSV 字串
    const csvText = window.Papa.unparse(exportRows);
    
    if (!csvText || csvText.trim().length === 0) {
      throw new Error('CSV 資料產生失敗');
    }
    
    // 4. 加上 \uFEFF BOM 標頭並下載 Blob
    const blob = new Blob(['\uFEFF' + csvText], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (typeof link.download === 'undefined') {
      throw new Error('您的瀏覽器不支援檔案下載功能');
    }
    
    const now = new Date();
    const dateStr = now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0');
    
    const fileName = `MoneySnap_面額明細_${dateStr}.csv`;
    
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up blob URL
    setTimeout(() => URL.revokeObjectURL(link.href), 100);
    
    console.log(`[CSV] 匯出成功：${fileName}（共 ${summaryResult.items.length} 筆資料）`);
    successCallback();
  } catch (err) {
    console.error('[CSV] 匯出過程發生錯誤:', err);
    errorCallback(`CSV 匯出失敗：${err.message || '未知錯誤'}`);
  }
}
