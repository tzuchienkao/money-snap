# plan_v0.5.0

## 概述

本輪 v0.5.0 不是單一功能點調整，而是把原本以台幣為中心的現金拆解工具，擴充為：

- 多幣別（8 currencies）
- 雙語系（繁中 / 英文）
- 幣別感知的輸入、CSV、面額設定、錯誤訊息與匯出流程

本文件整理的是**目前程式碼已落地的實作歷程與決策結果**。

---

## 1. 主要階段

### Phase 1：多幣別核心模型抽離

**目標**

- 從單一 TWD 邏輯抽離幣別設定
- 建立可共用的 denomination / symbol / decimal profile

**落地內容**

- 新增 `src/currency.js`
- 建立 `CURRENCY_PROFILES`
- 支援 8 種貨幣：
  - TWD / USD / JPY / KRW / CNY / HKD / EUR / THB
- 補上：
  - `getCurrencyProfile()`
  - `getCurrencyDenominations()`
  - `getAllowedCurrencySymbols()`
  - `detectCurrencySymbolMismatch()`
  - `scaleAmount()` / `descaleAmount()`
  - `toMinorUnitDenominations()`

**狀態**：✅ Completed

---

### Phase 2：解析與拆解邏輯改造成幣別感知

**目標**

- 讓 parser、denomination、bank calculation 都能依當前幣別運作
- 正確支援 0 位與 2 位小數貨幣

**落地內容**

- `src/parser.js`
  - 依幣別驗證允許符號
  - 小數位數依 profile 限制
  - decimal currency 改以 minor unit `BigInt` 計算
- `src/denomination.js`
  - 針對 decimal currency 做 scaled denomination breakdown
- `src/bank.js`
  - `computeBankTotals()` 接受幣別 / 面額選項
  - `verifyDoubleEntry()` 仍作為最後財務防線

**狀態**：✅ Completed

---

### Phase 3：多語系與幣別感知文案模組化

**目標**

- 將 UI 文案從主程式抽離
- 讓 placeholder、CSV 提示、錯誤訊息能跟著語系與幣別變動

**落地內容**

- `src/i18n.js`
- `src/i18n/zh-TW.js`
- `src/i18n/en-US.js`
- `src/error-messages.js`
- `src/currency-examples.js`

**結果**

- 主畫面標題、按鈕、免責聲明、提示文案、錯誤訊息可切換中英
- CSV / 貼上範例會依幣別切換內容

**狀態**：✅ Completed

---

### Phase 4：多幣別面額偏好設定

**目標**

- 讓每個幣別都能保存自己的面額偏好
- 支援開關是否啟用自訂面額

**落地內容**

- 新增 / 擴充 `src/denomination-config.js`
- localStorage key 更新為 `money_snap_multi_currency_config_v5`
- 狀態內容包含：
  - `language`
  - `currency`
  - `saveAsDefault`
  - `currencies[code].isCustomEnabled`
  - `currencies[code].activeDenominations`

**狀態**：✅ Completed

---

### Phase 5：UI 整合

**目標**

- 在同一頁內完成語系、幣別、CSV、自訂面額與匯出整合

**落地內容**

- `index.html`
  - 新增語系 selector
  - 新增幣別 selector
  - 保留 CSV 匯入 / 範例 / 匯出
  - 面額面板依語系與幣別重建
- `src/app.js`
  - `applyLanguageAndCurrencyUI()`
  - `renderDenominationControls()`
  - `renderBankTotalsGrid()`
  - 語系切換 / 幣別切換後重算
  - 本地狀態恢復

**狀態**：✅ Completed

---

### Phase 6：驗證與回歸測試

**目標**

- 確保舊功能仍可用
- 多幣別、多語系、自訂面額不破壞原有現金對帳

**落地內容**

- `tests/test.mjs`
  - parser / aggregator / denomination / bank / i18n / config / multi-currency cases
- `tests/sample_test.mjs`
  - 整體回歸流程
- `tests/export_test.mjs`
  - 補充型匯出檢查腳本（未掛入 npm test）

**狀態**：✅ Completed

---

## 2. 關鍵決策

### 決策 A：decimal currency 全部改用 minor unit 處理

**原因**

- 直接用 JavaScript `Number` 計算小數貨幣容易出現精度誤差

**做法**

- USD / CNY / HKD / EUR / THB 皆先放大為最小貨幣單位的 `BigInt`
- 面額也同步轉成 minor unit 再做貪婪拆解

**結果**

- 雙重對帳可維持精準

---

### 決策 B：CNY / HKD 的重複面額採「去重 + 紙鈔優先」

**問題**

