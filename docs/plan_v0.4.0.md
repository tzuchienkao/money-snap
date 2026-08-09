# v0.4.0 完整調整計劃

## 📊 規格符合度檢查

### ✅ 已完成項目（8 項）
1. ✅ 面額設定模組 (denomination-config.js)
2. ✅ 彈性貪婪面額拆解演算法
3. ✅ 雙重對帳驗證邏輯
4. ✅ 防呆檢查（空陣列拋出錯誤）
5. ✅ 殘額檢查（console.warn）
6. ✅ 面額設定 UI 面板（紙鈔/硬幣分類）
7. ✅ 測試案例（9 個）
8. ✅ 文件更新（CHANGELOG.md）

### ⚠️ 待調整項目（9 項）

---

## 🔧 調整工作清單

### 分類 A：GA4 事件調整（2 項，獨立工作）

#### Todo 1: 調整 GA4 事件名稱符合 v0.4.0 規格
**ID**: `ga4-event-names`  
**狀態**: 🟢 Ready（可立即開始）  
**預估時間**: 15 分鐘

**需要調整的事件：**

| 目前實作 | 規格要求 | 觸發時機 |
|---------|---------|---------|
| `click_toggle_denom_panel` | `toggle_custom_denom_switch` | 勾選/取消主開關 |
| `change_custom_denomination` (bills_select_all) | `click_select_all_paper` | 點擊紙鈔全選 |
| `change_custom_denomination` (coins_select_all) | `click_select_all_coin` | 點擊硬幣全選 |

**保持不變的事件：**
- ✅ `change_custom_denomination` - 單一面額變更
- ✅ `toggle_save_denom_preference` - 記住偏好切換

**修改位置** (src/app.js):
- Line 245: 紙鈔全選事件
- Line 276: 硬幣全選事件
- Line 290: 面板展開事件
- Line 296: 面板收合事件

---

#### Todo 2: 調整 GA4 事件參數格式
**ID**: `ga4-event-params`  
**狀態**: 🔒 Blocked（依賴 Todo 1）  
**預估時間**: 20 分鐘

**調整內容：**
```javascript
// 目前格式（字串）
sendGaEvent('change_custom_denomination', 'denom:1000,active:true');

// 規格要求格式（物件）
sendGaEvent('change_custom_denomination', {
  denom_value: 1000,
  active: true
});
```

**需要修改：**
1. 更新 `sendGaEvent()` 函數支援物件參數
2. 更新所有事件調用為物件格式：
   - `toggle_custom_denom_switch`: `{enabled: boolean}`
   - `click_select_all_paper`: `{action: 'select_all_paper'}`
   - `click_select_all_coin`: `{action: 'select_all_coin'}`
   - `change_custom_denomination`: `{denom_value: number, active: boolean}`
   - `toggle_save_denom_preference`: `{enabled: boolean}`

---

### 分類 B：UI 互動模式調整（7 項，依賴鏈）

#### Todo 3: 新增主開關 checkbox 控制面額設定啟用
**ID**: `ui-master-switch`  
**狀態**: 🟢 Ready（可立即開始）  
**預估時間**: 20 分鐘

**工作內容：**
1. **移除原可折疊按鈕** (index.html)
   ```html
   <!-- 移除 -->
   <button id="denomPanelToggle">...</button>
   <div id="denomPanelSummary">...</div>
   ```

2. **新增主開關 checkbox**
   ```html
   <label class="inline-flex items-center cursor-pointer mb-2">
     <input type="checkbox" id="enableCustomDenom" class="mr-2 w-4 h-4">
     <span class="text-sm">啟用自訂面額設定 (未勾選之面額將不參與拆解)</span>
   </label>
   ```

3. **新增預設面額提示文字**
   ```html
   <div id="defaultDenomHint" class="text-xs text-gray-600 mt-1 mb-3">
     已啟用預設面額：1000, 500, 100, 50, 10, 5, 1
   </div>
   ```

