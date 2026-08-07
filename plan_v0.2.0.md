# Money Snap v0.2.0 實作計劃

## 一、問題陳述與目標

依據「薪資現金小幫手 - 開發規格書 (v0.2.0).md」規格，專案需要在現有 MVP v0.1.0 基礎上新增雙模式輸入解析、強化對帳機制、優化 GA 事件追蹤，並新增一鍵複製銀行領款單功能。核心目標是提升系統彈性與用戶體驗，同時保持財務資料的嚴格驗證與本地化運算的安全性承諾。

## 二、優先實作順序與項目細節

### **優先級 P0 (首要) - 雙模式文本解析器**

#### 1. 實作 UI 切換開關
- **檔案**: `index.html`
- **位置**: 資料輸入區塊（textarea 上方）
- **需求**: 
  - 新增 checkbox `<input type="checkbox" id="hasNameFlag" checked>`
  - Label 文字：「☑ 貼上資料包含姓名欄位（取消勾選即可貼上純金額）」
  - 預設勾選（hasNameFlag = true）
  - 樣式與現有 UI 風格一致（Tailwind CSS）

#### 2. 更新 parser.js 支援雙模式解析
- **檔案**: `src/parser.js`
- **需求**:
  - 新增 `hasNameFlag` 參數到 `parseInput(text, hasNameFlag = true)` 函式簽名
  - **含姓名模式 (hasNameFlag = true)**: 保持現有邏輯（支援 TAB / 逗號分隔）
  - **純金額模式 (hasNameFlag = false)**:
    - 每行僅讀取數字
    - 姓名自動填入 `項目 #1`, `項目 #2`, ...
    - 支援千分位逗號、貨幣符號清理（保持既有容錯邏輯）
    - 若出現無效數字，回傳錯誤訊息

#### 3. 更新 app.js 整合雙模式
- **檔案**: `src/app.js`
- **需求**:
  - 在 `parseAndCompute()` 中讀取 checkbox 狀態：`const hasNameFlag = document.getElementById('hasNameFlag').checked;`
  - 呼叫 parser 時傳入參數：`parseInput(text, hasNameFlag)`
  - 更新格式說明（`limitsNotice`）動態顯示不同提示：
    - 勾選時：「格式：姓名,金額（...）」
    - 未勾選時：「格式：金額（每行一筆數字，系統自動編號）」

#### 4. 更新測試套件
- **檔案**: `tests/test.mjs` 或新建 `tests/parser_dual_mode_test.mjs`
- **測試案例**:
  - 純金額模式：單行數字、多行數字、含千分位、負數、小數
  - 含姓名模式：既有測試案例保持不變
  - 邊界測試：空行過濾、錯誤格式、超出上限

---

### **優先級 P1 (重要) - 功能增強與優化**

#### 5. 一鍵複製銀行領款單功能
- **檔案**: `index.html`, `src/app.js`
- **UI 需求**:
  - 在「銀行領款總需求」區塊下方新增按鈕：
    - 按鈕文字：「📋 一鍵複製銀行領款單」
    - 樣式：`bg-blue-500 text-white px-3 py-1 rounded`（與既有按鈕風格一致）
    - 位置：總金額顯示下方、個人明細區塊上方
    - 禁用邏輯：資料未通過驗證時自動禁用（跟隨 exportBtn 邏輯）

- **功能邏輯** (`src/app.js`):
  - 格式化銀行領款清單為純文字（適合貼到 Excel / 記事本）：
    ```
    【銀行領款總需求】
    總金額：77,800 元 | 總筆數：2 筆
    
    1000元：77 張
    500元：1 張
    100元：2 張
    50元：1 個
    10元：4 個
    5元：2 個
    1元：0 個
    ```
  - 使用 `navigator.clipboard.writeText()` API 複製
  - 複製成功後顯示 toast 提示：「✅ 已複製到剪貼簿」（2 秒後自動消失）
  - 錯誤處理：若瀏覽器不支援或權限被拒，顯示錯誤訊息

