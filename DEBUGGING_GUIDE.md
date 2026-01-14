# Debugging Guide - AI-Powered Vehicle Exit Tracker

## Current Issue

**Symptoms:**
- Frontend shows "AI is extracting data..." indefinitely
- No data appears in Google Sheet
- No images uploaded to Google Drive
- No API calls visible in OpenRouter activity
- Web App URL is correct
- Folder ID is correct
- API key is configured

## Most Likely Causes

Based on the symptoms, here are the most probable causes (in order of likelihood):

### 1. **Web App Not Redeployed** (Most Likely - 90%)
- You updated [`Code.gs`](Code.gs) but didn't redeploy the Web App
- The old version is still running without the new code
- **Solution**: Redeploy the Web App after updating [`Code.gs`](Code.gs)

### 2. **Frontend Fetch Hanging** (Likely - 70%)
- The `fetch()` call is timing out or not completing
- Browser is waiting indefinitely for response
- **Solution**: Check browser console logs to see where it stops

### 3. **CORS Issue** (Likely - 60%)
- `mode: 'no-cors'` prevents reading response
- Request might be blocked by CORS policies
- **Solution**: Backend needs proper CORS headers

### 4. **Configuration Not Loading** (Likely - 50%)
- [`loadConfiguration()`](Code.gs:231) not finding saved properties
- CONFIG values remain empty at runtime
- **Solution**: Run setup functions again to verify configuration saved

### 5. **API Key Invalid** (Likely - 30%)
- API key is malformed or expired
- OpenRouter rejecting requests
- **Solution**: Verify API key in OpenRouter dashboard

## Diagnostic Steps

### Step 1: Check Browser Console Logs

1. Open your deployed frontend in browser
2. Press F12 to open Developer Tools
3. Go to "Console" tab
4. Click "Submit Entry" button
5. **Look for these logs:**
   ```
   === processWithAI STARTED ===
   Plate photo: PRESENT/MISSING
   Invoice photos count: X
   Web App URL: https://...
   Submission data prepared: {...}
   Sending fetch request to: https://...
   Fetch completed in: XXXms
   Fetch response status: 200 (or other)
   Fetch response ok: true/false
   === processWithAI COMPLETED ===
   ```
6. **Note where it stops** - This will tell us exactly where the issue is

### Step 2: Check Apps Script Execution Logs

1. Go to Google Sheet
2. Click "Extensions" > "Apps Script"
3. Click "Executions" on left sidebar
4. Click on the most recent execution (top of list)
5. **Look for these logs:**
   ```
   === doPost STARTED ===
   Configuration loaded:
    FOLDER_ID: SET/NOT SET
    API_KEY: SET/NOT SET
   Request received at: YYYY-MM-DDTHH:MM:SS.sssZ
   Parsed request data:
    platePhotoBase64: PRESENT (...) / MISSING
    invoicePhotosBase64: X photos / MISSING
    submissionId: xxx-xxx-xxx-xxxx
    location: ...
    deviceInfo: ...
   Validation passed, starting AI processing...
   Calling processPhotosWithAI...
   === processPhotosWithAI STARTED ===
   Plate photo size: XXXXX characters
   Invoice photos count: X
   Calling extractVehicleNumber...
   Vehicle extraction result: {...}
   Calling extractInvoiceNumbers...
   Invoice extraction result: {...}
   processPhotosWithAI completed successfully
   Validation result: Success/Partial/Fail
   Starting Drive uploads...
   Uploading plate photo...
   Plate photo URL: https://...
   Uploading X invoice photos...
   Invoice photo 0 URL: https://...
   ...
   Invoice photo X-1 URL: https://...
   Appending to sheet...
   Data appended to sheet successfully
   === doPost COMPLETED ===
   ```
6. **Note any errors** - Look for "ERROR in" messages

### Step 3: Verify Configuration

1. In Apps Script editor, run this function:
   ```javascript
   function viewConfiguration() {
     const properties = PropertiesService.getScriptProperties();
     const config = {
       'Folder ID': properties.getProperty('FOLDER_ID') || 'Not set',
       'API Key': properties.getProperty('OPENROUTER_API_KEY') ? 'Set (hidden)' : 'Not set'
     };
     
     Logger.log(JSON.stringify(config, null, 2));
     return JSON.stringify(config, null, 2);
   }
   ```
