# 幫你算兌 Money Snap - PWA 開發計畫

---
status: completed
version: 0.1.0
completed_date: 2026-07-18
---

## 1. 目標概述
將「幫你算兌 Money Snap」升級為 Progressive Web App (PWA)，提供離線使用能力、案頭/手機安裝功能，並維持「零外部請求」與「資安隔離」的核心原則。

## 2. 核心組件需求
### A. Web App Manifest (`manifest.json`)
- **應用程式名稱**：幫你算兌 Money Snap - 兌幣計算機
- **顯示模式**：`standalone` (獨立視窗運行)
- **顏色設定**：
  - `theme_color`: `#f3f4f6` (背景灰)
  - `background_color`: `#ffffff` (白)
- **圖標**：需包含 192x192 與 512x512 的遮罩式 (maskable) 與一般圖標。

### B. Service Worker (`sw.js`)
- **快取策略**：Cache-First (快取優先)。
- **快取資源**：
  - 核心 HTML (`index.html`)
  - 模組化 JS (`src/*.js`)
  - 第三方庫 (Tailwind CSS, html2canvas)
  - 圖標與靜態資源。
- **更新機制**：當偵測到新版本 Service Worker 時，提示使用者更新。

### C. 離線支持 (Offline Support)
- 確保在斷網狀態下，所有核心計算功能（解析、加總、面額拆解）與 UI 渲染皆能正常運作。
- 圖片匯出功能 (html2canvas) 需在離線狀態下仍能存取外部套件 or 使用本地快取。

## 3. 實作步驟
### 第一階段：基礎設施 (Infrastructure)
1. 準備各種尺寸的應用程式圖標 (Icons)。
2. 撰寫 `manifest.json` 並於 `index.html` 中引用。
3. 建立基礎的 `sw.js` 框架。

### 第二階段：註冊與快取 (Registration & Caching)
1. 在 `src/app.js` 加入 Service Worker 註冊邏輯。
2. 實作靜態資源預快取 (Pre-caching)。
3. 處理 CDN 套件的本地存取與快取路徑問題。

### 第三階段：UI/UX 優化
1. 實作自定義「安裝應用程式」提示按鈕。
2. 增加「離線狀態」指示燈。
3. 測試圖片匯出在離線環境的穩定性。

## 4. 資安與驗證 (Security & Validation)
- **嚴格限制**：Service Worker 不得包含 any `fetch` 到非快取名單內的外部位址。
- **一致性**：確保 PWA 狀態下的數據仍只存放在本地 `localStorage`，不與雲端同步。

## 5. 實作檢核表 (Checklist)
- [x] 產出圖標圖檔 (192x192, 512x512)。
- [x] 撰寫 `manifest.json`。
- [x] 撰寫 `sw.js`。
- [x] 整合註冊代碼至 `./src/app.js`。
