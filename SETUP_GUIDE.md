# AI-Powered Vehicle Exit Tracker - Setup Guide

## Overview

This guide will help you set up the AI-powered vehicle exit tracker system with all necessary configurations.

## Prerequisites

Before starting, ensure you have:
- A Google account with access to Google Drive and Google Sheets
- An OpenRouter account with API access (https://openrouter.ai)
- Basic understanding of Google Apps Script editor

## Step-by-Step Setup

### Step 1: Google Sheets Setup

1. **Create a new Google Sheet**
   - Go to [sheets.google.com](https://sheets.google.com)
   - Click "Blank" to create a new spreadsheet
   - Name it "Vehicle Exit Tracker - AI Powered"

2. **Open Apps Script Editor**
   - In the Google Sheet, go to `Extensions` > `Apps Script`
   - Delete any existing code in `Code.gs`
   - Copy and paste the entire content from [`Code.gs`](Code.gs)

3. **Run setupColumns function**
   - In the Apps Script editor, select `setupColumns` from the function dropdown
   - Click the **Run** button
   - Grant permissions when prompted (this is required for the script to access your spreadsheet)
   - **Result**: The sheet will now have 15 properly formatted columns with headers, conditional formatting, and styling

### Step 2: Google Drive Folder Setup

1. **Create a folder for photos**
   - Go to [drive.google.com](https://drive.google.com)
   - Create a new folder named "Vehicle Exit Photos - AI"
   - Set sharing permissions to "Anyone with the link can view"
   - Copy the folder ID from the URL (the part between `/folders/` and the next `/`)

2. **Run setupImageFolder function**
   - Back in the Apps Script editor, select `setupImageFolder` from the function dropdown
   - Click the **Run** button
   - A dialog will appear asking for the folder ID
   - Paste your Google Drive folder ID
   - Click **OK**
   - **Result**: The folder ID is now saved and will be used for all photo uploads

### Step 3: OpenRouter API Setup

1. **Get your OpenRouter API key**
   - Go to [openrouter.ai](https://openrouter.ai)
   - Sign up or log in
   - Navigate to API Keys section
   - Create a new API key
   - Copy the API key (keep it secure!)

2. **Run setupAPI function**
   - In the Apps Script editor, select `setupAPI` from the function dropdown
   - Click the **Run** button
   - A dialog will appear asking for the API key
   - Paste your OpenRouter API key
   - Click **OK**
   - **Result**: The API key is now saved and will be used for all AI processing

### Step 4: Deploy as Web App

1. **Deploy the script**
   - In the Apps Script editor, click **Deploy** > **New deployment**
   - Click the gear icon (⚙️) and select "Web app"
   - Configure deployment settings:
     - **Description**: "Vehicle Exit Tracker AI v1"
     - **Execute as**: "Me" (your email)
     - **Who has access**: "Anyone"
   - Click **Deploy**
   - Copy the **Web App URL** from the deployment confirmation

2. **Update frontend configuration**
   - Open [`index.html`](index.html) in your code editor
   - Find line 784: `WEB_APP_URL: 'YOUR_WEB_APP_URL_HERE'`
   - Replace `'YOUR_WEB_APP_URL_HERE'` with your deployed Web App URL
   - Save the file

### Step 5: Deploy Frontend

Choose one of the following hosting options:

#### Option A: GitHub Pages (Free)
1. Create a GitHub repository
2. Push [`index.html`](index.html) and the `assets/` folder
3. Go to repository **Settings** > **Pages**
4. Enable GitHub Pages from the main branch
5. Your site will be available at `https://yourusername.github.io/repository-name`

#### Option B: Netlify (Free)
1. Go to [netlify.com](https://netlify.com) and sign up
2. Drag and drop your project folder (containing [`index.html`](index.html) and `assets/`)
3. Your site will be deployed instantly with a random URL
4. You can customize the domain in Netlify settings

#### Option C: Vercel (Free)
1. Go to [vercel.com](https://vercel.com) and sign up
2. Import your Git repository or drag and drop files
3. Follow the deployment wizard
4. Your site will be deployed with a `.vercel.app` domain

## Testing the System

### Test Complete Flow

1. **Open the deployed frontend** in your browser (preferably on mobile)
2. **Step 1**: Tap the camera icon and capture a vehicle number plate photo
3. **Step 2**: Tap the camera icon and capture one or more invoice photos
4. **Step 3**: Wait for AI processing (3-5 seconds)
5. **Review**: Check the extracted vehicle number and invoice numbers with confidence scores
6. **Submit**: Click "Submit Entry"
7. **Verify**: Check your Google Sheet for the new entry

### Verify Data in Google Sheet

Your Google Sheet should show:
- All 15 columns populated with data
- Confidence scores color-coded (green/yellow/red)
- Validation status properly formatted
- Photo URLs pointing to your Google Drive folder

## Configuration Management

### View Current Configuration

To see what's currently configured, add this function to [`Code.gs`](Code.gs):

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

Run `viewConfiguration` and check the execution log.

### Update Configuration

To update any configuration:
- Run `setupAPI(apiKey)` to change the OpenRouter API key
- Run `setupImageFolder(folderId)` to change the Drive folder

## Troubleshooting

### Common Issues

**Issue**: "Missing required photos" error
- **Solution**: Ensure you capture both number plate and at least one invoice photo

**Issue**: AI processing fails
- **Solution**: Check your OpenRouter API key is valid and has credits

**Issue**: Photos not uploading to Drive
- **Solution**: Verify folder ID is correct and folder has "Anyone with link can view" permission

**Issue**: Sheet columns not formatted
- **Solution**: Run `setupColumns()` again to reapply formatting

**Issue**: Web app returns 404
- **Solution**: Ensure the web app is deployed as "Anyone" access

### View Execution Logs

1. In Apps Script editor, click **Executions** on the left sidebar
2. Click on any execution to see detailed logs
3. Check for error messages in the console output

## Security Best Practices

1. **Never expose API keys** in frontend code
2. **Use script properties** to store sensitive data
3. **Rotate API keys** periodically
4. **Monitor usage** in OpenRouter dashboard
5. **Set folder permissions** to "Anyone with link can view" (not edit)

## Cost Monitoring

### OpenRouter Costs

- Check your OpenRouter dashboard regularly
- Monitor token usage and costs
- Set up usage alerts if available

### Google Services

- Google Drive: Free tier (15GB storage)
- Google Sheets: Free tier
- Google Apps Script: Free tier (1,000 executions/day)

## Support

If you encounter issues:
1. Check the execution logs in Apps Script
2. Review the error messages in the frontend
3. Verify all configuration steps are complete
4. Test with a simple photo to isolate issues

## Next Steps

After successful setup:
1. Test the system thoroughly
2. Train factory workers on how to use it
3. Monitor the first few submissions
4. Adjust confidence thresholds if needed (in [`CONFIG.MIN_CONFIDENCE_SCORE`](Code.gs:8))
5. Consider implementing the future enhancements mentioned in the plan

---

**Congratulations!** Your AI-powered vehicle exit tracker is now ready for use.
