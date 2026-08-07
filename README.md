# PromptVault - Secure Collaboration Workspace (OneDrive Sync)

Welcome to **PromptVault**.

PromptVault is a corporate-compliant, self-hosted prompt version control and testing system. It is designed to run entirely within your company's existing workstation environment, utilizing **Microsoft OneDrive** for database synchronization and **Microsoft Teams** or **VS Code** as the unified visual workspace.

---

## 1. Why PromptVault? (The Problem & Solution)

### The Problem
When working with Large Language Models (LLMs), engineering teams need to write, refine, version-control, and test system prompts, SQL templates, and formatting structures. However:
1. Setting up external databases or servers requires lengthy corporate security reviews.
2. Storing prompts on external third-party servers raises compliance, IP, and data leak concerns.
3. Keeping track of version differences (e.g. what changed between v2 and v3 of a system prompt) manually in text files is slow and prone to errors.

### The Solution
PromptVault is **100% serverless and offline-compliant**.
* **Zero External Hosting**: All data (prompts, version history, audit logs, comments, and test cases) is stored as simple, human-readable `.json` text files.
* **Corporate Sync**: It places these JSON files inside your existing corporate **OneDrive folder**. Microsoft OneDrive automatically syncs these files between you and your colleagues in the background.
* **Unified UI**: You view and edit prompts using a rich interface containing Monaco editors (the same editor code powering VS Code), side-by-side diff comparers, test runners, and comment feeds.

---

## 2. Supported Workspaces

PromptVault is compiled to run in two environments, depending on your team's workflow:

### Option A: VS Code Extension (Best for Developers)
The entire application runs as a custom sidebar tab inside VS Code.
* **How it works**: The extension runs locally on Node.js inside VS Code. It reads and writes directly to the JSON files inside your local synced OneDrive folder.
* **Benefits**: No local servers to run, zero command prompt interactions, and access right next to your application code.
* **Installation**: Install using the pre-compiled single file package: `promptvault-1.0.0.vsix`.

### Option B: Standalone Web Tab (Best for Teams/Non-Developers)
The application runs inside a web browser or embedded as a Website Tab at the top of a Microsoft Teams channel.
* **How it works**: The React website loads in the browser. It prompts the user to select their local synced OneDrive folder. Once selected, the browser reads/writes files directly to that folder using the secure HTML5 File System Access API.
* **Benefits**: Highly accessible to product managers, analysts, and stakeholders inside Microsoft Teams.

---

## 3. How the OneDrive Sync Works

No database server is hosted on the internet. Instead, your local workstations communicate via the OneDrive Cloud folder using the native OneDrive sync engine.

```mermaid
graph TD
    subgraph User A (Lead Workstation)
        UI1["React UI (Teams or VS Code)"] -->|Saves Prompt Revision| FS1["Local OneDrive Sync Folder"]
    end

    subgraph Corporate Cloud Sync
        FS1 <==>|OneDrive Background Upload/Download| OC["OneDrive Cloud Folder"]
        OC <==>|OneDrive Background Upload/Download| FS2["Local OneDrive Sync Folder"]
    end

    subgraph User B (Member Workstation)
        FS2 -->|Loads Updated Prompt JSON| UI2["React UI (Teams or VS Code)"]
    end
```

---

## 4. Key Features

* **Monaco Prompt Editor**: Edit prompts with full line numbering, word count, character count, download options, and fullscreen capabilities.
* **Version Diff Comparison**: Select any two versions of a prompt and view color-coded line differences side-by-side (green for additions, red for deletions).
* **Interactive Test Manager**: Enter questions, log expected outputs, input actual outputs, mark them as PASS/FAIL, and track test history.
* **Collaborative Comments**: Discuss version changes directly inside the revision feed.
* **Audit Trail**: View a complete activity timeline of who created namespaces, who saved revisions, and when changes were promoted to production.

---

## 5. Repository File Layout

```text
PromptVault/
├── promptvault-1.0.0.vsix  <-- VS Code Extension Installer (One-click install)
├── README.md               <-- Main Project Documentation (This file)
├── SETUP_GUIDE.md          <-- Step-by-Step Setup Guide (Windows/Teams/VSIX)
│
├── vscode-extension/       <-- VS Code Extension Source Workspace
│   ├── src/
│   │   └── extension.ts    <-- Extension entrypoint & Node.js file system engine
│   └── package.json        <-- Configuration settings & command bindings
│
├── frontend/               <-- React Client Source Workspace
│   ├── src/
│   │   ├── pages/          <-- Dashboard, Editor, Diff, Settings views
│   │   └── services/
│   │       └── api.ts      <-- Bridge router (detects Webview vs standalone API)
│   └── package.json        <-- Client dependencies
│
└── backend/                <-- FastAPI Python Server (Optional standalone web host)
```

---

## 6. Setup Instructions

For a step-by-step walkthrough of installing the VS Code Extension, sharing the OneDrive sync folder, and adding the app to Microsoft Teams, please follow:

📄 [SETUP_GUIDE.md](SETUP_GUIDE.md)
