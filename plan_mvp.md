計畫：薪資現金小幫手 — MVP v1.0（分析與開發項目展開）

目標概述
- 打造一個在瀏覽器本地運行的輕量工具，能解析貼上自試算表的姓名/金額，合併同名加總、計算面額拆解、產生銀行領款總表與個人面額明細，並支援圖片匯出與 localStorage 自動儲存，確保敏感資料不外流。

範圍（已確認）
- MVP 僅含核心功能：Smart parsing、Group & Sum、面額拆解(1000/500/100/50/10/5/1)、銀行領款總表、個人薪資明細、圖片匯出 (html2canvas)、localStorage 自動儲存、清除功能、輸入/拆解驗證錯誤提示。
- CSV/Excel 匯出、PWA 與 Chrome 擴充套件列入未來版本。

實作策略
- 前端單頁（HTML + Vanilla JS ES6 + Tailwind CSS）。
- 無任何外部伺服器請求；所有邏輯在客戶端執行。
- 模組化 JS：parser、aggregator、denomination、bank、ui、storage、export。
- 以小步驗證（步驟完成即測試）並手動 QA。

主要任務（狀態已部分完成）
1. 建立專案骨架：建立 HTML 範本、Tailwind 設定、靜態資源，並提供可開發的 index.html。 (done/in_progress)
2. 實作智能解析：支援逗號與 Tab 分隔、處理多行輸入、去除空白行與格式錯誤提示。 (done)
3. 同名合併與加總：對相同姓名（不分大小寫、trim）進行彙整與金額加總。 (done)
4. 面額拆解演算法：採遞減除法（1000/500/100/50/10/5/1），記錄每種面額數量。 (done)
5. 銀行領款總表：彙整所有人面額需求，計算銀行需提取的每種面額總數及總金額。 (done)
6. UI 介面實作：建置輸入區、計算按鈕、銀行總表、個人明細、清除與匯出按鈕，採 Tailwind 風格。 (done)
7. 圖片匯出：整合 html2canvas 實作一鍵匯出當前畫面為圖片並提供下載；新增浮水印需求並修正匯出版面問題（textarea 轉換、浮水印加入）。 (done)
8. localStorage 自動儲存/載入：自動儲存使用者輸入、解析結果與計算結果（鍵名：money-snap:mvp:v1），頁面重載後自動還原；提供清除選項。 (done)
9. 輸入與拆解驗證：比對輸入總額與拆解總額，若不相符顯示醒目紅色錯誤並提示人工核對。 (pending)
10. 一鍵清除功能：實作顯眼清除按鈕，確認後清空所有狀態與 localStorage。 (done)
11. 手動 QA 與測試案例：以代表性輸入測試（逗號/Tab、重複姓名、錯誤格式）並紀錄測試步驟。 (in_progress)

重要修正紀錄
- 匯出浮水印：在開發規格中新增浮水印需求（格式 YYYY-MM-DD HH:mm，右下、半透明）。
- 匯出版面修正：匯出時建立畫面複本並將 textarea 轉為顯示相同內容的 div，以避免 html2canvas 對表單控件換行處理不一致的問題。
- localStorage 儲存/還原：實作儲存鍵 money-snap:mvp:v1，儲存欄位包含 input、parsedEntries、bank、lastParsedAt、lastExportAt、lastValid；載入時會自動還原並重跑計算以恢復 UI。
- 一鍵清除功能：已實作「清除所有資料」按鈕，按下會跳出確認；確認後清空輸入區、個人與銀行總表、錯誤訊息，並移除 localStorage（money-snap:mvp:v1）。 (已完成 2026-07-17)
- 限制顯示（已實作）：在輸入區上方顯示限制說明（動態從 src/config.js 讀取：最多 1000 筆；每筆金額整數部分上限 999,999），以避免極端輸入造成精度或效能問題。

風險與注意事項
- 匯出使用 html2canvas，外部字體或 web font（若改用）可能影響渲染；離線環境需注意資源可用性。

下一步建議
- localStorage 已實作（鍵：money-snap:mvp:v1），請進行 manual QA，包含匯出後背景與字型檢查，並回報瀏覽器/作業系統以便重現問題。 (已完成 2026-07-17：執行自動化測試、sample 流程驗證、validation 規則測試)。
- 建立簡單的 npm test 腳本以自動化現有測試套件。
- 新增 npm run start：使用 lite-server 提供本地 localhost 開發伺服器，啟動指令：npm run start（會開啟 index.html）。 (已完成 2026-07-17)

交付物
- 可運行靜態頁面：index.html + src/* 模組
- 測試檔案：tests/*.mjs（parser/aggregator/denomination/bank 與 sample 測試）