2. Click "Run" and select `viewConfiguration`
3. Check the execution log
4. **Both should show "SET" if configuration is correct**

### Step 4: Test API Key Manually

1. Go to https://openrouter.ai/keys
2. Verify your API key is active and has credits
3. Check if key starts with `sk-or-` or similar prefix
4. Note the exact key format

### Step 5: Test Web App URL Directly

1. Copy your Web App URL
2. Paste it in browser address bar
3. You should see: `{"status":200,"message":"AI-Powered Vehicle Exit Tracker API is running"}`
4. If you see this, the Web App is accessible

## Common Issues & Solutions

### Issue: "FOLDER_ID is NOT SET" in logs

**Cause**: Configuration not loaded from script properties

**Solutions**:
1. Run [`setupImageFolder()`](Code.gs:177) again
2. Verify folder ID is correct
3. Check Apps Script permissions (it needs Drive access)

### Issue: "API_KEY is NOT SET" in logs

**Cause**: Configuration not loaded from script properties

**Solutions**:
1. Run [`setupAPI()`](Code.gs:136) again
2. Verify API key is correct
3. Check key format (should start with `sk-` or similar)

### Issue: Request hangs at "Sending fetch request"

**Cause**: Network issue or CORS problem

**Solutions**:
1. Check if Web App URL is correct
2. Try accessing from different network
3. Check browser network tab for failed requests
4. Verify no browser extensions blocking requests

### Issue: No logs in Apps Script Executions

**Cause**: Web App not being called

**Solutions**:
1. **Redeploy Web App** (Most Important!)
   - Go to Extensions > Apps Script
   - Click "Deploy" > "Manage deployments"
   - Click "Edit" on your deployment
   - Make changes if needed
   - Click "Deploy" again
   - **Copy new Web App URL**
   - **Update [`WEB_APP_URL`](index.html:784) in [`index.html`](index.html)

2. Check deployment settings:
   - Execute as: "Me"
   - Who has access: "Anyone"

## Quick Fixes

### Fix 1: Redeploy Web App (Try First)

1. Open Google Sheet
2. Extensions > Apps Script
3. Deploy > New deployment
4. Description: "Vehicle Exit Tracker AI v1.1"
5. Execute as: "Me"
6. Who has access: "Anyone"
7. Click "Deploy"
8. **Copy the new Web App URL**
9. Update line 784 in [`index.html`](index.html): `WEB_APP_URL: 'YOUR_WEB_APP_URL_HERE'`
10. Replace with your new URL

### Fix 2: Verify Configuration

1. In Apps Script editor, run [`setupAPI()`](Code.gs:136)
2. Enter your API key
3. Run [`setupImageFolder()`](Code.gs:177)
4. Enter your folder ID
5. Run [`viewConfiguration()`](Code.gs:231) to verify both are set

### Fix 3: Check CORS

If you see CORS errors in browser console:

1. Add this to [`doGet()`](Code.gs:580) in [`Code.gs`](Code.gs):
   ```javascript
   function doGet(e) {
     return ContentService
       .createTextOutput(JSON.stringify({
         status: 200,
         message: 'AI-Powered Vehicle Exit Tracker API is running'
       }))
       .setMimeType(ContentService.MimeType.JSON)
       .setHeader('Access-Control-Allow-Origin', '*')
       .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
   }
   ```

### Fix 4: Test with Simple Request

Test if Web App is working by sending a simple request:

```bash
curl -X POST https://your-web-app-url/exec \
  -H "Content-Type: application/json" \
  -d '{"platePhotoBase64":"test","invoicePhotosBase64":["test"],"submissionId":"test-123"}'
```

You should see a response or check Apps Script Executions for the request.

## What to Report Back

After following the diagnostic steps, please report:

1. **Browser Console Logs** - What do you see when clicking Submit?
2. **Apps Script Execution Logs** - What does the latest execution show?
3. **Where does it stop** - Which log appears last before stopping?
4. **Any error messages** - Any "ERROR in" messages?
5. **Configuration status** - Do logs show "SET" or "NOT SET"?

This will help identify the exact issue and provide the right fix.
