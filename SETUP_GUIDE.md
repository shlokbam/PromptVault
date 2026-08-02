# PromptVault - Windows Corporate Setup Guide (Teams Tab & OneDrive)

This guide walks you through setting up **PromptVault** on your Windows corporate laptop.

---

## ⚠️ How the OneDrive Database Sync Works
Since you configured the backend's `DATABASE_URL` to point to a file inside your synced corporate OneDrive folder:
1. When you run your backend and save a prompt, it writes directly to the local SQLite database file `promptvault.db` in your OneDrive.
2. Microsoft OneDrive automatically syncs `promptvault.db` to the cloud in the background.
3. Once the file is uploaded, OneDrive downloads it to your team member's synced folder.
4. When they start their backend, they will instantly see your updates.

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

## Phase 3: Run the Frontend Server on Windows (HTTPS)

Microsoft Teams requires all custom tabs to use **HTTPS**. The frontend has been configured to run on `https://localhost:5173` using a local self-signed SSL certificate.

### Step 3.1: Open a Second Terminal Window
1. Open a **new, separate** PowerShell or Command Prompt window (leave the backend window running).
2. Navigate to the frontend directory:
   ```powershell
   cd C:\Users\YourUsername\Documents\PromptVault\frontend
   ```

### Step 3.2: Install and Start Frontend
1. Install client libraries (this installs `@vitejs/plugin-basic-ssl` to handle HTTPS):
   ```powershell
   npm install
   ```
2. Run the developer web server:
   ```powershell
   npm run dev
   ```
3. Open your web browser (Chrome or Edge) and go to:
   `https://localhost:5173`
   
   > [!IMPORTANT]
   > The browser will show a warning saying **"Your connection is not private"** or **"Security Certificate Warning"** because the local SSL certificate is self-signed.
   > * Click **Advanced** (or **Show Details**).
   > * Click **Proceed to localhost (unsafe)** or **Trust/Accept Certificate**.
   > * You only need to do this once. If you do not do this step, Microsoft Teams will show a blank white screen when trying to load the tab.

4. The login screen will appear. You can now log in using the pre-seeded prototype accounts:
    * **Manager / Lead Account**: `admin@promptvault.com` with password `ManagerPass123!`
    * **Member Account**: `member@promptvault.com` with password `MemberPass123!`

---

## Phase 4: Embedding in Microsoft Teams (Without Azure SSO)

1. Open **Microsoft Teams** on your Windows laptop.
2. Navigate to the team channel where you want to add the tab.
3. Click the **`+` (Add a tab)** icon at the top of the channel screen.
4. Select **Website** from the list of available apps.
5. Configure the settings:
   - **Tab Name**: `PromptVault`
   - **URL**: `https://localhost:5173`
6. Click **Save**.
7. PromptVault will load directly inside your Teams channel! You can sign in using your credentials and collaborate in real-time.

---

## Instructions for Teammates to Join

If another person wants to join this shared workspace, they need to follow these steps:

1. **Accept OneDrive Access**: Accept the folder sharing link you sent them so that `PromptVault_Database` syncs to their computer.
2. **Download Code**: Clone the same repository on their Windows laptop.
3. **Run Backend**:
   - Navigate to the `backend` folder.
   - Run `python -m venv venv`.
   - Run `.\venv\Scripts\Activate.ps1`.
   - Run `pip install -r requirements.txt`.
   - Start uvicorn, pointing `DATABASE_URL` to **their own local OneDrive sync path**:
     ```powershell
     $env:DATABASE_URL="sqlite:///C:/Users/TheirUsername/OneDrive - Your Company Name/PromptVault_Database/promptvault.db"
     python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
     ```
4. **Run Frontend**:
   - Navigate to `frontend`.
   - Run `npm install` and `npm run dev`.
   - Open `https://localhost:5173` in their web browser and click **Advanced -> Proceed** (to approve the local certificate).
   - Add the Website Tab inside Teams using `https://localhost:5173`.
5. They can log in using their credentials and see all the shared prompts!