- `CNY` 的 `1`
- `HKD` 的 `10`

都同時出現在紙鈔與硬幣定義中。

**做法**

- `getCurrencyDenominations()` 先做去重
- UI / grid / export 順序保留第一次出現值
- 因資料來源為 `defaultBanknotes` 再接 `defaultCoins`，因此採**紙鈔優先**

**取捨**

- 優點：避免重複欄位、重複 checkbox、重複總表欄位
- 代價：無法在目前 UI 區分「同額紙鈔」與「同額硬幣」

---

### 決策 C：非自訂模式直接使用完整面額集合

**做法**

- `getCurrentCalculationDenominations()` 在 `isCustomEnabled === false` 時，回傳 `getCurrencyDenominations(currentCurrency)`

**結果**

- 關閉自訂模式時，使用者拿到的是該幣別完整面額拆解能力
- `DEFAULT_ACTIVE_BY_CURRENCY` 則成為「自訂模式預載集合」，而不是非自訂模式的實際計算集合

**取捨**

- 優點：預設情況下更容易完整拆解
- 代價：語意上與舊版「預設只啟用保守 subset」不同，文件必須明確說明

---

### 決策 D：CSV 匯入後回寫 textarea，再走既有主流程

**做法**

- CSV parse 成功後，把資料轉成 textarea 文字
- 再呼叫 `parseAndCompute()`

**結果**

- 手動輸入、貼上與 CSV 匯入共用同一條後續 UI/驗證/匯出流程

**取捨**

- 優點：流程集中、維護成本低
- 代價：原始 CSV 格式（引號、原始符號、原排序細節）不會完整保留

---

## 3. 已完成項目清單

### 核心能力

- [x] 八幣別 profile 與面額定義
- [x] 0 / 2 位小數混合處理
- [x] 幣別符號 mismatch 驗證
- [x] minor-unit 面額拆解
- [x] 雙重對帳維持可用

### UI / UX

- [x] 語系切換
- [x] 幣別切換
- [x] 幣別感知 placeholder / CSV 提示
- [x] 多幣別銀行總表欄位重建
- [x] 自訂面額面板跟著幣別切換

### 資料交換

- [x] 多幣別 CSV 範例下載
- [x] 多幣別 CSV 匯入
- [x] 多幣別 CSV 匯出
- [x] 一鍵複製銀行領款單
- [x] 領款明細圖匯出

### 狀態管理

- [x] 語系 / 幣別 / 面額偏好持久化
- [x] 輸入與計算結果本地還原
- [x] 自訂面額開關狀態保存

### 品質保證

- [x] parser 測試
- [x] denomination / bank 測試
- [x] i18n 測試
- [x] multi-currency config 測試
- [x] sample regression 測試

---

## 4. 風險與取捨

### 4.1 已知風險

1. **重複面額不可區分實體型態**
   - 例如 HKD 10 元可能是鈔也可能是幣
   - 現況採紙鈔優先，不做雙型態分流

2. **CSV 匯入與手動 parser 規則並非完全一致**
   - 文字 parser 支援負數
   - CSV parser 目前只接受非負數

3. **圖片匯出沒有自動化 UI 測試**
   - 目前依賴 `html2canvas` 與 DOM runtime

4. **版本資訊分散**
   - UI 已標示 `v0.5.0`
   - 但 `package.json` 與 `CHANGELOG.md` 尚未同步到同一版本節點

### 4.2 已接受的取捨

- 接受使用 CDN 載入 Tailwind / PapaParse / html2canvas / GA4
- 接受 CSV 匯入先正規化、再回寫 textarea 的流程
- 接受目前只提供兩種 UI 語系

---

## 5. 當前完成狀態

### 功能狀態

**核心功能已完成並可用：**

- 多幣別
- 多語系
- 幣別感知 parser
- 自訂面額設定
- CSV 匯入 / 匯出
- 銀行總表 / 個人明細
- 複製與圖片匯出
- 本地狀態保存

### 測試狀態

- `npm test` 可驗證主要核心邏輯
- export/browser runtime 仍以補充腳本與手動驗證為主

### 文件狀態

- 本輪補齊：
  - `docs/薪資現金小幫手 - 開發規格書 (v0.5.0).md`
  - `docs/plan_v0.5.0.md`

---

## 6. 結論

v0.5.0 這一輪的本質，是把產品從「單幣別現金拆解工具」升級成「多幣別、多語系、以本地隱私為核心的現金拆解工具」。  
目前程式碼面已完成主要功能；本輪剩餘工作主要偏向**版本文件同步、補充驗證與後續維護**，而不是核心功能缺口。
