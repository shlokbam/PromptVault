# PromptVault - Windows Corporate Setup Guide (Teams SSO & OneDrive)

This guide walks you through setting up **PromptVault** on your Windows corporate laptop. 

Since you already have **Node.js** installed, this guide focuses on cloning the GitHub repository, setting up the OneDrive shared database folder, configuring Microsoft Teams Single Sign-On (SSO) using Azure, and loading the app inside Teams.

---

## How It Works (The Simple Version)

Instead of using an expensive database server, PromptVault uses a shared folder in your corporate **OneDrive** to store prompts as simple `.json` text files. 

Microsoft OneDrive automatically synchronizes these files between your laptop, your teammates' laptops, and the cloud in the background. Teams SSO allows you and your team to login automatically using your work accounts.

```
[Your Windows Laptop] <---> [Local OneDrive Sync Folder] <---> [OneDrive Cloud] <---> [Teammate's Laptop]
```

---

## Phase 1: Clone the Repo & Run the Application on Windows

### Step 1.1: Clone the GitHub Repository
1. Open the **Command Prompt** or **PowerShell** on your Windows laptop:
   * Press the `Windows Key`, type **cmd** or **PowerShell**, and press **Enter**.
2. Navigate to the folder where you keep your coding projects (for example, `Documents` or a custom `Projects` folder):
   ```cmd
   cd C:\Users\YourUsername\Documents
   ```
3. Clone the repository from GitHub by running:
   ```cmd
   git clone https://github.com/your-organization/PromptVault.git
   ```
   *(Replace the URL above with your actual GitHub repository URL)*
4. Go into the folder that was just created:
   ```cmd
   cd PromptVault
   ```

### Step 1.2: Install and Run the Frontend Client
1. Navigate into the `frontend` folder:
   ```cmd
   cd frontend
   ```
2. Install the necessary project libraries (since Node.js is already installed, this will download everything needed):
   ```cmd
   npm install
   ```
3. Start the local server:
   ```cmd
   npm run dev
   ```
4. Look at the terminal output. It will show a local address like:
   `http://localhost:5173/`
5. Keep this terminal window open. If you close it, the application will stop running.

---

## Phase 2: Create the Synced OneDrive Database Folder

### Step 2.1: Create the Folder on Windows
1. Open **Windows File Explorer** (Press `Windows Key + E`).
2. Click on your corporate **OneDrive** folder in the left sidebar (usually named `OneDrive - [Your Company Name]`).
3. Right-click in the empty space, select **New**, and click **Folder**.
4. Name the new folder: `PromptVault_Database`

### Step 2.2: Share it with your Teammates
1. Right-click the newly created `PromptVault_Database` folder.
2. Select **Share** (look for the blue cloud icon next to it).
3. Enter the corporate email addresses of your team members.
4. **Important Permission Check:** Ensure the permission is set to **"Can edit"** (allow modifying files) so they can save prompt changes.
5. Click **Send**.
6. When your teammates accept the link, OneDrive will automatically sync this folder to their Windows File Explorer too.

### Step 2.3: Connect PromptVault to the OneDrive Folder
1. Open Google Chrome or Microsoft Edge and go to `http://localhost:5173`.
2. Click the **"Select OneDrive Folder"** button on the screen.
3. A Windows file selection dialog will pop up. Navigate to your corporate `OneDrive` directory and select the `PromptVault_Database` folder.
4. Click **Select Folder** (or **Upload** if prompted by the browser for directory access).
5. Accept the browser warning by clicking **Allow/View files**.
6. The app will immediately create 3 database files inside that folder:
   - `agents.json` (Stores agent groups)
   - `prompts.json` (Stores prompt versions, comments, and tests)
   - `activity.json` (Stores history logs)

---

## Phase 3: Set Up Microsoft Teams SSO (Azure Portal)

To enable automatic sign-in inside Teams without typing passwords, you must register the app in your organization's Microsoft Entra ID (Azure AD) portal.

### Step 3.1: Register the Application
1. Log in to the [Azure Portal](https://portal.azure.com) using your corporate work email.
2. In the top search bar, type **Microsoft Entra ID** and click it.
3. In the left-hand menu, click **App registrations** and then click **New registration**.
4. Configure the settings:
   - **Name**: `PromptVault-SSO`
   - **Supported account types**: Select **Accounts in this organizational directory only (Single tenant)**.
   - **Redirect URI**: Select **Single-page application (SPA)** from the dropdown and type: `http://localhost:5173`
5. Click **Register** at the bottom.
6. Copy the **Application (client) ID** from the overview screen and save it in Notepad.

### Step 3.2: Configure the API Identity
1. In the App registration sidebar menu, click **Expose an API**.
2. Next to *Application ID URI*, click **Set**.
3. It will auto-fill as `api://[GUID]`. Edit this to match your URL structure:
   `api://localhost:5173/[Application-Client-ID-Here]`
4. Click **Save**.

### Step 3.3: Define SSO Permissions (Scopes)
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

### Step 3.4: Authorize Microsoft Teams Clients
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

## Phase 4: Configure Teams SSO in Code

Now, configure the frontend to talk to Teams and fetch your profile details automatically.

### Step 4.1: Install the Teams SDK
1. In your Windows Command Prompt or PowerShell, make sure you are in the `frontend` folder.
2. Install the official Microsoft Teams SDK:
   ```cmd
   npm install @microsoft/teams-js
   ```

### Step 4.2: Load SSO Token in Login Page
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
> Replace `YOUR-AZURE-CLIENT-ID-HERE` in the code above with the **Application (client) ID** you copied from the Azure Portal in Step 3.1.

Add this status message to your login form UI (e.g., right above the Email Address input field):
```typescript
{inTeams && (
  <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl mb-4 text-center">
    <p className="text-xs text-zinc-400 font-medium">{ssoStatus}</p>
  </div>
)}
```

---

## Phase 5: Create and Load the Teams App Manifest

To add PromptVault as a tab inside Microsoft Teams on Windows:

### Step 5.1: Create the `manifest.json` File
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
> Make sure to replace `YOUR-AZURE-CLIENT-ID-HERE` with the App ID from Step 3.1.

### Step 5.2: Add Icons and Package the Manifest
1. Place two PNG files in the same folder as `manifest.json`:
   - `color.png` (96x96 pixels, transparent colored logo)
   - `outline.png` (32x32 pixels, transparent white outline logo)
2. In Windows Explorer, select all three files (`manifest.json`, `color.png`, `outline.png`).
3. Right-click the selected files, select **Send to**, and click **Compressed (zipped) folder**.
4. Name the new file `PromptVault_Teams.zip`.

### Step 5.3: Upload the Custom App to Teams
1. Open the **Microsoft Teams** application on your Windows laptop.
2. Click **Apps** at the bottom of the left sidebar.
3. Click **Manage your apps** (located at the bottom of the pane).
4. Click **Upload an app** -> **Upload a custom app**.
5. Select and upload your `PromptVault_Teams.zip` file.
6. The app will install! You can now access it as a personal tab or pin it to a team channel.

---

## Phase 6: Verifying Setup

Follow these checks to make sure everything is running:

1. **Start the local server**: Ensure `npm run dev` is running in your Windows Command Prompt.
2. **Open the app in Teams**: Open Microsoft Teams, navigate to the custom tab, and verify that the page loads.
3. **Verify SSO**: The login screen should display "Logging you in via Teams SSO..." and redirect to the dashboard automatically.
4. **Folder Sync Check**: Click Settings, change your profile name, and check if the OneDrive directory sync is still valid. Save a prompt and verify the change synchronizes instantly across team folders.