4. **調整面額設定面板**
   - 保留原 `<div id="denomPanelContent">` 面板
   - 預設加上 `hidden` class

---

#### Todo 4: 實作主開關切換邏輯
**ID**: `ui-toggle-logic`  
**狀態**: 🔒 Blocked（依賴 Todo 1, 3）  
**預估時間**: 25 分鐘

**工作內容：**
1. **事件監聽** (src/app.js)
   ```javascript
   const enableCustomDenomCheckbox = document.getElementById('enableCustomDenom');
   const defaultDenomHint = document.getElementById('defaultDenomHint');
   const denomPanelContent = document.getElementById('denomPanelContent');
   
   enableCustomDenomCheckbox.addEventListener('change', (e) => {
     const enabled = e.target.checked;
     
     if (enabled) {
       // 顯示面額設定面板
       denomPanelContent.classList.remove('hidden');
       defaultDenomHint.classList.add('hidden');
       // 載入使用者自訂面額（若有 localStorage）
       const config = loadDenomConfig();
       updateDenomCheckboxes(config.activeDenominations);
     } else {
       // 隱藏面額設定面板
       denomPanelContent.classList.add('hidden');
       defaultDenomHint.classList.remove('hidden');
       // 還原為預設面額
       setActiveDenominations(DEFAULT_ACTIVE_DENOMINATIONS);
     }
     
     // GA4 事件追蹤（使用新事件名稱）
     sendGaEvent('toggle_custom_denom_switch', {
       enabled: enabled
     });
     
     // 儲存至 localStorage（若勾選「記住偏好」）
     if (saveAsDefaultCheckbox.checked) {
       saveDenomConfig({
         enabled: enabled,
         activeDenominations: getActiveDenominations(),
         saveAsDefault: true
       });
     }
   });
   ```

2. **頁面載入時還原狀態**
   ```javascript
   // 初始化
   const savedConfig = loadDenomConfig();
   enableCustomDenomCheckbox.checked = savedConfig.enabled;
   
   if (savedConfig.enabled) {
     denomPanelContent.classList.remove('hidden');
     defaultDenomHint.classList.add('hidden');
   } else {
     denomPanelContent.classList.add('hidden');
     defaultDenomHint.classList.remove('hidden');
   }
   ```

---

#### Todo 5: 移除原可折疊面板機制
**ID**: `ui-remove-collapsible`  
**狀態**: 🔒 Blocked（依賴 Todo 3）  
**預估時間**: 10 分鐘

**工作內容：**
1. **移除事件監聽** (src/app.js)
   ```javascript
   // 移除以下程式碼
   denomPanelToggle.addEventListener('click', () => { ... });
   ```

2. **移除函數**
   - 移除 `updateDenomSummary()` 函數
   - 移除箭頭旋轉動畫相關程式碼

3. **清理 DOM 元素引用**
   - 移除 `const denomPanelToggle = ...`
   - 移除 `const denomPanelSummary = ...`
   - 移除 `const denomPanelArrow = ...`
   - 移除 `const denomSummaryText = ...`

---

#### Todo 6: 當主開關關閉時防止自訂面額生效
**ID**: `ui-prevent-calculation`  
**狀態**: 🔒 Blocked（依賴 Todo 4）  
**預估時間**: 20 分鐘

**工作內容：**
1. **調整 parseAndCompute()** (src/app.js)
   ```javascript
   function parseAndCompute() {
     // ... 前置處理 ...
     
     // 判斷使用哪一組面額
     const enableCustomDenom = document.getElementById('enableCustomDenom')?.checked ?? false;
     const denom = enableCustomDenom 
       ? getActiveDenominations()  // 自訂面額
       : DEFAULT_ACTIVE_DENOMINATIONS;  // 預設面額
     
     const people = aggregateEntries(result.entries);
     const bank = computeBankTotals(people, denom);
     
     // ... 驗證與渲染 ...
     renderResultsToUI(bank, denom);
   }
   ```

