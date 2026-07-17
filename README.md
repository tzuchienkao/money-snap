# 幫你算兌 Money Snap - 兌幣計算機

輕量的客戶端工具，用於解析貼上自試算表的「姓名, 金額」，合併同名加總、面額拆解 (1000/500/100/50/10/5/1)、銀行領款總表與圖片匯出（html2canvas）。所有邏輯於本機執行，敏感資料不會外流。

快速開始
1. 安裝依賴：
   npm install
2. 啟動開發伺服器（會打開 index.html）：
   npm run start
3. 執行測試：
   npm test

設定
- 限制與常數：src/config.js（MAX_ENTRIES、MAX_PER_ENTRY、MAX_PER_PERSON、MAX_TOTAL）。

說明
- localStorage 鍵：money-snap:mvp:v1（儲存 input、parsedEntries、bank、lastParsedAt、lastExportAt、lastValid）。
- 匯出：使用 html2canvas；若匯出畫面有差異，請以本機瀏覽器檢查字型與樣式。

如需我把 README 翻成英文或加上部署指引，告訴我。