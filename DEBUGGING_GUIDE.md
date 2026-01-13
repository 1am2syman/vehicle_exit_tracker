# Debugging Guide - Submission Failure

## Problem Identified

The `WEB_APP_URL` in `index.html` (line 628) is set to the **Google Apps Script project editor URL**, not the **Web App deployment URL**.

### Current (Incorrect) URL:
```
https://script.google.com/u/0/home/projects/1NnwYjQrMwJ5y6AEoh37y_cSVNsrWv0_OEJeV647orzNzXVxKECwqMxkC/edit
```

### What it Should Be (Web App URL):
```
https://script.google.com/macros/s/ABC123XYZ.../exec
```

## How to Fix

### Step 1: Find Your Web App URL

1. Go to your Google Sheet
2. Click **Extensions** → **Apps Script**
3. Click **Deploy** → **Manage deployments**
4. You should see your deployment listed
5. Click on the deployment (the one with type "Web app")
6. **Copy the Web App URL** from the "Web app" section

The Web App URL will look like:
```
https://script.google.com/macros/s/ABC123XYZ456DEF789/exec
```

### Step 2: Update index.html

1. Open `index.html` in your code editor
2. Find line 628 (search for `WEB_APP_URL`)
3. Replace the entire URL with your actual Web App URL

**Before:**
```javascript
WEB_APP_URL: 'https://script.google.com/u/0/home/projects/1NnwYjQrMwJ5y6AEoh37y_cSVNsrWv0_OEJeV647orzNzXVxKECwqMxkC/edit',
```

**After:**
```javascript
WEB_APP_URL: 'https://script.google.com/macros/s/ABC123XYZ456DEF789/exec',
```

4. Save the file

### Step 3: Push to GitHub

```bash
git add index.html
git commit -m "Fix Web App URL configuration"
git push
```

Wait 1-2 minutes for GitHub Pages to redeploy.

### Step 4: Test Again

1. Open your GitHub Pages URL
2. Try submitting a test entry
3. Check your Google Sheet for the new row
4. Check your Google Drive folder for the uploaded photo

## Additional Issues to Check

### Issue 1: Google Apps Script Not Deployed as Web App

If you haven't deployed the script as a Web App yet:

1. In Apps Script editor, click **Deploy** → **New deployment**
2. Click the gear icon (⚙️) → **Web app**
3. Configure:
   - **Description**: "Vehicle Exit Tracker v1"
   - **Execute as**: "Me"
   - **Who has access**: "Anyone" (CRITICAL!)
4. Click **Deploy**
5. Authorize when prompted
6. Copy the Web App URL

### Issue 2: FOLDER_ID Not Configured

Check `Code.gs` line 3:

```javascript
FOLDER_ID: 'YOUR_DRIVE_FOLDER_ID', // Replace with actual folder ID
```

If this still says `YOUR_DRIVE_FOLDER_ID`:

1. Go to your Google Drive folder "Vehicle Exit Photos"
2. Look at the URL in your browser
3. Copy the folder ID (the long string after `/folders/`)
4. Update `Code.gs` with the actual folder ID
5. Redeploy the Web App

### Issue 3: Sheet Name Mismatch

Check `Code.gs` line 4:

```javascript
SHEET_NAME: 'Sheet1'
```

If your Google Sheet has a different tab name:
1. Open your Google Sheet
2. Check the tab name at the bottom
3. Update `SHEET_NAME` in `Code.gs` to match
4. Redeploy the Web App

## Testing the Web App Directly

You can test if the Web App is working by opening the Web App URL in your browser.

You should see:
```json
{
  "status": 200,
  "message": "Vehicle Exit Tracker API is running"
}
```

If you see an error, the Web App is not deployed correctly.

## Checking Google Apps Script Logs

1. Go to your Google Sheet
2. Click **Extensions** → **Apps Script**
3. Click **Executions** (left sidebar)
4. Look for recent executions
5. Click on any failed executions to see error details

Common errors:
- **"Exception: The script does not have permission"** - Need to re-authorize
- **"Exception: No item with the given ID was found"** - Wrong FOLDER_ID
- **"Exception: The sheet with the given name was not found"** - Wrong SHEET_NAME

## Browser Console Debugging

To see what's happening in the browser:

1. Open your webapp
2. Press F12 (or right-click → Inspect)
3. Go to the **Console** tab
4. Try submitting a form
5. Look for any error messages

Common browser errors:
- **"Failed to fetch"** - Wrong URL or CORS issue
- **"Network request failed"** - Network connectivity issue
- **"404 Not Found"** - Web App URL is incorrect

## Verifying Data Flow

### 1. Frontend Sends Data
Open browser console and look for:
```
Submission error: ...
```
If you see this, the fetch request is failing.

### 2. Web App Receives Data
Check Google Apps Script Executions log for:
- Successful executions should show status "Completed"
- Failed executions will show error details

### 3. Photo Uploads to Drive
Check your Google Drive folder "Vehicle Exit Photos":
- Photos should appear with names like `vehicle_[UUID].jpg`

### 4. Data Appends to Sheet
Check your Google Sheet:
- New rows should appear at the bottom
- Each row should have 8 columns of data

## Complete Configuration Checklist

- [ ] Web App deployed (not just script saved)
- [ ] Web App access set to "Anyone"
- [ ] Web App URL copied correctly (ends with `/exec`)
- [ ] FOLDER_ID replaced with actual folder ID
- [ ] SHEET_NAME matches Google Sheet tab name
- [ ] Google Sheet has 8 headers in row 1
- [ ] Google Drive folder is shared with "Anyone with the link"
- [ ] index.html WEB_APP_URL is correct
- [ ] Changes pushed to GitHub
- [ ] GitHub Pages has redeployed

## Still Not Working?

If you've checked everything above and it still doesn't work:

1. **Clear browser cache** and try again
2. **Try a different browser** (Chrome, Firefox, Safari)
3. **Check internet connection**
4. **Verify Google account permissions** - try redeploying the Web App
5. **Create a new deployment** - sometimes old deployments have issues

## Contact Support

If you need further assistance, provide:
1. The Web App URL (you can redact the middle part)
2. Screenshot of Google Apps Script Executions log
3. Screenshot of browser console errors
4. Screenshot of Google Sheet (showing headers and any data)