- **GA 事件埋點**:
  - 事件名稱：`click_copy_bank`
  - Label：`一鍵複製銀行領款單`

#### 6. 強化雙重對帳機制
- **檔案**: `src/app.js`
- **現況檢視**: 已實作對帳邏輯（輸入總額 vs 面額拆解總額）
- **優化需求**:
  - ✅ 已實作：比對失敗時顯示紅色錯誤訊息並阻斷輸出
  - ✅ 已實作：exportBtn 自動禁用
  - **新增**：對帳失敗時，錯誤訊息增加詳細差額資訊：
    - 範例：「❌ 驗證錯誤：輸入總額 (77,800) 與拆解總額 (77,790) 不一致，差額：-10 元。請人工核對。」
  - 確保 BigInt 與 Number 混合場景下的精確比對（現有邏輯已支援，需補充測試）

#### 7. 優化 GA4 事件追蹤
- **檔案**: `src/app.js`
- **現況檢視**: 已埋設 3 個事件（click_calculate, click_clear, click_export_image）
- **新增事件**:
  - `click_copy_bank` - 一鍵複製銀行領款單（見上方 #5）
  - `toggle_name_mode` - 切換姓名模式（checkbox 切換時觸發）
    - Label：`hasNameFlag=true` 或 `hasNameFlag=false`
- **確認隱私合規**:
  - ✅ 現有實作已遵守：絕不傳送姓名、金額、明細內容
  - 僅追蹤功能使用頻率與按鈕點擊行為

---

### **優先級 P2 (計劃中) - TypeScript 與架構強化**

#### 8. TypeScript 介面定義與 JSDoc
- **檔案**: 新建 `src/types.js` 或升級為 TypeScript 專案
- **需求**:
  - 依據 v1.1 規格書定義 TypeScript interfaces：
    - `Denomination` (type: 1000 | 500 | 100 | 50 | 10 | 5 | 1)
    - `ParsedItem` ({ id: string, name: string, amount: number })
    - `BreakdownResult` ({ person: ParsedItem, breakdown: Record<Denomination, number> })
    - `SummaryResult` ({ totalAmount, totalCount, bankTotals, items })
  - **短期替代方案（不升級 TypeScript）**:
    - 在各模組檔案頭部加入 JSDoc 型別註解
    - 範例：
      ```javascript
      /**
       * @typedef {1000|500|100|50|10|5|1} Denomination
       * @typedef {{id: string, name: string, amount: number}} ParsedItem
       */
      ```
  - 支援 VSCode IntelliSense 與型別檢查（透過 `// @ts-check`）

#### 9. CSV 匯出功能（預留介面）
- **檔案**: `index.html`, `src/app.js`
- **UI 需求**:
  - 在「個人領現明細」區塊下方，「匯出圖片」按鈕旁新增按鈕：
    - 按鈕文字：「📊 匯出 CSV（計劃中）」
    - 樣式：`bg-gray-400 text-white px-3 py-1 rounded cursor-not-allowed`
    - 預設禁用（`disabled` 屬性）
    - Tooltip：「此功能計劃於未來版本推出」

- **功能邏輯（預留）**:
  - 按鈕點擊時顯示 alert：「CSV 匯出功能開發中，敬請期待！」
  - 未來實作時需包含：
    - 工作表 1：原始輸入（姓名 | 加總金額）
    - 工作表 2：銀行領款清單（面額 | 張數）
    - 工作表 3：個人明細（姓名 | 總額 | 各面額張數）
  - 技術選項：SheetJS (xlsx) 或純 CSV (Blob + download)

---

## 三、測試與驗證計劃

### 單元測試
- **parser.js**:
  - 雙模式解析（含姓名 / 純金額）
  - 邊界測試（最大筆數、最大金額、空輸入）
  - 容錯測試（全形逗號、千分位、貨幣符號）

