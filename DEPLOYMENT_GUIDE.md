# Deployment Guide - Vehicle Exit Tracker with OCR

Complete guide to deploy the AI-powered vehicle exit tracking system with automatic OCR data extraction.

## Prerequisites

### Required Accounts & Services

1. **Google Account** (free)
   - Google Sheets
   - Google Drive
   - Google Apps Script

2. **OpenRouter Account** (free tier available)
   - API key for Gemini 2.5 Flash model
   - Sign up at: https://openrouter.ai/

### Technical Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Smartphone or tablet with camera
- Stable internet connection

## Step-by-Step Deployment

### Step 1: Create Google Sheets

1. Go to [Google Sheets](https://sheets.google.com)
2. Click "Blank spreadsheet"
3. Name it "Vehicle Exit Tracker"
4. The following sheets will be created automatically:
   - `Sheet1` - Main data storage
   - `ManualReview` - Failed OCR attempts
   - `ErrorLog` - System errors

### Step 2: Setup Google Apps Script

1. In Google Sheets, go to **Extensions** → **Apps Script**
2. Delete any existing code
3. Copy the entire contents of [`Code.gs`](Code.gs)
4. Paste into the Apps Script editor
5. Save the project (Ctrl+S or Cmd+S)

### Step 3: Configure API Key

1. In the Apps Script editor, find the function `setAPIKey()`
2. Click **Run** button
3. Enter your OpenRouter API key when prompted
4. The key is securely stored in script properties
5. Verify success message appears

**Important**: Never hardcode your API key in the source code. Always use the `setAPIKey()` function.

### Step 4: Initialize Sheets

1. In Apps Script editor, find the function `setup()`
2. Click **Run** button
3. Grant permissions when prompted:
   - View and manage spreadsheets
   - Create and edit files in Google Drive
4. Wait for "Setup complete" message
5. This creates the ManualReview and ErrorLog sheets

### Step 5: Deploy as Web App

1. Click **Deploy** → **New deployment**
2. Select deployment type: **Web app**
3. Configure deployment settings:
   - **Description**: Vehicle Exit Tracker with OCR
   - **Execute as**: Me
   - **Who has access**: Anyone
4. Click **Deploy**
5. Copy the **Web App URL** (starts with `https://script.google.com/...`)
6. Save this URL - you'll need it for the client

### Step 6: Update Client Configuration

1. Open [`index.html`](index.html)
2. Find the `CONFIG` object (around line 683)
3. Replace the `WEB_APP_URL` value with your deployment URL:

```javascript
const CONFIG = {
    WEB_APP_URL: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec',
    // ... other config
};
```

4. Save the file

### Step 7: Test the Deployment

1. Open [`index.html`](index.html) in a web browser
2. Test vehicle plate capture:
   - Click camera icon
   - Take photo
   - Verify preview appears
3. Test invoice photo capture:
   - Click "Add Invoice Photo"
   - Take photo
   - Verify it appears in list
4. Test OCR processing:
   - Click "Submit Entry"
   - Wait for OCR processing
   - Review extracted data
5. Test manual override:
   - Click "Edit Manually"
   - Enter data manually
   - Submit

## Deployment Checklist

Use this checklist to ensure successful deployment:

- [ ] Google Sheets created
- [ ] Apps Script code copied and saved
- [ ] OpenRouter API key configured via `setAPIKey()`
- [ ] `setup()` function run successfully
- [ ] Web app deployed with "Anyone" access
- [ ] Web App URL copied
- [ ] Client `WEB_APP_URL` updated
- [ ] Vehicle plate capture tested
- [ ] Invoice photo capture tested
- [ ] OCR processing tested
- [ ] Manual override tested
- [ ] Data appears in Google Sheets

## Folder Structure Setup

### Google Drive Folder

The system requires a Google Drive folder to store photos:

1. Create a folder in Google Drive named "Vehicle Exit Photos"
2. Right-click the folder → **Share**
3. Set permissions to **Anyone with the link can view**
4. Copy the **Folder ID** from the URL:
   - URL format: `https://drive.google.com/drive/folders/FOLDER_ID`
   - Copy the alphanumeric ID after `/folders/`
5. In [`Code.gs`](Code.gs), update the `FOLDER_ID` constant:

```javascript
const CONFIG = {
  FOLDER_ID: 'YOUR_FOLDER_ID_HERE',
  SHEET_NAME: 'Sheet1',
  // ...
};
```

6. Redeploy the web app after changing the folder ID

## Testing the OCR System

### Test Scenarios

#### 1. Successful OCR Extraction

**Test**: Capture clear photos of vehicle plate and invoice

**Expected Result**:
- OCR processes successfully
- Confidence score ≥ 90%
- Data appears in Sheet1
- Success message displayed

**Verify**:
- Vehicle plate format is correct (e.g., Dhaka Metro-14-5678)
- Invoice format is correct (e.g., INV-DBBA/0325/3219)
- Confidence score is shown in green

#### 2. Low Confidence OCR

**Test**: Capture blurry or poorly lit photos

**Expected Result**:
- OCR processes but confidence < 90%
- Manual override modal appears
- Data saved to ManualReview sheet

**Verify**:
- Manual modal shows captured photo
- OCR results are pre-filled
- Can edit and submit manually

#### 3. Multiple Invoices

**Test**: Capture 2-3 invoice photos

**Expected Result**:
- All invoices processed
- Multiple invoice numbers extracted
- All numbers appear in Sheet1

**Verify**:
- Each invoice photo is stored
- All invoice numbers are comma-separated
- Total cost calculation is correct

#### 4. Geolocation

**Test**: Allow or deny location permission

**Expected Result**:
- If allowed: Coordinates appear in sheet
- If denied: "Location unavailable" message

**Verify**:
- Location format is correct (lat, long)
- Error message is user-friendly

## Troubleshooting Deployment Issues

### Issue: "Script function not found"

**Cause**: Function names don't match or script not saved

**Solution**:
1. Ensure all functions in [`Code.gs`](Code.gs) are saved
2. Check for syntax errors (red underline in editor)
3. Redeploy web app

### Issue: "OpenRouter API key not configured"

**Cause**: `setAPIKey()` function not run

**Solution**:
1. Run `setAPIKey()` in Apps Script editor
2. Enter valid OpenRouter API key
3. Verify success message
4. Redeploy web app

### Issue: "Missing required fields" error

**Cause**: Client sending wrong data format

**Solution**:
1. Check browser console for JavaScript errors
2. Verify `WEB_APP_URL` is correct
3. Ensure photos are captured before submission
4. Check network tab for failed requests

### Issue: OCR not working

**Cause**: API key invalid or quota exceeded

**Solution**:
1. Verify API key in OpenRouter dashboard
2. Check API quota and billing
3. Test API key with curl:
   ```bash
   curl -X POST https://openrouter.ai/api/v1/chat/completions \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"model":"google/gemini-2.5-flash","messages":[{"role":"user","content":"test"}]}'
   ```
4. Update API key if invalid

### Issue: Manual override not appearing

**Cause**: ManualReview sheet doesn't exist

**Solution**:
1. Run `setup()` function in Apps Script editor
2. Verify ManualReview sheet was created
3. Check sheet name matches exactly "ManualReview"
4. Redeploy web app

## Production Deployment

### Security Best Practices

1. **API Key Security**
   - Never commit API key to version control
   - Use script properties, not environment variables
   - Rotate API keys regularly
   - Monitor API usage in OpenRouter dashboard

2. **Access Control**
   - Keep "Anyone" access only for internal use
   - Consider adding authentication for production
   - Monitor usage logs in ErrorLog sheet

3. **Data Privacy**
   - Photos contain sensitive information (vehicle plates)
   - Implement data retention policy
   - Regular cleanup of old photos
   - Comply with local data protection laws

### Performance Monitoring

1. **Key Metrics to Track**:
   - OCR success rate (should be > 90%)
   - Average processing time (should be < 10s)
   - Manual override rate (should be < 10%)
   - API cost per month
   - Error rate

2. **Monitoring Tools**:
   - Google Sheets → View → Statistics
   - OpenRouter dashboard → API usage
   - Apps Script → Executions → Runtime stats

3. **Alert Thresholds**:
   - OCR success rate < 80% → Review photo quality instructions
   - API errors > 5% → Check API key and quota
   - Manual overrides > 20% → Improve OCR prompts or photo quality

### Scaling Considerations

1. **High Volume** (> 100 submissions/day):
   - Implement request queuing
   - Add rate limiting to prevent API abuse
   - Consider batch processing
   - Monitor API costs closely

2. **Multiple Users**:
   - Add user authentication
   - Implement per-user quotas
   - Add audit logging
   - Separate data by user/team

## Rollback Procedure

If you need to revert to the previous manual-entry version:

1. Keep backup of [`Code.gs`](Code.gs) before changes
2. Keep backup of [`index.html`](index.html) before changes
3. Use version control (Git) if available
4. Document rollback steps

## Maintenance

### Regular Tasks

**Weekly**:
- Check ErrorLog sheet for new errors
- Review ManualReview sheet for pending items
- Monitor API usage and costs
- Test OCR accuracy with sample photos

**Monthly**:
- Clean up old photos from Drive (older than 90 days)
- Review and rotate API keys
- Update documentation with lessons learned
- Performance review and optimization

### Updates and Improvements

When updating the system:

1. Test changes in development environment first
2. Back up production data before deployment
3. Use gradual rollout for critical changes
4. Monitor for issues after deployment
5. Have rollback plan ready

## Support Resources

- **OpenRouter Documentation**: https://openrouter.ai/docs
- **Google Apps Script**: https://developers.google.com/apps-script
- **Gemini API**: https://ai.google.dev/gemini-api/docs
- **Project Plan**: [`plans/ocr-implementation-plan.md`](plans/ocr-implementation-plan.md)

## Success Criteria

Deployment is successful when:

✅ Web app is accessible via URL
✅ Vehicle plate capture works
✅ Invoice photo capture works
✅ OCR processes and extracts data
✅ Confidence scoring displays correctly
✅ Manual override works when needed
✅ Data saves to Google Sheets
✅ Photos save to Google Drive
✅ Location tracking works
✅ Mobile experience is smooth
✅ No console errors
✅ API costs are within budget

## Next Steps After Deployment

1. **User Training**: Train users on photo capture best practices
2. **Monitor**: Watch for OCR issues and manual override rate
3. **Optimize**: Adjust OCR prompts based on real-world performance
4. **Scale**: Plan for increased usage if needed
5. **Enhance**: Add features based on user feedback

---

**Deployment typically takes 10-15 minutes** from start to finish.
