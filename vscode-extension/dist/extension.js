"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const activeWebviews = new Set();
function broadcastMessage(message) {
    for (const webview of activeWebviews) {
        try {
            webview.postMessage(message);
        }
        catch (e) {
            // ignore
        }
    }
}
let statusBarItem;
function getDatabase() {
    const path = getDatabasePath();
    if (!path) {
        return null;
    }
    return new LocalDatabase(path);
}
function updateStatusBar(context) {
    if (!statusBarItem)
        return;
    const databasePath = getDatabasePath();
    const currentUser = context.globalState.get('currentUser');
    if (!databasePath) {
        statusBarItem.text = '$(shield) PromptVault: Set Path';
        statusBarItem.tooltip = 'Click to configure OneDrive database path';
        statusBarItem.show();
        return;
    }
    if (!currentUser) {
        statusBarItem.text = '$(lock) PromptVault: Log In';
        statusBarItem.tooltip = 'Click to log in or register';
        statusBarItem.show();
        return;
    }
    const activeAgentName = context.globalState.get('activeAgentName') || 'No Agent';
    statusBarItem.text = `$(folder-active) PromptVault: ${activeAgentName}`;
    statusBarItem.tooltip = `Logged in as ${currentUser.name}. Click for quick actions.`;
    statusBarItem.show();
}
function activate(context) {
    const sidebarProvider = new PromptVaultSidebarProvider(context, context.extensionUri);
    // Initialize Status Bar Item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = 'promptvault.statusBarClick';
    context.subscriptions.push(statusBarItem);
    updateStatusBar(context);
    // Sidebar Webview provider
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('promptvault.view', sidebarProvider));
    // Command to open PromptVault in a main editor tab
    context.subscriptions.push(vscode.commands.registerCommand('promptvault.open', () => {
        PromptVaultPanel.createOrShow(context, context.extensionUri);
    }));
    // Status Bar click command (Quick Actions)
    context.subscriptions.push(vscode.commands.registerCommand('promptvault.statusBarClick', async () => {
        const databasePath = getDatabasePath();
        if (!databasePath) {
            vscode.commands.executeCommand('workbench.action.openSettings', 'promptvault.databasePath');
            return;
        }
        const currentUser = context.globalState.get('currentUser');
        if (!currentUser) {
            vscode.commands.executeCommand('workbench.view.extension.promptvault-container');
            vscode.window.showInformationMessage('Please log in or register in the PromptVault sidebar.');
            return;
        }
        const db = getDatabase();
        if (!db) {
            vscode.window.showErrorMessage('Failed to load database. Check settings.');
            return;
        }
        const activeAgentId = context.globalState.get('activeAgentId');
        const activeAgentName = context.globalState.get('activeAgentName') || 'None';
        const activePromptTypeId = context.globalState.get('activePromptTypeId');
        const activePromptTypeName = context.globalState.get('activePromptTypeName') || 'None';
        const options = [
            {
                label: `$(user) Logged in as: ${currentUser.name}`,
                description: 'Click to Log Out',
                detail: `Email: ${currentUser.email} (${currentUser.role})`
            },
            {
                label: `$(tag) Select Active Agent (Current: ${activeAgentName})`,
                description: 'Change active agent namespace'
            },
            {
                label: `$(file) Select Active Prompt File (Current: ${activePromptTypeName})`,
                description: 'Change current prompt type'
            }
        ];
        if (activeAgentId && activePromptTypeId) {
            options.push({
                label: `$(desktop-download) Insert Current Prompt Version`,
                description: `Paste selected version of ${activePromptTypeName} into editor`
            }, {
                label: `$(cloud-upload) Save Active Editor as New Version`,
                description: `Save active document as next version of ${activePromptTypeName}`
            });
        }
        options.push({
            label: `$(gear) Open Settings`,
            description: 'Configure OneDrive folder path'
        });
        const selection = await vscode.window.showQuickPick(options, {
            placeHolder: 'PromptVault Quick Actions'
        });
        if (!selection)
            return;
        if (selection.label.startsWith('$(user)')) {
            // Log out
            await context.globalState.update('currentUser', undefined);
            await context.globalState.update('activeAgentId', undefined);
            await context.globalState.update('activeAgentName', undefined);
            await context.globalState.update('activePromptTypeId', undefined);
            await context.globalState.update('activePromptTypeName', undefined);
            updateStatusBar(context);
            broadcastMessage({
                type: 'activeSelectionChanged',
                activeAgentId: undefined,
                activeAgentName: undefined,
                activePromptTypeId: undefined,
                activePromptTypeName: undefined
            });
            vscode.window.showInformationMessage('Logged out of PromptVault.');
        }
        else if (selection.label.startsWith('$(tag)')) {
            // Select Agent Namespace
            const agents = db.getAgents();
            const agentOptions = agents.map((a) => ({
                label: a.name,
                description: a.description,
                id: a.id
            }));
            agentOptions.push({
                label: '$(plus) Create New Agent Namespace',
                description: 'Define a new agent in the database',
                id: -1
            });
            const agentSel = await vscode.window.showQuickPick(agentOptions, {
                placeHolder: 'Select Agent Namespace'
            });
            if (!agentSel)
                return;
            if (agentSel.id === -1) {
                const newName = await vscode.window.showInputBox({ prompt: 'Enter new Agent name' });
                if (!newName)
                    return;
                const newDesc = await vscode.window.showInputBox({ prompt: 'Enter Agent description (optional)' });
                const newAgent = db.createAgent(newName, newDesc);
                await context.globalState.update('activeAgentId', newAgent.id);
                await context.globalState.update('activeAgentName', newAgent.name);
                await context.globalState.update('activePromptTypeId', undefined);
                await context.globalState.update('activePromptTypeName', undefined);
                vscode.window.showInformationMessage(`Agent namespace '${newName}' created!`);
            }
            else {
                await context.globalState.update('activeAgentId', agentSel.id);
                await context.globalState.update('activeAgentName', agentSel.label);
                await context.globalState.update('activePromptTypeId', undefined);
                await context.globalState.update('activePromptTypeName', undefined);
            }
            updateStatusBar(context);
            broadcastMessage({
                type: 'activeSelectionChanged',
                activeAgentId: context.globalState.get('activeAgentId'),
                activeAgentName: context.globalState.get('activeAgentName'),
                activePromptTypeId: undefined,
                activePromptTypeName: undefined
            });
        }
        else if (selection.label.startsWith('$(file)')) {
            // Select Prompt Type
            if (!activeAgentId) {
                vscode.window.showWarningMessage('Please select an active Agent namespace first.');
                return;
            }
            const types = db.getPromptTypes(activeAgentId);
            const typeOptions = types.map((t) => ({
                label: t.type_name,
                id: t.id
            }));
            typeOptions.push({
                label: '$(plus) Create New Prompt Type (File)',
                id: -1
            });
            const typeSel = await vscode.window.showQuickPick(typeOptions, {
                placeHolder: 'Select Prompt Type'
            });
            if (!typeSel)
                return;
            if (typeSel.id === -1) {
                const newName = await vscode.window.showInputBox({ prompt: 'Enter new Prompt Type name (e.g. System, SQL, Validation)' });
                if (!newName)
                    return;
                const newType = db.createPromptType(activeAgentId, newName);
                await context.globalState.update('activePromptTypeId', newType.id);
                await context.globalState.update('activePromptTypeName', newType.type_name);
                vscode.window.showInformationMessage(`Prompt Type '${newName}' created!`);
            }
            else {
                await context.globalState.update('activePromptTypeId', typeSel.id);
                await context.globalState.update('activePromptTypeName', typeSel.label);
            }
            updateStatusBar(context);
            broadcastMessage({
                type: 'activeSelectionChanged',
                activeAgentId: context.globalState.get('activeAgentId'),
                activeAgentName: context.globalState.get('activeAgentName'),
                activePromptTypeId: context.globalState.get('activePromptTypeId'),
                activePromptTypeName: context.globalState.get('activePromptTypeName')
            });
        }
        else if (selection.label.includes('Insert Current Prompt Version')) {
            if (!activePromptTypeId)
                return;
            const versions = db.getVersions(activePromptTypeId);
            if (versions.length === 0) {
                vscode.window.showWarningMessage('No versions found for this prompt.');
                return;
            }
            const verOptions = versions.map((v) => ({
                label: `Version ${v.version_number} (${v.status})`,
                description: v.change_summary,
                content: v.content
            }));
            const verSel = await vscode.window.showQuickPick(verOptions, {
                placeHolder: 'Select version to insert'
            });
            if (!verSel)
                return;
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                await activeEditor.edit(editBuilder => {
                    const position = activeEditor.selection.active;
                    editBuilder.insert(position, verSel.content);
                });
                vscode.window.showInformationMessage('Prompt version inserted!');
            }
            else {
                vscode.window.showErrorMessage('No active text editor open.');
            }
        }
        else if (selection.label.includes('Save Active Editor as New Version')) {
            if (!activePromptTypeId)
                return;
            const activeEditor = vscode.window.activeTextEditor;
            if (!activeEditor) {
                vscode.window.showErrorMessage('No active text editor open.');
                return;
            }
            const content = activeEditor.document.getText();
            const changeSummary = await vscode.window.showInputBox({
                prompt: 'Enter Change Summary for this new version',
                placeHolder: 'e.g. Added error validation block'
            });
            if (!changeSummary)
                return;
            const statusOptions = ['Draft', 'Testing', 'Production', 'Archived'];
            const statusSel = await vscode.window.showQuickPick(statusOptions, {
                placeHolder: 'Select status for this version'
            });
            if (!statusSel)
                return;
            db.createVersion(activePromptTypeId, content, changeSummary, statusSel);
            vscode.window.showInformationMessage(`Saved new version of ${activePromptTypeName} successfully!`);
            broadcastMessage({
                type: 'versionAdded',
                promptTypeId: activePromptTypeId
            });
        }
        else if (selection.label.includes('Open Settings')) {
            vscode.commands.executeCommand('workbench.action.openSettings', 'promptvault.databasePath');
        }
    }));
    // Listen for config changes to automatically refresh the view
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('promptvault.databasePath')) {
            sidebarProvider.updateWebview();
            if (PromptVaultPanel.currentPanel) {
                PromptVaultPanel.currentPanel.updateWebview();
            }
            updateStatusBar(context);
        }
    }));
}
// Sidebar provider implementation
class PromptVaultSidebarProvider {
    _context;
    _extensionUri;
    _view;
    _disposables = [];
    constructor(_context, _extensionUri) {
        this._context = _context;
        this._extensionUri = _extensionUri;
    }
    resolveWebviewView(webviewView, _context, _token) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        this.updateWebview();
    }
    updateWebview() {
        if (!this._view) {
            return;
        }
        // Clean up previous listeners to prevent duplicates
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                activeWebviews.delete(this._view.webview);
                x.dispose();
            }
        }
        const databasePath = getDatabasePath();
        if (!databasePath) {
            this._view.webview.html = getSetupRequiredHtml();
            this._disposables.push(this._view.webview.onDidReceiveMessage((message) => {
                if (message.action === 'openSettings' || message.command === 'openSettings') {
                    vscode.commands.executeCommand('workbench.action.openSettings', 'promptvault.databasePath');
                }
            }));
            return;
        }
        const db = new LocalDatabase(databasePath);
        db.init();
        this._view.webview.html = getWebviewContent(this._view.webview, this._extensionUri);
        const listener = setupMessageListener(this._context, this._view.webview, db);
        this._disposables.push(listener);
        activeWebviews.add(this._view.webview);
        this._disposables.push(new vscode.Disposable(() => {
            activeWebviews.delete(this._view.webview);
        }));
    }
}
// Main Editor Webview Panel implementation
class PromptVaultPanel {
    static currentPanel;
    _panel;
    _extensionUri;
    _context;
    _disposables = [];
    _webviewDisposables = [];
    static createOrShow(context, extensionUri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
        if (PromptVaultPanel.currentPanel) {
            PromptVaultPanel.currentPanel._panel.reveal(column);
            return;
        }
        const panel = vscode.window.createWebviewPanel('promptvault', 'PromptVault Workspace', column || vscode.ViewColumn.One, {
            enableScripts: true,
            localResourceRoots: [extensionUri],
            retainContextWhenHidden: true
        });
        PromptVaultPanel.currentPanel = new PromptVaultPanel(context, panel, extensionUri);
    }
    constructor(context, panel, extensionUri) {
        this._context = context;
        this._panel = panel;
        this._extensionUri = extensionUri;
        this.updateWebview();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }
    updateWebview() {
        // Clear previous webview listeners to prevent duplicates
        while (this._webviewDisposables.length) {
            const x = this._webviewDisposables.pop();
            if (x) {
                activeWebviews.delete(this._panel.webview);
                x.dispose();
            }
        }
        const databasePath = getDatabasePath();
        if (!databasePath) {
            this._panel.webview.html = getSetupRequiredHtml();
            this._webviewDisposables.push(this._panel.webview.onDidReceiveMessage((message) => {
                if (message.action === 'openSettings' || message.command === 'openSettings') {
                    vscode.commands.executeCommand('workbench.action.openSettings', 'promptvault.databasePath');
                }
            }));
            return;
        }
        const db = new LocalDatabase(databasePath);
        db.init();
        this._panel.webview.html = getWebviewContent(this._panel.webview, this._extensionUri);
        const listener = setupMessageListener(this._context, this._panel.webview, db);
        this._webviewDisposables.push(listener);
        activeWebviews.add(this._panel.webview);
        this._webviewDisposables.push(new vscode.Disposable(() => {
            activeWebviews.delete(this._panel.webview);
        }));
    }
    dispose() {
        PromptVaultPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
        while (this._webviewDisposables.length) {
            const x = this._webviewDisposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
}
// Get the user configured database path setting
function getDatabasePath() {
    const config = vscode.workspace.getConfiguration('promptvault');
    return config.get('databasePath') || '';
}
// HTML to prompt user to set up their OneDrive database path
function getSetupRequiredHtml() {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: sans-serif; padding: 20px; color: var(--vscode-foreground); }
        h3 { color: var(--vscode-editorWarning-foreground); }
        code { background: var(--vscode-textCodeBlock-background); padding: 2px 4px; border-radius: 4px; }
        button { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 8px 12px; cursor: pointer; border-radius: 4px; margin-top: 15px; }
        button:hover { background: var(--vscode-button-hoverBackground); }
      </style>
    </head>
    <body>
      <h3>OneDrive Database Path Required</h3>
      <p>Please configure your shared local OneDrive database folder path before opening the PromptVault workspace.</p>
      <p>Go to: <code>Settings -> Extensions -> PromptVault Settings</code> and set the path (e.g. <code>C:\\Users\\username\\OneDrive - Company\\PromptVault_Database</code>).</p>
      <button>Open Settings</button>
      <script>
        const vscode = acquireVsCodeApi();
        document.querySelector('button').addEventListener('click', () => {
          vscode.postMessage({ action: 'openSettings' });
        });
      </script>
    </body>
    </html>
  `;
}
// Load React static index.html and update asset paths for Webview compatibility
function getWebviewContent(webview, extensionUri) {
    const distPath = vscode.Uri.joinPath(extensionUri, 'media', 'dist');
    const indexHtmlPath = vscode.Uri.joinPath(distPath, 'index.html');
    if (!fs.existsSync(indexHtmlPath.fsPath)) {
        return `
      <h3>Assets not built yet</h3>
      <p>Please compile the frontend using <code>npm run build</code> in the frontend directory and copy the contents of <code>frontend/dist</code> to <code>vscode-extension/media/dist</code>.</p>
    `;
    }
    let html = fs.readFileSync(indexHtmlPath.fsPath, 'utf-8');
    // Convert relative href="./assets/..." and src="./assets/..." to Webview compatible URIs
    html = html.replace(/(href|src)="(\.\/[^"]+)"/g, (_, attribute, relativePath) => {
        const assetUri = vscode.Uri.joinPath(distPath, relativePath.replace('./', ''));
        const webviewUri = webview.asWebviewUri(assetUri);
        return `${attribute}="${webviewUri}"`;
    });
    return html;
}
// Receive and delegate requests from the React frontend
function setupMessageListener(context, webview, db) {
    return webview.onDidReceiveMessage(async (message) => {
        const { id, action, payload } = message;
        if (action === 'openSettings' || message.command === 'openSettings') {
            vscode.commands.executeCommand('workbench.action.openSettings', 'promptvault.databasePath');
            return;
        }
        try {
            let data = null;
            switch (action) {
                case 'getSession':
                    const currentUser = context.globalState.get('currentUser');
                    if (currentUser) {
                        data = {
                            access_token: 'local-vscode-token',
                            token_type: 'bearer',
                            user: currentUser
                        };
                    }
                    else {
                        data = null;
                    }
                    break;
                case 'logout':
                    await context.globalState.update('currentUser', undefined);
                    await context.globalState.update('activeAgentId', undefined);
                    await context.globalState.update('activeAgentName', undefined);
                    await context.globalState.update('activePromptTypeId', undefined);
                    await context.globalState.update('activePromptTypeName', undefined);
                    updateStatusBar(context);
                    broadcastMessage({
                        type: 'activeSelectionChanged',
                        activeAgentId: undefined,
                        activeAgentName: undefined,
                        activePromptTypeId: undefined,
                        activePromptTypeName: undefined
                    });
                    data = { success: true };
                    break;
                case 'insertVersionContent':
                    const activeEditor = vscode.window.activeTextEditor;
                    if (activeEditor) {
                        await activeEditor.edit((editBuilder) => {
                            const position = activeEditor.selection.active;
                            editBuilder.insert(position, payload.content);
                        });
                        vscode.window.showInformationMessage('Prompt version inserted successfully!');
                        data = { success: true };
                    }
                    else {
                        vscode.window.showErrorMessage('No active text editor open to insert prompt.');
                        data = { error: 'No active text editor' };
                    }
                    break;
                case 'getActiveEditorContent':
                    const actEditor = vscode.window.activeTextEditor;
                    if (actEditor) {
                        data = { content: actEditor.document.getText() };
                    }
                    else {
                        vscode.window.showErrorMessage('No active text editor open.');
                        data = { error: 'No active text editor' };
                    }
                    break;
                case 'login':
                    data = {
                        access_token: 'local-vscode-token',
                        token_type: 'bearer',
                        user: {
                            id: 1,
                            name: payload.email.split('@')[0].replace('.', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
                            email: payload.email,
                            role: 'Manager',
                            created_at: new Date().toISOString()
                        }
                    };
                    await context.globalState.update('currentUser', data.user);
                    updateStatusBar(context);
                    break;
                case 'register':
                    data = {
                        id: Math.floor(Math.random() * 1000) + 1,
                        name: payload.name,
                        email: payload.email,
                        role: payload.role,
                        created_at: new Date().toISOString()
                    };
                    await context.globalState.update('currentUser', data);
                    updateStatusBar(context);
                    break;
                case 'getAgents':
                    data = db.getAgents();
                    break;
                case 'createAgent':
                    data = db.createAgent(payload.name, payload.description);
                    break;
                case 'updateAgent':
                    data = db.updateAgent(payload.id, payload.name, payload.description);
                    break;
                case 'deleteAgent':
                    data = db.deleteAgent(payload.id);
                    break;
                case 'getPromptTypes':
                    data = db.getPromptTypes(payload.agentId);
                    break;
                case 'createPromptType':
                    data = db.createPromptType(payload.agentId, payload.typeName);
                    break;
                case 'deletePromptType':
                    data = db.deletePromptType(payload.id);
                    break;
                case 'getVersions':
                    data = db.getVersions(payload.promptTypeId);
                    break;
                case 'createVersion':
                    data = db.createVersion(payload.promptTypeId, payload.content, payload.changeSummary, payload.status);
                    break;
                case 'getVersion':
                    data = db.getVersion(payload.id);
                    break;
                case 'restoreVersion':
                    data = db.restoreVersion(payload.id, payload.reason);
                    break;
                case 'deleteVersion':
                    data = db.deleteVersion(payload.id);
                    break;
                case 'getComments':
                    data = db.getComments(payload.versionId);
                    break;
                case 'createComment':
                    data = db.createComment(payload.versionId, payload.comment);
                    break;
                case 'getTests':
                    data = db.getTests(payload.versionId);
                    break;
                case 'createTest':
                    data = db.createTest(payload.versionId, payload.question, payload.expectedOutput, payload.actualOutput, payload.status, payload.notes);
                    break;
                case 'search':
                    data = db.search(payload.q);
                    break;
                case 'getActivity':
                    data = db.getActivity();
                    break;
                case 'getStats':
                    data = db.getStats();
                    break;
                default:
                    throw new Error(`Unsupported action: ${action}`);
            }
            webview.postMessage({ type: 'response', id, data });
        }
        catch (err) {
            webview.postMessage({ type: 'response', id, error: err.message || 'Error executing request' });
        }
    });
}
// Flat file database controller on local OneDrive workspace
class LocalDatabase {
    dbPath;
    constructor(dbPath) {
        this.dbPath = dbPath;
    }
    getFilePath(filename) {
        return path.join(this.dbPath, filename);
    }
    readJson(filename, defaultValue) {
        const filePath = this.getFilePath(filename);
        if (!fs.existsSync(filePath)) {
            if (!fs.existsSync(this.dbPath)) {
                fs.mkdirSync(this.dbPath, { recursive: true });
            }
            fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
            return defaultValue;
        }
        try {
            const data = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(data);
        }
        catch (e) {
            return defaultValue;
        }
    }
    writeJson(filename, data) {
        const filePath = this.getFilePath(filename);
        if (!fs.existsSync(this.dbPath)) {
            fs.mkdirSync(this.dbPath, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    }
    init() {
        const agents = this.readJson('agents.json', []);
        if (agents.length === 0) {
            // Seed default structural data if empty (matching original SQLite defaults)
            this.writeJson('agents.json', [
                { id: 1, name: "Forecast", description: "AI agent designed to handle product sales forecasts, regional revenue, and active subscriptions", created_by: 1, created_at: new Date().toISOString(), creator_name: "Admin" },
                { id: 2, name: "Support Copilot", description: "Customer support automation agent for ticket parsing and routing", created_by: 1, created_at: new Date().toISOString(), creator_name: "Admin" }
            ]);
            this.writeJson('prompt_types.json', [
                { id: 1, agent_id: 1, type_name: "System" },
                { id: 2, agent_id: 1, type_name: "SQL" },
                { id: 3, agent_id: 1, type_name: "Chart" },
                { id: 4, agent_id: 1, type_name: "Validation" },
                { id: 5, agent_id: 2, type_name: "System" },
                { id: 6, agent_id: 2, type_name: "SQL" },
                { id: 7, agent_id: 2, type_name: "Chart" },
                { id: 8, agent_id: 2, type_name: "Validation" }
            ]);
            this.writeJson('versions.json', [
                {
                    id: 1,
                    prompt_type_id: 2,
                    version_number: 1,
                    content: "-- Version 1: Basic retrieval\nSELECT * \nFROM forecast_data \nWHERE year = 2026 \n  AND product_name = :product;\n",
                    change_summary: "Initial SQL prompt setup for products",
                    status: "Archived",
                    author_id: 1,
                    author_name: "Admin",
                    created_at: new Date().toISOString()
                },
                {
                    id: 2,
                    prompt_type_id: 2,
                    version_number: 2,
                    content: "-- Version 2: Added aggregations\nSELECT \n    month,\n    SUM(demand) as total_demand,\n    AVG(confidence) as avg_confidence\nFROM forecast_data \nWHERE year = 2026 \n  AND product_name = :product\nGROUP BY month\nORDER BY month ASC;\n",
                    change_summary: "Added SQL aggregations and monthly grouping rule",
                    status: "Testing",
                    author_id: 1,
                    author_name: "Admin",
                    created_at: new Date().toISOString()
                },
                {
                    id: 3,
                    prompt_type_id: 2,
                    version_number: 3,
                    content: "-- Version 3: Optimizing performance and filter bindings\nSELECT \n    month,\n    SUM(demand) as total_demand,\n    AVG(confidence) as avg_confidence,\n    LOWER(product_name) as formatted_product\nFROM forecast_data \nWHERE year = 2026 \n  AND LOWER(product_name) = LOWER(:product)\nGROUP BY month, product_name\nORDER BY total_demand DESC;\n",
                    change_summary: "Improved fiscal year and case-insensitive product matching",
                    status: "Production",
                    author_id: 1,
                    author_name: "Admin",
                    created_at: new Date().toISOString()
                }
            ]);
            this.writeJson('comments.json', [
                { id: 1, prompt_version_id: 3, author_id: 1, author_name: "Admin", comment: "Need better SQL logic for Product A grouping.", created_at: new Date().toISOString() }
            ]);
            this.writeJson('tests.json', [
                { id: 1, prompt_version_id: 3, question: "Show monthly demand for Product A.", expected_output: "A table grouped by month detailing sum demand and avg confidence.", actual_output: "Output matches expected format.", status: "PASS", notes: "Working" }
            ]);
            this.writeJson('activity.json', [
                { id: 1, user_id: 1, user_name: "Admin", action: "Created Agent 'Forecast'", entity_type: "Agent", entity_id: 1, created_at: new Date().toISOString() }
            ]);
        }
    }
    // --- CRUD Engine implementations ---
    getAgents() {
        return this.readJson('agents.json', []);
    }
    createAgent(name, description) {
        const agents = this.getAgents();
        const newId = agents.length > 0 ? Math.max(...agents.map(a => a.id)) + 1 : 1;
        const newAgent = {
            id: newId,
            name,
            description: description || '',
            created_by: 1,
            created_at: new Date().toISOString(),
            creator_name: "Admin"
        };
        agents.push(newAgent);
        this.writeJson('agents.json', agents);
        this.logActivity(`Created Agent '${name}'`, 'Agent', newId);
        return newAgent;
    }
    updateAgent(id, name, description) {
        const agents = this.getAgents();
        const index = agents.findIndex(a => a.id === id);
        if (index === -1) {
            throw new Error(`Agent with ID ${id} not found`);
        }
        agents[index].name = name;
        agents[index].description = description || '';
        this.writeJson('agents.json', agents);
        this.logActivity(`Updated Agent '${name}'`, 'Agent', id);
        return agents[index];
    }
    deleteAgent(id) {
        let agents = this.getAgents();
        const agent = agents.find(a => a.id === id);
        if (!agent) {
            throw new Error(`Agent not found`);
        }
        agents = agents.filter(a => a.id !== id);
        this.writeJson('agents.json', agents);
        // Cascade delete prompt types
        const types = this.readJson('prompt_types.json', []);
        const typesToDelete = types.filter(t => t.agent_id === id);
        this.writeJson('prompt_types.json', types.filter(t => t.agent_id !== id));
        for (const t of typesToDelete) {
            this.cascadeDeletePromptType(t.id);
        }
        this.logActivity(`Deleted Agent '${agent.name}'`, 'Agent', id);
        return { detail: "Deleted successfully" };
    }
    getPromptTypes(agentId) {
        const types = this.readJson('prompt_types.json', []);
        return types.filter((t) => t.agent_id === agentId);
    }
    createPromptType(agentId, typeName) {
        const types = this.readJson('prompt_types.json', []);
        const newId = types.length > 0 ? Math.max(...types.map((t) => t.id)) + 1 : 1;
        const newType = { id: newId, agent_id: agentId, type_name: typeName };
        types.push(newType);
        this.writeJson('prompt_types.json', types);
        this.logActivity(`Created Prompt Type '${typeName}'`, 'PromptType', newId);
        return newType;
    }
    deletePromptType(id) {
        const types = this.readJson('prompt_types.json', []);
        const type = types.find((t) => t.id === id);
        if (!type) {
            throw new Error(`Prompt type not found`);
        }
        this.writeJson('prompt_types.json', types.filter((t) => t.id !== id));
        this.cascadeDeletePromptType(id);
        this.logActivity(`Deleted Prompt Type '${type.type_name}'`, 'PromptType', id);
        return { detail: "Deleted successfully" };
    }
    cascadeDeletePromptType(promptTypeId) {
        let versions = this.readJson('versions.json', []);
        const versionsToDelete = versions.filter((v) => v.prompt_type_id === promptTypeId);
        this.writeJson('versions.json', versions.filter((v) => v.prompt_type_id !== promptTypeId));
        for (const v of versionsToDelete) {
            this.cascadeDeleteVersion(v.id);
        }
    }
    getVersions(promptTypeId) {
        const versions = this.readJson('versions.json', []);
        return versions.filter((v) => v.prompt_type_id === promptTypeId);
    }
    createVersion(promptTypeId, content, changeSummary, status) {
        const versions = this.readJson('versions.json', []);
        const sameType = versions.filter((v) => v.prompt_type_id === promptTypeId);
        const nextVer = sameType.length > 0 ? Math.max(...sameType.map((v) => v.version_number)) + 1 : 1;
        const newId = versions.length > 0 ? Math.max(...versions.map((v) => v.id)) + 1 : 1;
        const newVersion = {
            id: newId,
            prompt_type_id: promptTypeId,
            version_number: nextVer,
            content,
            change_summary: changeSummary,
            status,
            author_id: 1,
            author_name: "Admin",
            created_at: new Date().toISOString()
        };
        versions.push(newVersion);
        this.writeJson('versions.json', versions);
        this.logActivity(`Saved Version ${nextVer} of PromptType`, 'PromptVersion', newId);
        return newVersion;
    }
    getVersion(id) {
        const versions = this.readJson('versions.json', []);
        const ver = versions.find((v) => v.id === id);
        if (!ver) {
            throw new Error(`Version not found`);
        }
        return ver;
    }
    restoreVersion(id, reason) {
        const target = this.getVersion(id);
        return this.createVersion(target.prompt_type_id, target.content, reason || `Restored from Version ${target.version_number}`, 'Production');
    }
    deleteVersion(id) {
        let versions = this.readJson('versions.json', []);
        const ver = versions.find((v) => v.id === id);
        if (!ver) {
            throw new Error(`Version not found`);
        }
        this.writeJson('versions.json', versions.filter((v) => v.id !== id));
        this.cascadeDeleteVersion(id);
        this.logActivity(`Deleted Version ${ver.version_number}`, 'PromptVersion', id);
        return { detail: "Deleted successfully" };
    }
    cascadeDeleteVersion(versionId) {
        const comments = this.readJson('comments.json', []);
        this.writeJson('comments.json', comments.filter((c) => c.prompt_version_id !== versionId));
        const tests = this.readJson('tests.json', []);
        this.writeJson('tests.json', tests.filter((t) => t.prompt_version_id !== versionId));
    }
    getComments(versionId) {
        const comments = this.readJson('comments.json', []);
        return comments.filter((c) => c.prompt_version_id === versionId);
    }
    createComment(versionId, comment) {
        const comments = this.readJson('comments.json', []);
        const newId = comments.length > 0 ? Math.max(...comments.map((c) => c.id)) + 1 : 1;
        const newComment = {
            id: newId,
            prompt_version_id: versionId,
            author_id: 1,
            author_name: "Admin",
            comment,
            created_at: new Date().toISOString()
        };
        comments.push(newComment);
        this.writeJson('comments.json', comments);
        return newComment;
    }
    getTests(versionId) {
        const tests = this.readJson('tests.json', []);
        return tests.filter((t) => t.prompt_version_id === versionId);
    }
    createTest(versionId, question, expectedOutput, actualOutput, status, notes) {
        const tests = this.readJson('tests.json', []);
        const newId = tests.length > 0 ? Math.max(...tests.map((t) => t.id)) + 1 : 1;
        const newTest = {
            id: newId,
            prompt_version_id: versionId,
            question,
            expected_output: expectedOutput,
            actual_output: actualOutput,
            status,
            notes: notes || ''
        };
        tests.push(newTest);
        this.writeJson('tests.json', tests);
        return newTest;
    }
    search(q) {
        const lowercaseQuery = q.toLowerCase();
        const results = [];
        // Search agents
        const agents = this.getAgents();
        for (const a of agents) {
            if (a.name.toLowerCase().includes(lowercaseQuery) || (a.description && a.description.toLowerCase().includes(lowercaseQuery))) {
                results.push({
                    id: a.id,
                    type: 'agent',
                    title: a.name,
                    subtitle: 'Agent Namespace',
                    snippet: a.description || '',
                    route_path: `/agents/${a.id}`
                });
            }
        }
        // Search versions
        const versions = this.readJson('versions.json', []);
        for (const v of versions) {
            if (v.content.toLowerCase().includes(lowercaseQuery) || v.change_summary.toLowerCase().includes(lowercaseQuery)) {
                results.push({
                    id: v.id,
                    type: 'version',
                    title: `Version ${v.version_number} Prompt`,
                    subtitle: `In PromptType ${v.prompt_type_id}`,
                    snippet: v.change_summary,
                    route_path: `/agents/1` // Simple routing fallback
                });
            }
        }
        return { query: q, results };
    }
    getActivity() {
        return this.readJson('activity.json', []).reverse(); // Newest first
    }
    getStats() {
        const agents = this.getAgents();
        const versions = this.readJson('versions.json', []);
        const types = this.readJson('prompt_types.json', []);
        return {
            total_agents: agents.length,
            total_prompts: types.length,
            total_versions: versions.length,
            total_updates_today: versions.filter((v) => v.created_at.startsWith(new Date().toISOString().split('T')[0])).length
        };
    }
    logActivity(action, entityType, entityId) {
        const logs = this.readJson('activity.json', []);
        const newId = logs.length > 0 ? Math.max(...logs.map((l) => l.id)) + 1 : 1;
        logs.push({
            id: newId,
            user_id: 1,
            user_name: "Admin",
            action,
            entity_type: entityType,
            entity_id: entityId,
            created_at: new Date().toISOString()
        });
        this.writeJson('activity.json', logs);
    }
}
//# sourceMappingURL=extension.js.map