- **aggregator.js**:
  - 同名加總（含全形/半形、大小寫）
  - BigInt 與 Number 混合加總

- **denomination.js**:
  - 面額拆解準確性（各種金額組合）
  - BigInt 支援

- **bank.js**:
  - 銀行總表聚合準確性
  - 對帳邏輯（輸入 = 拆解總額）

### 整合測試
- E2E 場景：
  1. 輸入含姓名資料 → 計算 → 驗證結果 → 複製銀行清單 → 匯出圖片
  2. 切換純金額模式 → 輸入數字 → 計算 → 驗證自動編號
  3. 錯誤處理：格式錯誤、超出上限、對帳失敗

### 手動測試清單
- [ ] 雙模式切換與格式說明動態更新
- [ ] 純金額模式自動編號正確
- [ ] 一鍵複製功能與 toast 提示
- [ ] 對帳失敗時差額顯示正確
- [ ] GA 事件正確觸發（檢查 Google Analytics 實時報表）
- [ ] 所有按鈕禁用邏輯正確（無資料、驗證失敗）
- [ ] 狀態持久化（重整頁面後恢復模式與資料）

---

## 四、技術注意事項

### 安全性與隱私
- ✅ 保持 100% 本地運算，零數據外傳
- ✅ GA 事件絕不包含 PII（個資）或業務數據
- ✅ localStorage 資料僅含用戶輸入與計算結果，不外流

### 瀏覽器相容性
- Clipboard API (`navigator.clipboard.writeText`):
  - 需 HTTPS 環境（本地開發用 localhost 亦可）
  - Fallback：顯示手動複製提示或使用 `document.execCommand('copy')` (deprecated)

### 效能考量
- 最大筆數 1000 筆，現有 BigInt 邏輯已支援
- 純金額模式下自動編號不影響效能（線性時間複雜度）

---

## 五、實作里程碑（建議時程）

### Sprint 1 - 核心功能（P0）
- 任務 1-4：雙模式文本解析器（UI + 邏輯 + 測試）
- 預估：2-3 工作日

### Sprint 2 - 功能增強（P1）
- 任務 5-7：一鍵複製、對帳優化、GA 事件追蹤
- 預估：1-2 工作日

### Sprint 3 - 架構強化（P2）
- 任務 8-9：TypeScript 介面 / JSDoc、CSV 預留介面
- 預估：1 工作日

### 總預估
約 4-6 個工作日（不含 code review 與迭代調整）

---

## 六、待確認事項

1. **純金額模式自動編號規則**：
   - 確認編號格式：`項目 #1` 或 `項目1` 或其他？
   - 確認是否需支援自訂前綴（如「員工」、「部門」）？

2. **一鍵複製格式**：
   - 確認純文字格式是否符合財務人員需求
   - 是否需額外提供 Markdown 格式選項？

3. **CSV 匯出優先級**：
   - 是否調整為 P1（本版實作）或維持 P2（未來版本）？

4. **TypeScript 升級決策**：
   - 是否全專案升級為 TypeScript？
   - 或僅使用 JSDoc 註解維持 JavaScript？

---

## 七、相關檔案清單

### 需修改的檔案
- `index.html` - UI 新增 checkbox、按鈕
- `src/app.js` - 雙模式邏輯、一鍵複製、GA 事件
- `src/parser.js` - 雙模式解析器
- `tests/test.mjs` - 測試案例補充

### 需新建的檔案
- `tests/parser_dual_mode_test.mjs` - 雙模式專項測試（選擇性）
- `src/types.js` - TypeScript 介面定義（若採用 JSDoc 則不需要）

### 參考文件
- 薪資現金小幫手 - 開發規格書 (v0.2.0).md
- 薪資現金小幫手 - 開發規格書 (v0.1.0).md
- README.md
- CHANGELOG.md
