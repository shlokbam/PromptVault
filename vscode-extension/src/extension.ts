import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
  // Command to open PromptVault in a main editor tab
  context.subscriptions.push(
    vscode.commands.registerCommand('promptvault.open', () => {
      PromptVaultPanel.createOrShow(context.extensionUri);
    })
  );

  // Sidebar Webview provider
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'promptvault.view',
      new PromptVaultSidebarProvider(context.extensionUri)
    )
  );
}

// Sidebar provider implementation
class PromptVaultSidebarProvider implements vscode.WebviewViewProvider {
  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    const databasePath = getDatabasePath();
    if (!databasePath) {
      webviewView.webview.html = getSetupRequiredHtml();
      return;
    }

    const db = new LocalDatabase(databasePath);
    db.init();

    webviewView.webview.html = getWebviewContent(webviewView.webview, this._extensionUri);
    setupMessageListener(webviewView.webview, db);
  }
}

// Main Editor Webview Panel implementation
class PromptVaultPanel {
  public static currentPanel: PromptVaultPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (PromptVaultPanel.currentPanel) {
      PromptVaultPanel.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'promptvault',
      'PromptVault Workspace',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [extensionUri],
        retainContextWhenHidden: true
      }
    );

    PromptVaultPanel.currentPanel = new PromptVaultPanel(panel, extensionUri);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    const databasePath = getDatabasePath();
    if (!databasePath) {
      this._panel.webview.html = getSetupRequiredHtml();
      return;
    }

    const db = new LocalDatabase(databasePath);
    db.init();

    this._panel.webview.html = getWebviewContent(this._panel.webview, this._extensionUri);
    setupMessageListener(this._panel.webview, db);

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  public dispose() {
    PromptVaultPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }
}

// Get the user configured database path setting
function getDatabasePath(): string {
  const config = vscode.workspace.getConfiguration('promptvault');
  return config.get<string>('databasePath') || '';
}

