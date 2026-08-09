# v0.4.0 UI 調整計劃

## 📋 背景說明

根據 v0.4.0 規格文件第 5 點「UI 視覺線稿與互動規範」，需要調整目前的面額設定 UI 實作方式。

### 規格要求（情境 A & B）

**情境 A：預設狀態（未勾選主開關）**
- 顯示一個 checkbox：`[ ] 啟用自訂面額設定 (未勾選之面額將不參與拆解)`
- 下方顯示純文字提示：`已啟用預設面額：1000, 500, 100, 50, 10, 5, 1`
- **不顯示**面額設定面板

**情境 B：啟用狀態（勾選主開關）**
- checkbox 變為勾選：`[☑] 啟用自訂面額設定 (未勾選之面額將不參與拆解)`
- **顯示**完整面額設定面板（紙鈔/硬幣 checkboxes + 記住偏好）
- 隱藏純文字提示

### 目前實作差異

目前使用的是**可折疊面板**機制：
- 使用「⚙️ 自訂面額設定」按鈕切換展開/收合
- 收合時顯示摘要文字
- 展開時顯示完整面板
- **沒有主開關控制啟用/關閉**

---

## 📝 調整工作項目

### Todo 1: 新增主開關 checkbox 控制面額設定啟用
**ID**: `ui-master-switch`  
**狀態**: Pending  
**依賴**: 無

#### 工作內容
1. **HTML 結構調整** (index.html)
   - 移除原本的可折疊面板按鈕 `<button id="denomPanelToggle">`
   - 新增主開關 checkbox：
     ```html
     <label class="inline-flex items-center cursor-pointer">
       <input type="checkbox" id="enableCustomDenom" class="mr-2">
       <span>啟用自訂面額設定 (未勾選之面額將不參與拆解)</span>
     </label>
     ```
   - 新增預設面額純文字提示（主開關關閉時顯示）：
     ```html
     <div id="defaultDenomHint" class="text-xs text-gray-600 mt-2">
       已啟用預設面額：1000, 500, 100, 50, 10, 5, 1
     </div>
     ```
   - 保留原面額設定面板，但預設隱藏 `id="denomPanelContent"`

2. **CSS 樣式**
   - 移除折疊按鈕相關樣式
   - 確保純文字提示與面板切換順暢

---

### Todo 2: 實作主開關切換邏輯
**ID**: `ui-toggle-logic`  
**狀態**: Pending  
**依賴**: `ui-master-switch`

#### 工作內容
1. **事件監聽** (src/app.js)
   - 獲取主開關元素：`const enableCustomDenomCheckbox = document.getElementById('enableCustomDenom');`
   - 監聽 change 事件
   
2. **切換邏輯**
   ```javascript
   enableCustomDenomCheckbox.addEventListener('change', (e) => {
     const enabled = e.target.checked;
     
     if (enabled) {
       // 顯示面額設定面板
       denomPanelContent.classList.remove('hidden');
       // 隱藏預設面額提示
       defaultDenomHint.classList.add('hidden');
       // 載入使用者自訂面額（若有 localStorage）
       const config = loadDenomConfig();
       // 更新 UI checkboxes
       updateDenomCheckboxes(config.activeDenominations);
     } else {
       // 隱藏面額設定面板
       denomPanelContent.classList.add('hidden');
       // 顯示預設面額提示
       defaultDenomHint.classList.remove('hidden');
       // 強制還原為預設面額
       setActiveDenominations(DEFAULT_ACTIVE_DENOMINATIONS);
     }
     
     // GA4 事件追蹤
     sendGaEvent('click_toggle_denom_panel', {
       status: enabled ? 'open' : 'close'
     });
   });
   ```

3. **初始化邏輯**
   - 頁面載入時根據 localStorage 中的 `enabled` 狀態初始化主開關

---

### Todo 3: 移除原可折疊面板機制
**ID**: `ui-remove-collapsible`  
**狀態**: Pending  
**依賴**: `ui-master-switch`

