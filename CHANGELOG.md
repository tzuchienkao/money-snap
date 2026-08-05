# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/zh-TW/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/lang/zh-TW/).

## [Unreleased]

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

[Unreleased]: https://github.com/your-repo/money-snap/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/your-repo/money-snap/releases/tag/v0.1.0
[0.0.1]: https://github.com/your-repo/money-snap/releases/tag/v0.0.1
