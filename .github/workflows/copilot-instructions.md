## Skill: UI 與元件實作規範 (Component & UI Development)

當要求「實作 UI」、「建立元件」或「寫畫面」時，請嚴格遵守以下規則：

### 1. 圖示與 Icon 處理（重點約束）
- **禁止自動引入 Icon**：除非使用者在 Prompt 中明確要求「請加入 XX Icon」，否則**嚴禁**自動 import 或渲染任何圖示庫（如 `lucide-react`, `@heroicons/react`, `react-icons` 等）或 inline SVG。
- **純文字 / 空白預留**：若 UI 語境上看似需要 Icon（例如按鈕、提示框、選單），請僅使用純文字標籤，或留空 wait for custom SVG。

### 2. 元件實作習慣
- **樣式優勢**：優先使用專案現有的 Tailwind CSS / CSS Modules，不自行引入額外 UI library。
- **簡潔介面**：按鈕、Input 等基本元件保持 Plain Text，確保版面乾淨。

## Skill: 專案版本號變更 (Bump Version)

當使用者要求「更新版本號」、「Bump version」或執行版本變更時，請依據以下規則與清單執行：

### 1. 需同步變更版號的檔案清單 (Target Files)
- `package.json` -> `"version": "x.y.z"`
- `index.html` -> `<title>幫你算兌 Money Snap - 兌幣計算機 v"x.y.z"</title>`, `<p>Version "x.y.z" · 最後更新："yyyy-mm-dd"</p>`
- `CHANGELOG.md` -> 新增當前版號的區塊
- `README.md` -> 標題或安裝說明中的版本號範例, 新增當前版號的區塊

### 2. 執行原則
- 遵循 Semantic Versioning (MAJOR.MINOR.PATCH)。
- 確保所有檔案變更的版本號完全一致。
- 變更後提醒使用者檢查 Git Status 與執行測試。