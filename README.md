# 幫你算兌 Money Snap - 兌幣計算機

輕量的客戶端工具，用於解析貼上自試算表的「姓名, 金額」，合併同名加總、面額拆解 (1000/500/100/50/10/5/1)、銀行領款總表與圖片匯出（html2canvas）。所有邏輯於本機執行，敏感資料不會外流。

## 主要功能

- ✅ 支援從試算表直接貼上（Tab 分隔）或手動輸入（逗號分隔）
- ✅ 同名自動加總（支援重複姓名）
- ✅ 智能面額拆解建議（1000/500/100/50/10/5/1）
- ✅ 銀行領款總需求統計
- ✅ 圖片匯出（含浮水印）
- ✅ 錯誤行自動高亮提示
- ✅ 按鈕狀態管理（無資料時自動禁用）
- ✅ 狀態持久化（重整頁面後自動恢復）
- ✅ 計算時間戳記錄

## 快速開始

1. 安裝依賴：
   ```bash
   npm install
   ```

2. 啟動開發伺服器：
   ```bash
   npm run start
   ```

3. 執行測試：
   ```bash
   npm test
   ```

## 設定

- **限制與常數**：`src/config.js`
  - `MAX_ENTRIES`: 最多可貼入筆數（預設 1000）
  - `MAX_PER_ENTRY`: 每筆金額上限（預設 999,999）
  - `MAX_PER_PERSON`: 單人累計上限
  - `MAX_TOTAL`: 總額上限

## 資料格式

支援兩種輸入方式：
1. **從試算表複製貼上**：自動辨識 Tab 分隔
2. **手動輸入**：使用逗號分隔（支援全形/半形）

範例：
```
王小明,1200
張三,300
王小明,800
```

結果：王小明會自動加總為 2000 元

## 技術說明

- **localStorage 鍵**：`money-snap:mvp:v1`
  - 儲存內容：`input`、`parsedEntries`、`bank`、`calcTimestamp`、`lastParsedAt`、`lastExportAt`、`lastValid`
  - 支援 BigInt 序列化
  
- **匯出功能**：
  - 使用 html2canvas 生成圖片
  - 快門閃光效果遮蓋 DOM 變化
  - 自動加入時間浮水印
  - 隱藏按鈕與時間戳（僅顯示計算結果）

- **狀態恢復**：
  - 重整頁面後自動恢復 textarea 內容
  - 自動恢復計算結果與明細表格
  - 保留上次計算的時間戳

## Git 協作設定

本專案使用 git hooks 自動加入 Co-authored-by 標籤：
- 配置檔：`.coauthors`
- Hook 腳本：`.githooks/prepare-commit-msg`

## 版本記錄

詳見 [CHANGELOG.md](./CHANGELOG.md)

---

如需協助或回報問題，請聯繫開發團隊。