// HTML to prompt user to set up their OneDrive database path
function getSetupRequiredHtml(): string {
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
      <button onclick="vscode.postMessage({ command: 'openSettings' })">Open Settings</button>
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
function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
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
function setupMessageListener(webview: vscode.Webview, db: LocalDatabase) {
  webview.onDidReceiveMessage((message) => {
    const { id, action, payload } = message;

    if (action === 'openSettings') {
      vscode.commands.executeCommand('workbench.action.openSettings', 'promptvault.databasePath');
      return;
    }

    try {
      let data: any = null;

      switch (action) {
        case 'login':
          data = {
            access_token: 'local-vscode-token',
            token_type: 'bearer',
            user: {
              id: 1,
              name: payload.email.split('@')[0].replace('.', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
              email: payload.email,
              role: 'Manager',
              created_at: new Date().toISOString()
            }
          };
          break;

        case 'register':
          data = {
            id: Math.floor(Math.random() * 1000) + 1,
            name: payload.name,
            email: payload.email,
            role: payload.role,
            created_at: new Date().toISOString()
          };
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
          data = db.createVersion(
            payload.promptTypeId,
            payload.content,
            payload.changeSummary,
            payload.status
          );
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
          data = db.createTest(
            payload.versionId,
            payload.question,
            payload.expectedOutput,
            payload.actualOutput,
            payload.status,
            payload.notes
          );
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
    } catch (err: any) {
      webview.postMessage({ type: 'response', id, error: err.message || 'Error executing request' });
    }
  });
}

// Flat file database controller on local OneDrive workspace
class LocalDatabase {
  constructor(private readonly dbPath: string) {}

  private getFilePath(filename: string): string {
    return path.join(this.dbPath, filename);
  }

  private readJson<T>(filename: string, defaultValue: T[]): T[] {
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
      return JSON.parse(data) as T[];
    } catch (e) {
      return defaultValue;
    }
  }

  private writeJson<T>(filename: string, data: T[]): void {
    const filePath = this.getFilePath(filename);
    if (!fs.existsSync(this.dbPath)) {
      fs.mkdirSync(this.dbPath, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  public init() {
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

  public getAgents(): any[] {
    return this.readJson('agents.json', []);
  }

  public createAgent(name: string, description?: string): any {
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

  public updateAgent(id: number, name: string, description?: string): any {
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

  public deleteAgent(id: number): any {
    let agents = this.getAgents();
    const agent = agents.find(a => a.id === id);
    if (!agent) {
      throw new Error(`Agent not found`);
    }
    agents = agents.filter(a => a.id !== id);
    this.writeJson('agents.json', agents);

    // Cascade delete prompt types
    const types = this.readJson<any>('prompt_types.json', []);
    const typesToDelete = types.filter(t => t.agent_id === id);
    this.writeJson('prompt_types.json', types.filter(t => t.agent_id !== id));

    for (const t of typesToDelete) {
      this.cascadeDeletePromptType(t.id);
    }

    this.logActivity(`Deleted Agent '${agent.name}'`, 'Agent', id);
    return { detail: "Deleted successfully" };
  }

  public getPromptTypes(agentId: number): any[] {
    const types = this.readJson<any>('prompt_types.json', []);
    return types.filter((t: any) => t.agent_id === agentId);
  }

  public createPromptType(agentId: number, typeName: string): any {
    const types = this.readJson<any>('prompt_types.json', []);
    const newId = types.length > 0 ? Math.max(...types.map((t: any) => t.id)) + 1 : 1;
    const newType = { id: newId, agent_id: agentId, type_name: typeName };
    types.push(newType);
    this.writeJson('prompt_types.json', types);
    this.logActivity(`Created Prompt Type '${typeName}'`, 'PromptType', newId);
    return newType;
  }

  public deletePromptType(id: number): any {
    const types = this.readJson<any>('prompt_types.json', []);
    const type = types.find((t: any) => t.id === id);
    if (!type) {
      throw new Error(`Prompt type not found`);
    }
    this.writeJson('prompt_types.json', types.filter((t: any) => t.id !== id));
    this.cascadeDeletePromptType(id);
    this.logActivity(`Deleted Prompt Type '${type.type_name}'`, 'PromptType', id);
    return { detail: "Deleted successfully" };
  }

  private cascadeDeletePromptType(promptTypeId: number) {
    let versions = this.readJson<any>('versions.json', []);
    const versionsToDelete = versions.filter((v: any) => v.prompt_type_id === promptTypeId);
    this.writeJson('versions.json', versions.filter((v: any) => v.prompt_type_id !== promptTypeId));

    for (const v of versionsToDelete) {
      this.cascadeDeleteVersion(v.id);
    }
  }

  public getVersions(promptTypeId: number): any[] {
    const versions = this.readJson<any>('versions.json', []);
    return versions.filter((v: any) => v.prompt_type_id === promptTypeId);
  }

  public createVersion(promptTypeId: number, content: string, changeSummary: string, status: string): any {
    const versions = this.readJson<any>('versions.json', []);
    const sameType = versions.filter((v: any) => v.prompt_type_id === promptTypeId);
    const nextVer = sameType.length > 0 ? Math.max(...sameType.map((v: any) => v.version_number)) + 1 : 1;
    const newId = versions.length > 0 ? Math.max(...versions.map((v: any) => v.id)) + 1 : 1;

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

  public getVersion(id: number): any {
    const versions = this.readJson<any>('versions.json', []);
    const ver = versions.find((v: any) => v.id === id);
    if (!ver) {
      throw new Error(`Version not found`);
    }
    return ver;
  }

  public restoreVersion(id: number, reason: string): any {
    const target = this.getVersion(id);
    return this.createVersion(
      target.prompt_type_id,
      target.content,
      reason || `Restored from Version ${target.version_number}`,
      'Production'
    );
  }

  public deleteVersion(id: number): any {
    let versions = this.readJson<any>('versions.json', []);
    const ver = versions.find((v: any) => v.id === id);
    if (!ver) {
      throw new Error(`Version not found`);
    }
    this.writeJson('versions.json', versions.filter((v: any) => v.id !== id));
    this.cascadeDeleteVersion(id);
    this.logActivity(`Deleted Version ${ver.version_number}`, 'PromptVersion', id);
    return { detail: "Deleted successfully" };
  }

  private cascadeDeleteVersion(versionId: number) {
    const comments = this.readJson<any>('comments.json', []);
    this.writeJson('comments.json', comments.filter((c: any) => c.prompt_version_id !== versionId));

    const tests = this.readJson<any>('tests.json', []);
    this.writeJson('tests.json', tests.filter((t: any) => t.prompt_version_id !== versionId));
  }

  public getComments(versionId: number): any[] {
    const comments = this.readJson<any>('comments.json', []);
    return comments.filter((c: any) => c.prompt_version_id === versionId);
  }

  public createComment(versionId: number, comment: string): any {
    const comments = this.readJson<any>('comments.json', []);
    const newId = comments.length > 0 ? Math.max(...comments.map((c: any) => c.id)) + 1 : 1;
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

  public getTests(versionId: number): any[] {
    const tests = this.readJson<any>('tests.json', []);
    return tests.filter((t: any) => t.prompt_version_id === versionId);
  }

  public createTest(versionId: number, question: string, expectedOutput: string, actualOutput: string, status: 'PASS' | 'FAIL', notes?: string): any {
    const tests = this.readJson<any>('tests.json', []);
    const newId = tests.length > 0 ? Math.max(...tests.map((t: any) => t.id)) + 1 : 1;
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

  public search(q: string): any {
    const lowercaseQuery = q.toLowerCase();
    const results: any[] = [];

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
    const versions = this.readJson<any>('versions.json', []);
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

  public getActivity(): any[] {
    return this.readJson('activity.json', []).reverse(); // Newest first
  }

  public getStats(): any {
    const agents = this.getAgents();
    const versions = this.readJson<any>('versions.json', []);
    const types = this.readJson<any>('prompt_types.json', []);

    return {
      total_agents: agents.length,
      total_prompts: types.length,
      total_versions: versions.length,
      total_updates_today: versions.filter((v: any) => v.created_at.startsWith(new Date().toISOString().split('T')[0])).length
    };
  }

  private logActivity(action: string, entityType: string, entityId: number) {
    const logs = this.readJson<any>('activity.json', []);
    const newId = logs.length > 0 ? Math.max(...logs.map((l: any) => l.id)) + 1 : 1;
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
