# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/zh-TW/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/lang/zh-TW/).

## [Unreleased]

## [0.4.0] - 2026-08-09

### Fixed
- **驗證失敗不顯示結果**：當雙重對帳驗證失敗（輸入總額與拆解總金額不符）時，清空銀行領款總需求和個人領現明細，避免顯示錯誤的計算結果

### Changed
- **UI 互動模式調整**：自訂面額設定改為主開關 checkbox 控制模式
  - 情境 A（關閉）：顯示「已啟用預設面額：1000, 500, 100, 50, 10, 5, 1」提示，隱藏面額設定面板
  - 情境 B（開啟）：顯示完整面額設定面板，允許自訂面額組合
  - 主開關狀態儲存至 localStorage，下次開啟時自動恢復
  - 移除舊版可折疊面板按鈕機制
- **GA4 事件規範更新**：
  - 事件名稱調整：`click_toggle_denom_panel` → `toggle_custom_denom_switch`
  - 新增獨立事件：`click_select_all_paper`（紙鈔全選）、`click_select_all_coin`（硬幣全選）
  - 參數格式改為物件格式（如 `{denom_value: 1000, active: true}`），符合 GA4 最佳實踐

### Added
- **自訂面額設定功能**：新增可折疊的「⚙️ 自訂面額設定」面板
  - 支援 10 種台幣流通面額：2000/1000/500/200/100（紙鈔）+ 50/20/10/5/1（硬幣）
  - 預設啟用 7 種面額（1000/500/100/50/10/5/1），排除罕見的 2000/200/20 元
  - 面板預設收合，收合時顯示「已啟用的面額」摘要文字
  - 紙鈔/硬幣各有獨立「全選」checkbox 簡化批次操作
  - 1 元面額標示「建議保留」提示
  - 「記住我的面額偏好」功能，儲存至瀏覽器 localStorage（key: `money_snap_denom_config_v4`）
- **彈性貪婪面額拆解演算法**：支援動態面額陣列
  - 當銀行特定面額短缺時（如 50 元硬幣），系統自動改用其他小面額遞補
  - 支援排除罕見或不合宜鈔幣（如 2000 元、200 元紙鈔）
  - 防呆機制：至少保留一種面額，否則跳出警告阻止空選
  - 殘額檢查：若自訂面額無法完全拆解（如缺少 1 元），發出 console.warn 警告
- **強化雙重對帳驗證機制**：新增 `verifyDoubleEntry()` 函式
  - 確保輸入總額 = 面額拆解總額（防止面額設定錯誤導致差額）
  - 對帳失敗時顯示詳細差額資訊與明確錯誤訊息
  - 建議檢查是否漏選 1 元面額
- **銀行領款總需求顯示擴充**：新增 2000/200/20 元面額顯示（共 10 種）
- 新增 `src/denomination-config.js` 模組專責面額設定管理
  - 提供 `loadDenomConfig()`、`saveDenomConfig()`、`getActiveDenominations()` 等 API
  - 支援 localStorage 持久化與容錯機制

### Enhanced
- **面額拆解模組升級**（`src/denomination.js`）：
  - `breakdownAmount()` 支援彈性面額陣列參數
  - 強制由大至小排序，確保貪婪演算法正確運作
  - 防呆檢查：空陣列拋出錯誤「請至少選擇一種有效面額進行計算！」
  - 殘額檢查：remainder > 0 時發出 console.warn 警告
  - 更新 JSDoc 註解說明彈性面額用法與 v0.4.0 新增功能
- **銀行計算模組升級**（`src/bank.js`）：
  - `computeBankTotals()` 接收動態 denominations 參數
  - 整合雙重對帳驗證邏輯至主計算流程
  - Export `verifyDoubleEntry()` 供外部呼叫
- **主應用程式整合**（`src/app.js`）：
  - 匯入 denomination-config 模組
  - 監聽面額 checkbox 變更事件，即時更新內部設定與 UI 摘要
  - 監聽紙鈔/硬幣「全選」checkbox，批次切換該類別所有面額
  - 防空選機制：至少保留一個面額，否則跳出 Toast 提示並阻止操作
  - 計算時傳入當前啟用面額至 `computeBankTotals()`
  - 動態更新所有 10 種面額顯示（未啟用面額顯示 0）
  - 狀態持久化：面額設定變更時若啟用「記住偏好」則自動儲存

### GA4 Events
- `click_toggle_denom_panel`：展開/收合面額面板（參數: `status: 'open'|'close'`）
- `change_custom_denomination`：勾選/取消特定面額（參數: `denom_value: number, active: boolean`）
- `toggle_save_denom_preference`：切換「記住偏好」（參數: `enabled: boolean`）

