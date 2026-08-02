# PromptVault - Windows Corporate Setup Guide (Teams SSO & OneDrive)

This guide walks you through setting up **PromptVault** on your Windows corporate laptop.

---

## ⚠️ Important Clarification on how it works
The codebase is structured into a **Frontend (React)** and a **Backend (FastAPI in Python)**. 
* There is **no** "Select OneDrive Folder" button in the browser UI.
* Instead, the React frontend communicates with the FastAPI backend.
* To synchronize your database across your team via OneDrive, we configure the backend to place its SQLite database file (`promptvault.db`) directly into your local corporate **OneDrive folder**. 
* Whenever you or your team make changes, OneDrive syncs this database file in the background automatically.

---

## Phase 1: Set Up the OneDrive Sync Folder

1. Open **Windows File Explorer** (Press `Windows Key + E`).
2. Navigate to your corporate **OneDrive** directory (e.g., `OneDrive - [Your Company Name]`).
3. Create a new folder named `PromptVault_Database`.
4. Right-click the folder, click **Share**, and share it with your team members.
5. **Critical:** Change the permissions from "Can view" to **"Can edit"** (allow modifying files) so they can read/write prompt changes.
6. Once your team members accept the sharing invitation, the `PromptVault_Database` folder will sync to their Windows laptops.

---

## Phase 2: Run the Backend Server on Windows

Since Node.js is already installed, make sure you also have **Python (version 3.10+)** installed on your Windows laptop.

### Step 2.1: Open Terminal and Navigate to Backend
1. Open **PowerShell** or **Command Prompt**:
   * Press the `Windows Key`, type **PowerShell**, and press **Enter**.
2. Navigate to the cloned repository's backend folder:
   ```powershell
   cd C:\Users\YourUsername\Documents\PromptVault\backend
   ```

### Step 2.2: Create and Activate Virtual Environment
1. Create a Python virtual environment to keep dependencies isolated:
   ```powershell
   python -m venv venv
   ```
2. Activate the virtual environment:
   * **In PowerShell:**
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   * **In Command Prompt:**
     ```cmd
     venv\Scripts\activate.bat
     ```

### Step 2.3: Install Dependencies
Install all required Python libraries:
```powershell
pip install -r requirements.txt
```

### Step 2.4: Launch Backend Pointing to OneDrive
To tell the backend to write the database file directly to your shared OneDrive folder, we set the `DATABASE_URL` environment variable before launching the server.

* **If using PowerShell:**
  ```powershell
  $env:DATABASE_URL="sqlite:///C:/Users/YourUsername/OneDrive - Your Company Name/PromptVault_Database/promptvault.db"
  python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
  ```
* **If using Command Prompt:**
  ```cmd
  set DATABASE_URL=sqlite:///C:/Users/YourUsername/OneDrive - Your Company Name/PromptVault_Database/promptvault.db
  python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
  ```

*(Replace `YourUsername` and `Your Company Name` with your actual Windows username and corporate OneDrive folder name. Use forward slashes `/` in the database URL path).*

The backend will start and automatically create and seed the `promptvault.db` file inside your OneDrive folder!

---

## Phase 3: Run the Frontend Server on Windows

### Step 3.1: Open a Second Terminal Window
1. Open a **new, separate** PowerShell or Command Prompt window (leave the backend window running).
2. Navigate to the frontend directory:
   ```powershell
   cd C:\Users\YourUsername\Documents\PromptVault\frontend
   ```

### Step 3.2: Install and Start Frontend
1. Install client libraries:
   ```powershell
   npm install
   ```
2. Run the developer web server:
   ```powershell
   npm run dev
   ```
3. Open your browser and go to:
   `http://localhost:5173`
4. The login screen will appear. You can now log in using the pre-seeded prototype accounts:
   * **Manager / Lead Account**: `bhushan@promptvault.com` with password `ManagerPass123!`
   * **Member Account**: `shlok@promptvault.com` with password `MemberPass123!`