2. **確保邏輯正確**
   - 主開關關閉時：強制使用預設面額
   - 主開關開啟時：使用 getActiveDenominations()

---

#### Todo 7: 持久化主開關狀態
**ID**: `ui-persist-switch-state`  
**狀態**: 🔒 Blocked（依賴 Todo 4）  
**預估時間**: 25 分鐘

**工作內容：**
1. **修改 denomination-config.js**
   ```javascript
   // 新增 enabled 欄位
   const DEFAULT_CONFIG = {
     enabled: false,  // 預設關閉
     activeDenominations: DEFAULT_ACTIVE_DENOMINATIONS,
     saveAsDefault: false
   };
   
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

2. **更新 getCurrentConfig()**
   - 新增 `enabled` 欄位至回傳物件

---

#### Todo 8: 更新測試案例以對應新 UI 邏輯
**ID**: `ui-update-tests`  
**狀態**: 🔒 Blocked（依賴 Todo 6, 7）  
**預估時間**: 30 分鐘

**工作內容：**
1. **新增測試案例** (tests/test.mjs)
   
   **測試 10：主開關關閉時使用預設面額**
   ```javascript
   console.log('  測試 10：主開關關閉時強制使用預設面額...');
   const config10 = {
     enabled: false,
     activeDenominations: [1000, 100],  // 即使設定只有這兩個
     saveAsDefault: false
   };
   // 應該忽略 activeDenominations，使用預設面額
   // 驗證結果使用 [1000, 500, 100, 50, 10, 5, 1]
   ```
   
   **測試 11：主開關開啟時使用自訂面額**
   ```javascript
   console.log('  測試 11：主開關開啟時使用自訂面額...');
   const config11 = {
     enabled: true,
     activeDenominations: [1000, 100, 10, 1],
     saveAsDefault: false
   };
   // 應該使用自訂面額 [1000, 100, 10, 1]
   ```
   
   **測試 12：localStorage 持久化驗證**
   ```javascript
   console.log('  測試 12：主開關狀態 localStorage 持久化...');
   // 1. 儲存 enabled: true
   // 2. 重新載入
   // 3. 驗證 enabled === true
   // 4. 清除 localStorage
   ```

2. **確保原有測試通過**
   - 執行 `npm test` 確認所有測試案例通過

---

#### Todo 9: 更新 CHANGELOG 記錄 UI 調整
**ID**: `ui-update-changelog`  
**狀態**: 🔒 Blocked（依賴 Todo 8）  
**預估時間**: 10 分鐘

**工作內容：**
1. **新增 Changed 章節** (CHANGELOG.md)
   ```markdown
   ### Changed
   - **UI 互動模式調整**：將原可折疊面板改為「啟用自訂面額設定」主開關控制
     - 預設關閉：顯示預設面額提示文字（1000/500/100/50/10/5/1）
     - 開啟時：展開完整面額設定面板
     - 符合 v0.4.0 規格第 5 點 UI 視覺線稿（情境 A & B）
   - **GA4 事件名稱調整**：符合 v0.4.0 規格埋點規範
     - `click_toggle_denom_panel` → `toggle_custom_denom_switch`
     - 新增獨立事件 `click_select_all_paper`、`click_select_all_coin`
     - 事件參數改為物件格式
   ```

---

## 📊 工作流程圖

```
[GA4 事件調整] (獨立分支)
    ├─ ga4-event-names (Todo 1) ──┐
    │                              ├─ ui-toggle-logic (Todo 4)
    │                              │      ├─ ui-prevent-calculation (Todo 6) ──┐
    │                              │      │                                      │
    │                              │      └─ ui-persist-switch-state (Todo 7) ──┤
    │                                                                           │
    └─ ga4-event-params (Todo 2)                                               │
                                                                                │