### Technical
- 新增 9 個 v0.4.0 測試案例（`tests/test.mjs`）：
  - 銀行 50 元硬幣短缺情境
  - 排除 2000/200 元鈔票情境
  - 彈性面額拆解（排除多種面額）
  - 防呆檢查（空陣列拋錯）
  - 殘額檢查（無 1 元導致殘額）
  - 雙重對帳驗證（成功/失敗情境）
  - `computeBankTotals` 使用彈性面額
  - `aggregateBreakdowns` 使用彈性面額
- 所有測試案例通過（npm test）
- localStorage key 更新為 `money_snap_denom_config_v4`
- UI 使用 Tailwind CSS 樣式確保與現有介面一致

### Security & Privacy
- 維持 100% 本地運算承諾，面額設定完全於瀏覽器執行
- localStorage 僅儲存面額設定（無敏感資料）
- GA4 僅追蹤動作（面額值、開關狀態），不含金額或姓名數據

### Documentation
- 更新 `index.html`：版本號至 v0.4.0
- 更新 CHANGELOG.md：新增 [0.4.0] 版本記錄
- 所有模組 JSDoc 註解完整標註 v0.4.0 新增功能
- 計劃文件：`plan_v0.4.0.md`（已儲存至 session 資料夾）

## [0.3.0] - 2026-08-09

### Added
- **CSV 匯入功能**：整合 PapaParse v5.4.1，支援上傳 CSV 檔案快速匯入資料
  - 自動處理千分位逗號（如 45,800）
  - 自動清除貨幣符號（如 $32,000）
  - 完美支援 RFC 4180 規範（處理雙引號與特殊字元）
  - 自動跳過表頭列（如「姓名」、「金額」等關鍵字）
  - 同名自動加總
  - 雙模式支援（含姓名/純金額）
- **CSV 範例下載**：一鍵下載標準格式範例檔（UTF-8 BOM）
  - 包含表頭與 3 筆範例資料
  - 確保 Windows/Mac Excel 開啟無亂碼
- **CSV 匯出功能**：將計算結果匯出為標準 CSV 檔案
  - 包含個人明細列與總計列
  - 動態檔名（MoneySnap_面額明細_YYYYMMDD.csv）
  - UTF-8 BOM 編碼確保無亂碼
- 新增 `src/csv.js` 模組專責 CSV 功能
- 新增 CSV 相關 UI 元素（匯入按鈕、範例下載按鈕、匯出按鈕）
- 新增 CSV 格式小提示區塊

### Enhanced
- **CSV 驗證對齊手動輸入規則**：
  - 最多匯入 1000 筆資料（與手動輸入限制一致）
  - 單筆金額上限 999,999（六位數，與手動輸入限制一致）
  - 詳細錯誤訊息顯示行號、原始值與姓名
- **CSV 匯入來源標籤**：匯入成功後在輸入框 label 旁顯示「資料來源由 {filename} 匯入」
- **CSV 範例檔案格式修正**：金額包含千分位時用雙引號包住（如："45,800"），避免被誤判為欄位分隔符
- **CSV 格式提示優化**：更新小提示文字，明確說明包含千分位的金額需用雙引號包住
- 強化錯誤處理機制：
  - 檔案類型驗證（僅接受 .csv）
  - 檔案大小限制（1MB 上限）
  - 空檔案檢測
  - 無效資料列詳細錯誤訊息（含行號、原始值）
  - 超過筆數/金額上限時明確提示
- 優化按鈕狀態管理：`exportCsvBtn` 與其他匯出按鈕同步啟用/停用
- 改善 Toast 通知訊息顯示：錯誤訊息延長至 8 秒，支援多行滾動顯示

### Technical
- 整合 PapaParse v5.4.1 (via CDN)
- 更新 `index.html`：
  - 加入 PapaParse CDN 與 CSV UI 元素
  - 新增 `csvSourceLabel` 顯示匯入來源檔案名稱
  - 優化 Toast 樣式（`white-space: pre-wrap`、`max-height: 400px`、`overflow-y: auto`）
- 更新 `app.js`：
  - 整合 CSV 匯入/匯出事件處理與狀態管理
  - 新增 `csvSourceLabel` DOM 元素引用
  - CSV 匯入成功後顯示檔案名稱
  - 手動輸入或清除資料時自動清除來源標籤
- 更新 `csv.js`：
  - CSV 驗證加入 1000 筆上限檢查
  - CSV 驗證加入 999,999 金額上限檢查
  - 範例檔案中金額用雙引號包住（RFC 4180 標準）
  - 錯誤訊息收集機制改良（顯示前 5 個，支援摘要）
- 新增 `latestSummaryResult` 全域狀態變數用於 CSV 匯出
- 檔案上傳採用隱藏 `<input type="file">` + 按鈕觸發方式
- Blob URL 自動清理機制（防止記憶體洩漏）