---

## Phase 4: Configure Microsoft Teams SSO (Azure Portal)

To enable automatic sign-in inside Teams without typing passwords, you must register the app in your organization's Microsoft Entra ID (Azure AD) portal.

### Step 4.1: Register the Application
1. Log in to the [Azure Portal](https://portal.azure.com) using your corporate work email.
2. In the top search bar, type **Microsoft Entra ID** and click it.
3. In the left-hand menu, click **App registrations** and then click **New registration**.
4. Configure the settings:
   - **Name**: `PromptVault-SSO`
   - **Supported account types**: Select **Accounts in this organizational directory only (Single tenant)**.
   - **Redirect URI**: Select **Single-page application (SPA)** from the dropdown and type: `http://localhost:5173`
5. Click **Register** at the bottom.
6. Copy the **Application (client) ID** from the overview screen and save it.

### Step 4.2: Configure the API Identity
1. In the App registration sidebar menu, click **Expose an API**.
2. Next to *Application ID URI*, click **Set**.
3. It will auto-fill as `api://[GUID]`. Edit this to match your URL structure:
   `api://localhost:5173/[Application-Client-ID-Here]`
4. Click **Save**.

### Step 4.3: Define SSO Permissions (Scopes)
1. Under the **Expose an API** section, click **Add a scope**.
2. Fill in the fields exactly as follows:
   - **Scope name**: `access_as_user`
   - **Who can consent?**: Select `Admins and users`
   - **Admin consent display name**: `Access PromptVault as a user`
   - **Admin consent description**: `Allows Microsoft Teams to log you into PromptVault automatically.`
   - **User consent display name**: `Access PromptVault as a user`
   - **User consent description**: `Allows Microsoft Teams to log you into PromptVault automatically.`
   - **State**: `Enabled`
3. Click **Add scope**.

### Step 4.4: Authorize Microsoft Teams Clients
You need to authorize Teams apps to read this login scope. Under **Authorized client applications**, click **Add a client application**.
1. **Add the Teams Desktop Client**:
   * Client ID: `1fec8e78-bce4-4aaf-ab1b-5451cc387264`
   * Check the box for the scope you created: `api://localhost:5173/[App-ID]/access_as_user`
   * Click **Add application**.
2. **Add the Teams Web Client**:
   * Click **Add a client application** again.
   * Client ID: `5e3ce6c0-2b1f-4285-8d4b-75ee78787346`
   * Check the box for the scope: `api://localhost:5173/[App-ID]/access_as_user`
   * Click **Add application**.

---

## Phase 5: Configure Teams SSO in Code

Now, configure the frontend to talk to Teams and fetch your profile details automatically.

### Step 5.1: Install the Teams SDK
1. In your Windows Command Prompt or PowerShell, make sure you are in the `frontend` folder.
2. Install the official Microsoft Teams SDK:
   ```cmd
   npm install @microsoft/teams-js
   ```

### Step 5.2: Load SSO Token in Login Page
Open `frontend/src/pages/Login.tsx` in your code editor and add the Teams login logic.

Add this code snippet at the top of your `Login` React component (right after the component definition):

```typescript
import * as teamsjs from '@microsoft/teams-js';

// Inside the Login component:
const [ssoStatus, setSsoStatus] = useState<string>('');
const [inTeams, setInTeams] = useState<boolean>(false);

useEffect(() => {
  // Check if running inside Microsoft Teams
  teamsjs.app.initialize().then(() => {
    setInTeams(true);
    setSsoStatus('Logging you in via Teams SSO...');

    // Fetch the login token from Teams
    teamsjs.authentication.getAuthToken({
      resources: [`api://localhost:5173/YOUR-AZURE-CLIENT-ID-HERE`]
    })
    .then((token) => {
      // Decode the token to get the user's name and email
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const profile = JSON.parse(window.atob(base64));

      // Save token and profile to localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({
        id: profile.oid || 'teams-user',
        name: profile.name || 'Teams User',
        email: profile.upn || profile.email || 'user@company.com',
        role: 'Member'
      }));

      // Go to the dashboard
      navigate('/');
    })
    .catch((err) => {
      console.error(err);
      setSsoStatus('SSO failed. Please sign in manually using credentials below.');
    });
  }).catch(() => {
    // Not running inside Teams; show standard sign-in form
    setInTeams(false);
  });
}, [navigate]);
```
> [!IMPORTANT]
> Replace `YOUR-AZURE-CLIENT-ID-HERE` in the code above with the **Application (client) ID** you copied from the Azure Portal in Step 4.1.

Add this status message to your login form UI (e.g., right above the Email Address input field):
```typescript
{inTeams && (
  <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl mb-4 text-center">
    <p className="text-xs text-zinc-400 font-medium">{ssoStatus}</p>
  </div>
)}
```

---

## Phase 6: Create and Load the Teams App Manifest

To add PromptVault as a tab inside Microsoft Teams on Windows:

### Step 6.1: Create the `manifest.json` File
1. In a temporary folder on your desktop, create a text file and rename it to `manifest.json`.
2. Paste the following JSON configuration into it:

```json
{
  "$schema": "https://developer.microsoft.com/en-us/json-schemas/teams/v1.15/MicrosoftTeams.schema.json",
  "manifestVersion": "1.15",
  "version": "1.0.0",
  "id": "673f4e2c-80a1-4355-896c-b26a111a1234",
  "packageName": "com.company.promptvault",
  "developer": {
    "name": "Corporate DevOps Team",
    "websiteUrl": "http://localhost:5173",
    "privacyUrl": "http://localhost:5173/privacy",
    "termsOfUseUrl": "http://localhost:5173/terms"
  },
  "name": {
    "short": "PromptVault",
    "full": "PromptVault - Teams Sync Edition"
  },
  "description": {
    "short": "Prompt versioning tool synced via OneDrive.",
    "full": "Collaborate on LLM prompts. Saves revisions to a shared OneDrive directory."
  },
  "icons": {
    "outline": "outline.png",
    "color": "color.png"
  },
  "accentColor": "#6366F1",
  "staticTabs": [
    {
      "entityId": "promptvaultDashboard",
      "name": "PromptVault",
      "contentUrl": "http://localhost:5173/",
      "websiteUrl": "http://localhost:5173/",
      "scopes": ["personal"]
    }
  ],
  "permissions": ["identity"],
  "validDomains": ["localhost"],
  "webApplicationInfo": {
    "id": "YOUR-AZURE-CLIENT-ID-HERE",
    "resource": "api://localhost:5173/YOUR-AZURE-CLIENT-ID-HERE"
  }
}
```
> [!IMPORTANT]
> Make sure to replace `YOUR-AZURE-CLIENT-ID-HERE` with the App ID from Step 4.1.

### Step 6.2: Add Icons and Package the Manifest
1. Place two PNG files in the same folder as `manifest.json`:
   - `color.png` (96x96 pixels, transparent colored logo)
   - `outline.png` (32x32 pixels, transparent white outline logo)
2. In Windows Explorer, select all three files (`manifest.json`, `color.png`, `outline.png`).
3. Right-click the selected files, select **Send to**, and click **Compressed (zipped) folder**.
4. Name the new file `PromptVault_Teams.zip`.

### Step 6.3: Upload the Custom App to Teams
1. Open the **Microsoft Teams** application on your Windows laptop.
2. Click **Apps** at the bottom of the left sidebar.
3. Click **Manage your apps** (located at the bottom of the pane).
4. Click **Upload an app** -> **Upload a custom app**.
5. Select and upload your `PromptVault_Teams.zip` file.
6. The app will install! You can now access it as a personal tab or pin it to a team channel.
