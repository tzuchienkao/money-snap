# Money Snap v0.3.0 - CSV 功能實作計劃

## 專案概述

本計劃旨在為 Money Snap 兌幣計算機實作 v0.3.0 規格書中定義的三大 CSV 相關功能：

1. **CSV 匯入功能** - 整合 PapaParse 解析上傳的 CSV 檔案
2. **CSV 範例下載** - 提供標準格式範例檔（UTF-8 BOM）
3. **CSV 匯出功能** - 將計算結果匯出為 CSV（包含個人明細與總計列）

## 當前架構分析

### 現有模組結構
- `src/parser.js` - 文字解析器，已支援雙模式（含姓名/純金額）
- `src/aggregator.js` - 同名合併與加總
- `src/denomination.js` - 面額拆解演算法
- `src/bank.js` - 銀行領款總計
- `src/app.js` - 主要應用邏輯與 DOM 操作
- `index.html` - UI 介面（目前無 CSV 相關元素）

### 技術堆疊
- Pure Vanilla JavaScript (ES6+)
- Tailwind CSS (via CDN)
- html2canvas（已整合用於圖片匯出）
- **待整合：PapaParse v5.4+ (via CDN)**

## 實作方案

### 架構設計決策

#### 1. PapaParse 整合方式
- **採用 CDN 引入**（與 html2canvas 保持一致）
- CDN URL: `https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js`
- 在 `index.html` 中引入，與 html2canvas 並列

#### 2. 模組職責劃分
- 新增 `src/csv.js` 模組，專責處理 CSV 相關功能：
  - `parseCsvFile(file, hasNameFlag, callback)` - CSV 檔案解析
  - `downloadSampleCsv()` - 範例檔案下載
  - `exportResultsToCsv(summaryResult)` - 計算結果匯出
- `src/parser.js` 維持純文字解析職責，不涉及檔案處理
- `src/app.js` 負責整合 CSV 功能與 UI 互動

#### 3. 資料流設計
```
CSV 上傳 → PapaParse 解析 → 轉換為標準 ParsedItem[] 
         → 複用現有 aggregator + denomination 邏輯 
         → 顯示結果

計算完成 → 點擊匯出 CSV → 組裝 CSV 資料結構 
         → PapaParse.unparse() → 加 BOM → 下載
```

### UI 變更規劃

根據規格書 Section 5（Pure Text UI 線稿），需要在資料輸入區塊新增：

1. **CSV 檔案匯入按鈕**
   - 位置：「貼上/匯入資料包含姓名欄位」勾選框下方
   - 樣式：綠色邊框按鈕 + 檔案圖示
   - 功能：觸發隱藏的 `<input type="file" accept=".csv">`

2. **下載 CSV 範例按鈕**
   - 位置：CSV 檔案匯入按鈕旁邊
   - 樣式：綠色邊框按鈕 + 連結圖示
   - 功能：下載 UTF-8 BOM 編碼的範例檔案

3. **匯出 CSV 按鈕**
   - 位置：「個人領現明細」區塊下方
   - 樣式：綠色邊框按鈕 + 匯出圖示
   - 功能：將計算結果匯出為 CSV

4. **CSV 格式小提示**
   - 位置：CSV 匯入按鈕下方
   - 內容：「💡 CSV 與貼上格式小提示：...」（如規格書所定義）

## 實作工作項目

### Phase 1: 基礎建設

#### csv-infra-papaparse
**建立 CSV 模組與 PapaParse 整合**
- 在 `index.html` 中引入 PapaParse CDN
- 創建 `src/csv.js` 模組檔案
- 建立基礎模組結構與 JSDoc 型別定義
- 確保 PapaParse 全域物件 `Papa` 可用

#### csv-infra-ui-elements
**新增 CSV 相關 UI 元素到 HTML**
- 在資料輸入區塊新增 CSV 匯入按鈕與隱藏 file input
- 新增「下載 CSV 範例」按鈕
- 新增 CSV 格式小提示區塊
- 在個人領現明細區塊新增「匯出 CSV」按鈕
- 套用 Tailwind CSS 樣式（與現有按鈕保持一致）

### Phase 2: CSV 匯入功能