#### 工作內容
1. **移除 HTML 元素**
   - 刪除 `<button id="denomPanelToggle">` 及其內部的 ⚙️ 圖示與箭頭
   - 刪除 `<div id="denomPanelSummary">` (收合狀態的摘要顯示)

2. **清理 JavaScript**
   - 移除 `denomPanelToggle.addEventListener('click', ...)` 相關程式碼
   - 移除 `denomPanelArrow` 旋轉動畫邏輯
   - 移除 `updateDenomSummary()` 函數（不再需要動態更新摘要文字）

---

### Todo 4: 當主開關關閉時防止自訂面額生效
**ID**: `ui-prevent-calculation`  
**狀態**: Pending  
**依賴**: `ui-toggle-logic`

#### 工作內容
1. **調整計算流程** (src/app.js)
   ```javascript
   function parseAndCompute() {
     // ... 前置處理 ...
     
     // 判斷使用哪一組面額
     const enableCustomDenom = document.getElementById('enableCustomDenom').checked;
     const denom = enableCustomDenom 
       ? getActiveDenominations()  // 自訂面額
       : DEFAULT_ACTIVE_DENOMINATIONS;  // 預設面額
     
     const people = aggregateEntries(result.entries);
     const bank = computeBankTotals(people, denom);
     
     // ... 驗證與渲染 ...
   }
   ```

2. **更新 renderResultsToUI()**
   - 傳入正確的 denom 參數（根據主開關狀態）

---

### Todo 5: 持久化主開關狀態
**ID**: `ui-persist-switch-state`  
**狀態**: Pending  
**依賴**: `ui-toggle-logic`

#### 工作內容
1. **修改 denomination-config.js**
   ```javascript
   // 預設配置新增 enabled 欄位
   const DEFAULT_CONFIG = {
     enabled: false,  // 預設關閉自訂面額
     activeDenominations: DEFAULT_ACTIVE_DENOMINATIONS,
     saveAsDefault: false
   };
   
   // loadDenomConfig() 讀取 enabled
   export function loadDenomConfig() {
     try {
       const stored = localStorage.getItem(STORAGE_KEY);
       if (!stored) return { ...DEFAULT_CONFIG };
       const config = JSON.parse(stored);
       return {
         enabled: config.enabled ?? false,
         activeDenominations: config.activeDenominations || DEFAULT_ACTIVE_DENOMINATIONS,
         saveAsDefault: config.saveAsDefault ?? false
       };
     } catch (e) {
       console.warn('[Denom Config] 讀取失敗，使用預設值', e);
       return { ...DEFAULT_CONFIG };
     }
   }
   
   // saveDenomConfig() 儲存 enabled
   export function saveDenomConfig(config) {
     try {
       localStorage.setItem(STORAGE_KEY, JSON.stringify({
         enabled: config.enabled ?? false,
         activeDenominations: config.activeDenominations,
         saveAsDefault: config.saveAsDefault
       }));
     } catch (e) {
       console.error('[Denom Config] 儲存失敗', e);
     }
   }
   ```

2. **頁面載入時還原狀態** (src/app.js)
   ```javascript
   // 初始化時讀取 localStorage
   const savedConfig = loadDenomConfig();
   enableCustomDenomCheckbox.checked = savedConfig.enabled;
   
   // 根據 enabled 狀態初始化 UI
   if (savedConfig.enabled) {
     denomPanelContent.classList.remove('hidden');
     defaultDenomHint.classList.add('hidden');
     updateDenomCheckboxes(savedConfig.activeDenominations);
   } else {
     denomPanelContent.classList.add('hidden');
     defaultDenomHint.classList.remove('hidden');
   }
   ```

