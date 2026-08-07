# PromptVault - Step-by-Step Enterprise Setup Guide

This guide walks you through setting up and running **PromptVault** on a Windows corporate laptop. 

PromptVault is a prompt versioning tool that works **completely serverless**. All data is saved inside a shared corporate **OneDrive folder** as simple text files. Whenever a team member makes changes, OneDrive automatically syncs those files to the rest of the team in the background.

There are two ways to run this application:
1. **Option A: VS Code Extension** (Best for developers or anyone using VS Code. No setup needed, just install a single file).
2. **Option B: Microsoft Teams Web Tab** (Best for non-developers. Add it directly as a tab at the top of your Teams channel).

---

## Step 0: Set Up the Shared OneDrive Database Folder
Before running the application, one team member needs to create and share the folder where the prompt files will be stored.

1. Open **Windows File Explorer** (Press the `Windows Key` and `E` at the same time).
2. Look at the left sidebar and click on your corporate **OneDrive** folder (usually named `OneDrive - [Your Company Name]`).
3. Right-click in any empty space, hover over **New**, and select **Folder**.
4. Name this folder exactly: `PromptVault_Database`
5. Right-click the newly created `PromptVault_Database` folder and click **Share** (look for the blue cloud icon).
6. Type the email addresses of your team members who will use the tool.
7. **Crucial Step:** Click the permission settings and change it from "Can view" to **"Can edit"** (allow modifying files). If they do not have edit permissions, they cannot save prompt edits!
8. Click **Send**.
9. Once your teammates accept the invite, this folder will automatically show up and synchronize in their Windows File Explorer as well.

---

## Option A: VS Code Extension Setup (Highly Recommended)
This runs the entire PromptVault interface directly inside a VS Code sidebar tab. It requires no terminal commands, no backend servers, and no installations other than importing a single file.

### Step 1: Locate the Installer File
In the root directory of this repository, we have pre-built the installation package:
* File Name: `promptvault-1.0.0.vsix`
* This single file contains all the user interface code and the file-saver scripts.

### Step 2: Transfer the File to your Manager/Teammates
1. Send the `promptvault-1.0.0.vsix` file to your manager or teammates. You can email it, upload it to a OneDrive folder, or send it directly on Microsoft Teams.
2. They should download it to their local machine (e.g. to their `Downloads` folder).

### Step 3: Install the Extension in VS Code
Tell your manager or teammates to perform these steps inside VS Code:
1. Open **VS Code** on your Windows laptop.
2. Look at the vertical toolbar on the far left. Click the **Extensions** icon (it looks like four squares, or press `Ctrl+Shift+X`).
3. At the top of the Extensions panel that slide open, look in the top-right corner for the **`...`** (Views and More Actions) menu button. Click it.
4. From the dropdown menu, select **Install from VSIX...** at the very bottom.
5. A file explorer window will open. Navigate to the `promptvault-1.0.0.vsix` file you downloaded and select it.
6. Click **Install**.
7. In the bottom-right corner of VS Code, a popup will say "Successfully installed extension...". You will also see a new **PromptVault** icon (looks like a folder/box) in your far-left sidebar!

### Step 4: Configure the OneDrive folder path
1. Open VS Code Settings by pressing `Ctrl+,` (or go to `File -> Preferences -> Settings`).
2. In the top search bar, type: `PromptVault`
3. Look for the setting titled **PromptVault: Database Path**.
4. Paste the absolute path to your local shared OneDrive database folder here.
   * *Example Windows Path:* `C:\Users\YourUsername\OneDrive - Company Name\PromptVault_Database`
5. Close the settings tab.

### Step 5: Launch and Use
1. Click the **PromptVault** icon in your VS Code left sidebar.
2. The dashboard will load immediately.
3. Click the **Quick Access login buttons** (e.g., Alex or Jordan) or log in with your email.
4. You can now create namespaces, write prompt versions, run test cases, and write comments. Everything you save writes directly to the OneDrive folder and syncs automatically!

---

## Option B: Standalone Microsoft Teams Web Tab (No VS Code needed)
If you want to make this available to non-developers directly in Microsoft Teams, you can build and host the website.

### Step 1: Compile the Website
1. Open your command prompt in the `frontend` folder on your development machine.
2. Run:
   ```cmd
   npm run build
   ```
3. This creates a folder named `dist` containing the website bundle.

### Step 2: Host the Website Internally
1. Copy the files inside the `dist` folder and upload them to any company-approved static website hosting location (such as Azure Static Web Apps, an internal company intranet web server, or SharePoint).
2. Save your website URL (e.g., `https://promptvault.internal.company.com`).

### Step 3: Add to Microsoft Teams
1. Open **Microsoft Teams** on your Windows laptop.
2. Go to the team channel where your colleagues work.
3. At the top of the screen (next to Posts and Files), click the **`+` (Add a tab)** icon.
4. Select **Website** from the list of apps.
5. Configure the popup:
   - **Tab Name**: `PromptVault`
   - **URL**: Paste your hosted URL (Must be `https://` secure).
6. Click **Save**.

### Step 4: Connect the OneDrive folder (First Time Setup)
When your colleagues click the Teams tab for the first time:
1. A banner will say: **"Connect your database folder to get started"**.
2. Click the **Select OneDrive Folder** button.
3. A Windows file selection dialog will pop up. Instruct them to select the synced `PromptVault_Database` folder in their OneDrive.
4. Click **Allow/Grant Write Permissions** when prompted by the web browser.
5. They can now sign in and edit prompts. The browser will save changes directly to their local OneDrive folder, which syncs to the cloud!