### GA4 Events
- `click_download_sample`：下載 CSV 範例檔案
- `click_import_csv`：成功匯入 CSV 檔案
- `click_export_csv`：匯出計算結果為 CSV

### Security & Privacy
- 維持 100% 本地運算承諾，CSV 處理完全於瀏覽器執行
- 無任何資料上傳至伺服器
- PapaParse 為純前端套件，無外部依賴

### Documentation
- 更新 README.md：新增 CSV 功能說明章節
- 更新技術說明：記錄 PapaParse 整合資訊
- 更新當前版本至 v0.3.0

## [0.2.0] - 2026-08-07

### Added
- 雙模式文本解析器：支援「含姓名模式」與「純金額模式」彈性切換
- 新增 UI 切換開關：「貼上資料包含姓名欄位」checkbox，預設勾選
- 純金額模式：每行僅需輸入數字，系統自動編號為「項目 #1」、「項目 #2」等
- 一鍵複製銀行領款單功能：格式化純文字輸出，方便貼到 Excel 或記事本
- 複製成功後顯示 Toast 提示訊息（2 秒後自動消失）
- 動態格式說明：根據模式切換顯示不同的輸入提示文字

### Enhanced
- 強化雙重對帳機制：對帳失敗時顯示詳細差額資訊（輸入總額 vs 拆解總額）
- 優化 GA4 事件追蹤：新增 `click_copy_bank`（複製銀行領款單）與 `toggle_name_mode`（切換姓名模式）事件
- 改善錯誤訊息顯示：提供更明確的差額提示，協助人工核對

### Technical
- 更新 `parser.js`：新增 `hasNameFlag` 參數支援雙模式解析
- 更新 `app.js`：整合模式切換邏輯與一鍵複製功能
- 採用 Clipboard API (`navigator.clipboard.writeText`) 實現剪貼簿功能
- 測試套件擴充：新增雙模式解析、邊界測試與容錯測試案例

### Security & Privacy
- 維持 100% 本地運算承諾，零數據外傳
- GA 事件追蹤絕不包含 PII（個資）或業務數據
- 複製功能僅處理本地格式化文字，不經過伺服器

## [0.1.0] - 2026-07-18

### Added
- 支援 PWA (Progressive Web App)，可安裝至桌面與手機並支援離線使用
- 新增 Web App Manifest (`manifest.json`)，設定應用程式名稱、獨立視窗模式與主題色彩
- 新增應用程式圖標（192x192, 512x512 遮罩式與一般圖標）
- 實作 Service Worker (`sw.js`)，採用 Cache-First 快取策略支援離線存取與自動更新

### Technical
- 於 `app.js` 整合 Service Worker 註冊邏輯與離線狀態管理

## [0.0.1] - 2026-07-17

### Added
- 專案初始化
- 基礎解析器（parser.js）
- 資料聚合器（aggregator.js）
- 面額拆解邏輯（denomination.js）
- 銀行統計邏輯（bank.js）
- 測試套件（Mocha + Chai）
- 基本 UI 介面
- 初始 MVP 版本釋出
- 支援從試算表貼上資料（Tab 分隔）
- 支援手動輸入（逗號分隔，全形/半形皆可）
- 同名自動加總功能
- 智能面額拆解建議（1000/500/100/50/10/5/1）
- 銀行領款總需求統計
- 圖片匯出功能（含時間浮水印）
- 錯誤行自動高亮提示
- 按鈕狀態管理（無資料時自動禁用）
- 狀態持久化（localStorage）
- 計算時間戳顯示與記錄
- 快門閃光效果（匯出時視覺優化）
- 完整狀態恢復（重整後保留明細與時間戳）

### Technical
- 實作 BigInt 支援與序列化
- 自訂 textarea 錯誤選取顏色
- html2canvas 圖片匯出
- localStorage 資料持久化
- Git hooks 自動 Co-authored-by

### UI/UX
- 按鈕佈局優化（左右分散對齊）
- 錯誤訊息位置調整（textarea 下方）
- 格式說明前置顯示
- 時間戳右側對齊顯示
- 按鈕彩度降低（禁用狀態視覺回饋）
- 快門閃光動畫（80ms）

### Fixed
- 修復 BigInt 無法儲存到 localStorage 問題
- 修復重整後時間戳更新為當前時間的問題
- 修復輸入修改後過期狀態未清除的問題

---

[Unreleased]: https://github.com/tzuchienkao/money-snap/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/tzuchienkao/money-snap/releases/tag/v0.4.0
[0.3.0]: https://github.com/tzuchienkao/money-snap/releases/tag/v0.3.0
[0.2.0]: https://github.com/tzuchienkao/money-snap/releases/tag/v0.2.0
[0.1.0]: https://github.com/tzuchienkao/money-snap/releases/tag/v0.1.0
[0.0.1]: https://github.com/tzuchienkao/money-snap/releases/tag/v0.0.1