3. **主開關變更時更新 localStorage**
   ```javascript
   enableCustomDenomCheckbox.addEventListener('change', (e) => {
     const enabled = e.target.checked;
     
     // 只有在「記住偏好」勾選時才儲存
     if (saveAsDefaultCheckbox.checked) {
       saveDenomConfig({
         enabled: enabled,
         activeDenominations: getActiveDenominations(),
         saveAsDefault: true
       });
     }
     
     // ... UI 切換邏輯 ...
   });
   ```

---

### Todo 6: 更新測試案例以對應新 UI 邏輯
**ID**: `ui-update-tests`  
**狀態**: Pending  
**依賴**: `ui-prevent-calculation`, `ui-persist-switch-state`

#### 工作內容
1. **新增測試案例** (tests/test.mjs)
   - **測試 10**：主開關關閉時強制使用預設面額
   - **測試 11**：主開關開啟時使用自訂面額
   - **測試 12**：主開關狀態的 localStorage 持久化驗證

2. **確保原有測試通過**
   - 執行 `npm test` 確認所有測試案例通過

---

### Todo 7: 更新 CHANGELOG 記錄 UI 調整
**ID**: `ui-update-changelog`  
**狀態**: Pending  
**依賴**: `ui-update-tests`

#### 工作內容
1. **新增 Changed 章節** (CHANGELOG.md)
   ```markdown
   ### Changed
   - **UI 互動模式調整**：將原可折疊面板改為「啟用自訂面額設定」主開關控制
     - 預設關閉：顯示預設面額提示文字（1000/500/100/50/10/5/1）
     - 開啟時：展開完整面額設定面板
     - 符合 v0.4.0 規格第 5 點 UI 視覺線稿（情境 A & B）
   ```

---

## 📊 工作依賴關係圖

```
ui-master-switch (Todo 1)
    ├── ui-toggle-logic (Todo 2)
    │       ├── ui-prevent-calculation (Todo 4)
    │       │       └── ui-update-tests (Todo 6)
    │       │                └── ui-update-changelog (Todo 7)
    │       └── ui-persist-switch-state (Todo 5)
    │                └── ui-update-tests (Todo 6)
    └── ui-remove-collapsible (Todo 3)
```

---

## ✅ 驗收標準

### 情境 A：預設狀態（主開關關閉）
- [ ] 顯示「啟用自訂面額設定」checkbox（未勾選）
- [ ] 顯示純文字：「已啟用預設面額：1000, 500, 100, 50, 10, 5, 1」
- [ ] 隱藏面額設定面板
- [ ] 計算時使用預設面額 [1000, 500, 100, 50, 10, 5, 1]

### 情境 B：啟用狀態（主開關開啟）
- [ ] checkbox 為勾選狀態
- [ ] 隱藏純文字提示
- [ ] 顯示完整面額設定面板（紙鈔/硬幣 + 記住偏好）
- [ ] 計算時使用使用者自訂面額

### 持久化功能
- [ ] 勾選「記住偏好」後，主開關狀態會儲存至 localStorage
- [ ] 重新整理頁面後，主開關狀態正確還原
- [ ] 取消「記住偏好」後，清除 localStorage（下次開啟回到預設狀態）

### 測試通過
- [ ] 所有原有測試案例通過
- [ ] 新增 3 個測試案例通過（主開關相關）

---

## 🎯 預估時間

- **Todo 1-3**：HTML/CSS 結構調整 → 30 分鐘
- **Todo 4-5**：邏輯實作與持久化 → 45 分鐘
- **Todo 6**：測試案例撰寫 → 30 分鐘
- **Todo 7**：文件更新 → 10 分鐘

**總計**: 約 2 小時

---

## 📌 注意事項

1. **向下相容性**：確保修改不影響現有功能
2. **GA4 事件**：更新事件名稱為 `click_toggle_denom_panel`（參數：status: 'open'/'close'）
3. **防呆機制**：主開關開啟時，仍需保留「至少選擇一個面額」的防呆檢查
4. **測試覆蓋**：確保所有測試案例通過後才更新 CHANGELOG

