# PromptVault Frontend - React Client Workspace

This is the React client application for **PromptVault**, scaffolded with **Vite**, **TypeScript**, and **Tailwind CSS v4**.

---

## Technical Stack & Configuration

- **Core Framework**: React 19 (using strict TypeScript typing)
- **Styling**: Tailwind CSS v4. Configured directly in [index.css](src/index.css) using HSL variables to support a Vercel-like responsive dark/light mode toggle.
- **Icons**: Lucide Icons
- **Code Editor**: `@monaco-editor/react` (implements custom syntax highlighting, line numbers, word count, character count, copy, download, and fullscreen capabilities).
- **Revision Comparisons**: Monaco's native `DiffEditor` engine for split-screen highlight differences.
- **Data Caching**: `@tanstack/react-query` handles async data synchronization with the backend services.
- **HTTP Client**: Axios instance configured with global request interceptors that inject the JWT Authorization token.

---

## Directory Structure

```text
frontend/
├── src/
│   ├── components/         # Common visual controls
│   ├── context/
│   │   └── ThemeContext.tsx # Theme toggling provider
│   ├── layouts/
│   │   └── Layout.tsx      # Sidebar & Top navigation bar layout
│   ├── pages/              # Platform Pages:
│   │   ├── Login.tsx       # Secure credentials and seed presets
│   │   ├── Dashboard.tsx   # Visual statistics and activity timeline
│   │   ├── AgentList.tsx   # Agent registry grid and creation modals
│   │   ├── AgentDetails.tsx# Prompt types overview card and versions preview
│   │   ├── PromptEditor.tsx# Monaco Editor workspace, comments, test suites
│   │   ├── CompareVersions.tsx # Side-by-side Diff comparison screen
│   │   ├── Search.tsx      # Global search matches categorizer
│   │   ├── ActivityLog.tsx # Full Audit Trail logs audit view
│   │   └── Settings.tsx    # User profiles and workspace permissions list
│   ├── services/
│   │   └── api.ts          # Axios configuration and API method wrapper
│   ├── types/
│   │   └── index.ts        # Shared TypeScript interfaces
│   ├── App.tsx             # Route registry and client wrappers
│   ├── index.css           # Tailwind v4 directives and design tokens
│   └── main.tsx            # Vite root entrypoint
├── vite.config.ts          # Vite build config with @tailwindcss/vite plugin
└── package.json            # Installed dependency scripts
```

---

## Local Setup

Ensure that you have Node.js (v18+) installed.

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Launch dev server**:
   ```bash
   npm run dev
   ```
   *The application will launch on `http://localhost:5173/`.*

3. **Verify Production Build**:
   ```bash
   npm run build
   ```