[UI 互動調整] (主要分支)                                                          │
    ui-master-switch (Todo 3) ──┬─ ui-toggle-logic (Todo 4) ────────────────────┤
                                │                                               │
                                └─ ui-remove-collapsible (Todo 5)              │
                                                                                │
                                                                                ↓
                                                    ui-update-tests (Todo 8)
                                                            ↓
                                                    ui-update-changelog (Todo 9)
```

---

## ⏱️ 預估總時間

| 分類 | 工作項數 | 預估時間 |
|-----|---------|---------|
| GA4 事件調整 | 2 | 35 分鐘 |
| UI 互動調整 | 7 | 2 小時 20 分鐘 |
| **總計** | **9** | **約 2 小時 55 分鐘** |

---

## ✅ 驗收標準

### 情境 A：預設狀態（主開關關閉）
- [ ] 顯示「啟用自訂面額設定」checkbox（未勾選）
- [ ] 顯示純文字：「已啟用預設面額：1000, 500, 100, 50, 10, 5, 1」
- [ ] 隱藏面額設定面板
- [ ] 計算時強制使用預設面額（即使 localStorage 有自訂設定）
- [ ] GA4 事件：`toggle_custom_denom_switch` {enabled: false}

### 情境 B：啟用狀態（主開關開啟）
- [ ] checkbox 為勾選狀態
- [ ] 隱藏純文字提示
- [ ] 顯示完整面額設定面板（紙鈔/硬幣 + 記住偏好）
- [ ] 計算時使用使用者自訂面額
- [ ] GA4 事件：`toggle_custom_denom_switch` {enabled: true}

### GA4 事件正確性
- [ ] 主開關切換：`toggle_custom_denom_switch` {enabled: boolean}
- [ ] 紙鈔全選：`click_select_all_paper` {action: 'select_all_paper'}
- [ ] 硬幣全選：`click_select_all_coin` {action: 'select_all_coin'}
- [ ] 面額變更：`change_custom_denomination` {denom_value: number, active: boolean}
- [ ] 記住偏好：`toggle_save_denom_preference` {enabled: boolean}

### 測試通過
- [ ] 所有原有測試案例通過（9 個）
- [ ] 新增 3 個測試案例通過（主開關相關）
- [ ] npm test 執行成功（12 個測試全通過）

### 持久化功能
- [ ] 勾選「記住偏好」後，主開關狀態儲存至 localStorage
- [ ] 重新整理頁面後，主開關狀態正確還原
- [ ] 取消「記住偏好」後，清除 localStorage

---

## 📌 重要注意事項

1. **執行順序**：必須按照依賴關係執行（可用 SQL 查詢 ready todos）
2. **向下相容性**：確保修改不影響現有功能
3. **測試覆蓋**：每完成一個 todo 都應執行 `npm test` 確認不破壞現有功能
4. **防呆機制**：主開關開啟時，仍需保留「至少選擇一個面額」的防呆檢查
5. **localStorage 格式**：新增 `enabled` 欄位，確保向後相容（舊資料讀取時預設 false）

---

## 🚀 建議執行策略

### 選項 1：分批執行（建議新手）
1. **第一批（GA4 事件）**：Todo 1-2（35 分鐘）
2. **第二批（UI 基礎）**：Todo 3-5（55 分鐘）
3. **第三批（邏輯整合）**：Todo 6-7（45 分鐘）
4. **第四批（測試與文件）**：Todo 8-9（40 分鐘）

### 選項 2：一次性執行（建議熟練者）
按照依賴順序連續執行所有 9 個 todos（約 3 小時）

### 選項 3：並行執行（建議多人協作）
- **人員 A**：Todo 1-2（GA4 事件調整）
- **人員 B**：Todo 3, 5（UI 結構調整）
- **合併後**：Todo 4, 6-9（邏輯整合與測試）