#### csv-import-sample-download
**實作範例 CSV 檔案下載功能**
- 在 `src/csv.js` 實作 `downloadSampleCsv()` 函式
- 生成帶 UTF-8 BOM (`\uFEFF`) 的範例內容
- 檔名：`MoneySnap_匯入範例.csv`
- 範例內容包含表頭與 3 筆範例資料（含千分位與貨幣符號測試）
- 在 `src/app.js` 綁定下載按鈕點擊事件
- 加入 GA4 追蹤事件 `click_download_sample`

#### csv-import-parser
**實作 CSV 檔案解析核心邏輯**
- 在 `src/csv.js` 實作 `parseCsvFile(file, hasNameFlag, callback)` 函式
- 使用 `Papa.parse()` 解析檔案（`skipEmptyLines: true`）
- 實作雙模式解析邏輯（含姓名/純金額）
- 實作同名自動加總（使用 Map）
- 過濾表頭行（「姓名」、「金額」等關鍵字）
- 自動清理貨幣符號與千分位逗號
- 處理錯誤情況（顯示錯誤橫幅）
- 回傳標準化 `ParsedItem[]` 格式

#### csv-import-integration
**整合 CSV 匯入至主應用流程**
- 在 `src/app.js` 綁定 file input 的 `change` 事件
- 接收解析結果並轉換為應用內部格式
- 複用現有的 `aggregator` 與 `denomination` 邏輯
- 將解析後的資料填入 `inputArea` 或直接觸發計算
- 更新 UI 狀態與按鈕啟用狀態
- 加入 GA4 追蹤事件 `click_import_csv`

### Phase 3: CSV 匯出功能

#### csv-export-data-structure
**設計匯出資料結構**
- 定義 CSV 匯出欄位結構（如規格書 Section 4.4）
  - 表頭：姓名, 應領金額, 2000元, 1000元, 500元, 200元, 100元, 50元, 20元, 10元, 5元, 1元
  - 個人明細列：逐筆記錄面額分布
  - 總計列：姓名欄為「總計」，彙總所有面額
- 在 `src/csv.js` 新增 `exportResultsToCsv(summaryResult)` 函式

#### csv-export-implementation
**實作 CSV 匯出核心邏輯**
- 從 `summaryResult` 組裝匯出資料陣列
- 為每個人員建立資料列物件（含所有面額欄位）
- 追加總計列（使用 `summaryResult.bankTotals`）
- 使用 `Papa.unparse()` 轉換為 CSV 字串（自動處理 RFC 4180）
- 加上 UTF-8 BOM (`\uFEFF`)
- 生成動態檔名：`MoneySnap_面額明細_YYYYMMDD.csv`
- 建立 Blob 並觸發下載

#### csv-export-integration
**整合 CSV 匯出功能至 UI**
- 在 `src/app.js` 中儲存最新的 `summaryResult` 至全域狀態
- 綁定「匯出 CSV」按鈕點擊事件
- 驗證是否有可匯出的資料（顯示錯誤訊息若無）
- 呼叫 `exportResultsToCsv()` 執行匯出
- 顯示成功 toast 通知
- 加入 GA4 追蹤事件 `click_export_csv`

### Phase 4: 整合測試與最佳化

#### csv-testing-manual
**手動測試各種 CSV 情境**
- 測試包含千分位逗號的 CSV（如 "45,800"）
- 測試包含貨幣符號的 CSV（如 "$32,000"）
- 測試包含雙引號的 CSV（如 "\"32,000\""）
- 測試 Excel 直接另存 CSV 匯入
- 測試純金額模式 CSV 匯入
- 測試同名合併功能
- 測試匯出後的 CSV 在 Excel 開啟（確認無亂碼）
- 測試邊界條件（空檔案、超大檔案、格式錯誤）

#### csv-error-handling
**強化錯誤處理與使用者回饋**
- 檔案大小限制檢查（建議上限 1MB）
- 檔案類型驗證（僅接受 .csv）
- 解析失敗時顯示友善錯誤訊息
- 空檔案或無有效資料時提示使用者
- 匯出失敗時顯示錯誤 toast
- 確保所有錯誤情況不會導致應用崩潰

