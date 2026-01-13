# GitHub Deployment Guide

Follow these steps to deploy your Vehicle Exit Tracker to GitHub Pages.

## Prerequisites

- A GitHub account (free at [github.com](https://github.com))
- Git installed on your computer (already done)
- Your local repository is initialized and committed (already done)

## Step 1: Create GitHub Repository

1. Go to [github.com](https://github.com) and log in
2. Click the **+** icon in the top-right corner
3. Select **New repository**
4. Fill in the repository details:
   - **Repository name**: `vehicle-exit-tracker` (or your preferred name)
   - **Description**: Mobile-first webapp for tracking factory vehicle exits
   - **Public/Private**: Choose **Public** (required for GitHub Pages free tier)
5. **DO NOT** check any of the following:
   - ❌ Add a README file
   - ❌ Add .gitignore
   - ❌ Choose a license
6. Click **Create repository**

## Step 2: Connect Local Repository to GitHub

After creating the repository, GitHub will show you a page with instructions. Look for the section **"…or push an existing repository from the command line"**.

Open your terminal/command prompt in the project directory (`c:/Users/USER/vehicle_exit_tracker`) and run the following commands:

```bash
git remote add origin https://github.com/YOUR_USERNAME/vehicle-exit-tracker.git
git branch -M main
git push -u origin main
```

**Important**: Replace `YOUR_USERNAME` with your actual GitHub username.

For example, if your username is `johndoe`, the command would be:
```bash
git remote add origin https://github.com/johndoe/vehicle-exit-tracker.git
git branch -M main
git push -u origin main
```

### If you encounter authentication issues:

GitHub now requires personal access tokens for password authentication:

1. Go to GitHub **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. Click **Generate new token (classic)**
3. Give it a name like "Vehicle Exit Tracker"
4. Select scopes: **repo** (required for pushing code)
5. Click **Generate token**
6. **Copy the token** (you won't see it again)
7. When prompted for a password, paste the token instead

## Step 3: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** tab (top of the page)
3. In the left sidebar, click **Pages**
4. Under **Build and deployment** → **Source**, select **Deploy from a branch**
5. Under **Branch**, select **main** and **/ (root)**
6. Click **Save**

Your site will be deployed at: `https://YOUR_USERNAME.github.io/vehicle-exit-tracker/`

**Note**: It may take 1-2 minutes for the site to be available.

## Step 4: Verify Deployment

1. Wait 1-2 minutes
2. Go to the URL: `https://YOUR_USERNAME.github.io/vehicle-exit-tracker/`
3. You should see the Vehicle Exit Tracker interface

## Step 5: Configure Google Apps Script (Required)

Before the app can work, you need to set up the backend:

### 5.1 Create Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com)
2. Create a new spreadsheet named "Vehicle Exit Tracker"
3. In the first row, create these headers (A1 through H1):
   - A1: `Timestamp`
   - B1: `Photo URL`
   - C1: `Vehicle Number`
   - D1: `Invoice Numbers`
   - E1: `Location`
   - F1: `Device Info`
   - G1: `Capture Time`
   - H1: `Submission ID`

4. Format the sheet:
   - Select row 1 and make it bold
   - Go to **View** → **Freeze** → **1 row**
   - Select columns C and D, go to **Format** → **Text wrapping** → **Wrap**

### 5.2 Create Google Drive Folder

1. Go to [drive.google.com](https://drive.google.com)
2. Click **New** → **Folder**
3. Name it "Vehicle Exit Photos"
4. Open the folder and look at the URL
5. Copy the folder ID from the URL (the long string after `/folders/`)
   - Example: `https://drive.google.com/drive/folders/1ABCxyz123...`
   - Folder ID: `1ABCxyz123...`
6. Right-click the folder → **Share**
7. Change to "Anyone with the link"
8. Click **Done**

### 5.3 Deploy Google Apps Script

1. In your Google Sheet, go to **Extensions** → **Apps Script**
2. Delete any existing code
3. Copy the contents of [`Code.gs`](Code.gs) from your local project
4. Paste it into the Apps Script editor
5. **IMPORTANT**: Replace `YOUR_DRIVE_FOLDER_ID` with your actual folder ID from step 5.2
6. Click **Deploy** → **New deployment**
7. Click the gear icon (⚙️) → **Web app**
8. Configure:
   - **Description**: "Vehicle Exit Tracker v1"
   - **Execute as**: "Me"
   - **Who has access**: "Anyone"
9. Click **Deploy**
10. Authorize the script when prompted (grant permissions for Drive and Sheets)
11. **Copy the Web App URL** (starts with `https://script.google.com/macros/s/`)

### 5.4 Update Frontend Configuration

1. Open your local [`index.html`](index.html) file
2. Find the CONFIG object in the JavaScript section (around line 425)
3. Replace `YOUR_WEB_APP_URL_HERE` with your actual Web App URL from step 5.3
4. Save the file

### 5.5 Push Updated Configuration to GitHub

```bash
git add index.html
git commit -m "Configure Google Apps Script URL"
git push
```

The site will automatically redeploy on GitHub Pages (takes 1-2 minutes).

## Step 6: Test the Application

1. Wait 1-2 minutes for GitHub Pages to redeploy
2. Open your GitHub Pages URL on a mobile device
3. Tap the camera icon to capture a photo
4. Fill in vehicle number and invoice numbers
5. Tap "Submit Entry"
6. Check your Google Sheet for the new entry

## Troubleshooting

### Git push fails with "remote: Permission denied"

- You need to use a personal access token instead of your password
- Follow the authentication steps in Step 2

### GitHub Pages shows 404 error

- Wait 1-2 minutes after enabling Pages
- Check that you selected the correct branch (main)
- Ensure your repository is public (required for free GitHub Pages)

### Camera doesn't open on mobile

- Ensure you're using HTTPS (GitHub Pages provides this automatically)
- Check browser permissions for camera access

### Form submission fails

- Verify the Web App URL is correct in index.html
- Check that Google Apps Script is deployed with "Anyone" access
- Check browser console for error messages

### Photos not appearing in Google Drive

- Verify FOLDER_ID in Code.gs is correct
- Check that the folder is shared with "Anyone with the link"
- Check Google Apps Script execution logs

## Next Steps

Your application is now live! Share the GitHub Pages URL with your team members.

**Important**: Keep your Google Apps Script Web App URL and Google Drive folder ID secure. They are your backend credentials.

## Updating the Application

To make changes:

1. Edit files locally
2. Commit changes: `git add . && git commit -m "Your message"`
3. Push to GitHub: `git push`
4. GitHub Pages will automatically redeploy (1-2 minutes)

## Additional Resources

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Google Apps Script Documentation](https://developers.google.com/apps-script)
- [Google Sheets API](https://developers.google.com/sheets/api)