#### csv-ui-polish
**UI/UX 優化**
- 確保 CSV 相關按鈕與現有按鈕樣式一致
- 匯入中顯示 loading 指示（若檔案較大）
- 優化按鈕啟用/停用邏輯
- 確保 CSV 格式小提示清晰易讀
- 行動裝置響應式佈局調整

#### csv-documentation
**文件與註解**
- 為 `src/csv.js` 所有函式補充完整 JSDoc
- 更新 README.md 說明 CSV 功能使用方式
- 記錄已知限制與相容性資訊
- 更新版本號至 v0.3.0

## 技術考量與限制

### 瀏覽器相容性
- PapaParse 支援所有現代瀏覽器（IE10+）
- File API 支援：Chrome 13+, Firefox 3.6+, Safari 6+
- Blob download 支援：Chrome 14+, Firefox 20+, Safari 10+

### 效能考量
- PapaParse 純前端解析，大檔案（>10MB）可能較慢
- 建議限制檔案大小上限為 1MB（約 20,000+ 筆資料）
- 已有 MAX_ENTRIES (1000) 限制可防止過載

### 安全性
- 100% 本地端運算，無資料上傳
- 僅接受 .csv 檔案，防止惡意檔案上傳
- 使用 PapaParse 的安全解析模式（無 eval）

## 成功驗收標準

### 功能驗收
- ✅ 可成功上傳並解析標準 CSV 檔案
- ✅ 可下載範例 CSV 檔案且 Excel 開啟無亂碼
- ✅ 可匯出計算結果為 CSV 且格式正確
- ✅ 同名自動加總功能正常運作
- ✅ 千分位逗號、貨幣符號、雙引號正確處理
- ✅ 雙模式（含姓名/純金額）皆可正常匯入
- ✅ 所有 GA4 追蹤事件正確觸發

### 品質驗收
- ✅ 無 console 錯誤或警告
- ✅ 錯誤處理完善，不會崩潰
- ✅ UI 樣式與現有設計一致
- ✅ 程式碼有完整 JSDoc 註解
- ✅ 符合專案 coding style

## 預期產出

- `src/csv.js` - 新模組（約 200-300 行）
- `index.html` - 更新 UI 元素與 PapaParse CDN
- `src/app.js` - 新增 CSV 功能整合邏輯（約 100 行）
- 更新後的 `README.md` 與 `CHANGELOG.md`
- 手動測試結果報告

## 依賴關係圖

```
csv-infra-papaparse
    ↓
csv-infra-ui-elements
    ↓
csv-import-sample-download ← 獨立分支
    ↓
csv-import-parser
    ↓
csv-import-integration
    ↓
csv-export-data-structure
    ↓
csv-export-implementation
    ↓
csv-export-integration
    ↓
csv-testing-manual
    ↓
csv-error-handling
    ↓
csv-ui-polish
    ↓
csv-documentation
```

## 風險與應對

### 風險 1: PapaParse CDN 載入失敗
- **應對**: 偵測 `window.Papa` 是否存在，若無則顯示錯誤訊息並停用 CSV 功能
- **備案**: 考慮 fallback 到本地 papaparse.min.js 備份

### 風險 2: Excel 開啟匯出的 CSV 出現亂碼
- **應對**: 確保所有 Blob 都加上 UTF-8 BOM (`\uFEFF`)
- **測試**: 在 Windows Excel 與 Mac Excel 雙平台測試

### 風險 3: 大檔案解析效能問題
- **應對**: 加入檔案大小檢查（1MB 上限）
- **優化**: 若未來需要，可考慮 Web Worker 背景解析

## 時程建議

- **Phase 1 (基礎建設)**: 0.5 天
- **Phase 2 (CSV 匯入)**: 1 天
- **Phase 3 (CSV 匯出)**: 0.5 天
- **Phase 4 (測試優化)**: 1 天
- **總計**: 約 3 天開發時程（不含 code review）

## 參考資料

- [PapaParse 官方文件](https://www.papaparse.com/docs)
- [RFC 4180 CSV 標準](https://tools.ietf.org/html/rfc4180)
- [UTF-8 BOM 說明](https://en.wikipedia.org/wiki/Byte_order_mark)
- Money Snap v0.3.0 開發規格書
