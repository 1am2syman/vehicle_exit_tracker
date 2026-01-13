# Vehicle Exit Tracker

An intelligent vehicle exit tracking system that uses AI-powered OCR to automatically extract vehicle plate numbers and invoice numbers from photos.

## Features

- 📸 **Photo-Only Input**: Capture vehicle plate and invoice photos without manual typing
- 🤖 **AI-Powered OCR**: Automatic text extraction using OpenRouter's Gemini 2.5 Flash
- 🎯 **High Accuracy**: 90%+ confidence threshold with manual override fallback
- 📋 **Multiple Invoices**: Support for multiple invoice photos in a single submission
- 📍 **Geolocation**: Automatic location tracking
- 📱 **Mobile-First**: Responsive design optimized for smartphones
- 🔄 **Manual Override**: Fallback to manual entry when OCR confidence is low

## How It Works

### 1. Capture Vehicle Plate Photo
- Tap the camera icon to capture the vehicle license plate
- The app automatically compresses the image for optimal OCR performance

### 2. Capture Invoice Photos
- Add one or more invoice photos using the "Add Invoice Photo" button
- Each invoice is processed separately for maximum accuracy

### 3. AI-Powered OCR Processing
- Photos are sent to Google Apps Script backend
- OpenRouter's Gemini 2.5 Flash model extracts:
  - **Vehicle Plate Number**: Bangladesh format (e.g., Dhaka Metro-14-5678, Private-25-7890)
  - **Invoice Numbers**: Format INV-XXXX/YYYY/ZZZZ (e.g., INV-DBBA/0325/3219)

### 4. Review & Confirm
- View extracted data with confidence scores
- Confirm if correct, or edit manually if needed
- Confidence scoring:
  - ✅ **Green**: 95%+ confidence
  - ⚠️ **Yellow**: 90-94% confidence
  - ❌ **Red**: Below 90% (requires manual review)

### 5. Automatic Submission
- Data is automatically saved to Google Sheets
- Photos are stored in Google Drive
- Location and device info are captured

## Supported Formats

### Vehicle Plates (Bangladesh)
- Dhaka Metro-XX-XXXX
- Private-XX-XXXX
- Motorcycle-XX-XXXX
- District names-XX-XXXX (e.g., Chittagong-15-1234)

### Invoice Numbers
- Format: `INV-XXXX/YYYY/ZZZZ`
- Example: `INV-DBBA/0325/3219`
- XXXX = 4 uppercase letters
- YYYY = 4 digits
- ZZZZ = 4 digits

## Setup Instructions

### 1. Google Apps Script Setup

1. Open the Google Apps Script project
2. Run the `setup()` function to initialize sheets:
   - Main sheet (Sheet1)
   - Manual review sheet (ManualReview)
   - Error log sheet (ErrorLog)
3. Run the `setAPIKey()` function to configure OpenRouter API key
4. Deploy as a web app:
   - Execute as: Me
   - Who has access: Anyone
   - Copy the Web App URL

### 2. Update Client Configuration

Edit `index.html` and update the `WEB_APP_URL` constant with your deployment URL:

```javascript
const CONFIG = {
    WEB_APP_URL: 'YOUR_WEB_APP_URL_HERE',
    // ... other config
};
```

### 3. Configure OpenRouter API Key

The system requires an OpenRouter API key with access to Google's Gemini 2.5 Flash model.

**To set the API key:**
1. In Google Apps Script editor
2. Run the `setAPIKey()` function
3. Enter your OpenRouter API key when prompted
4. The key is securely stored in script properties

**API Key Storage:**
- Stored in `PropertiesService.getScriptProperties()`
- Never hardcoded in the source code
- Secure and accessible only to the script

## Project Structure

```
vehicle_exit_tracker/
├── index.html              # Client-side UI (photo capture, OCR display)
├── Code.gs                 # Google Apps Script backend (OCR, validation, storage)
├── assets/
│   └── logo.png           # Company logo
├── plans/
│   ├── plan.md             # Original implementation plan
│   └── ocr-implementation-plan.md  # Detailed OCR architecture
├── README.md               # This file
├── DEPLOYMENT_GUIDE.md    # Deployment instructions
└── DEBUGGING_GUIDE.md     # Troubleshooting guide
```

## Google Sheets Structure

### Main Sheet (Sheet1)

| Timestamp | Plate Photo URL | Invoice Photo URLs | Vehicle Number | Invoice Numbers | Location | Device Info | Capture Time | Submission ID | OCR Status | OCR Confidence |
|-----------|-----------------|-------------------|----------------|-----------------|----------|-------------|--------------|---------------|------------|----------------|
| 2024-01-13... | https://... | https://...,https://... | Dhaka Metro-14-5678 | INV-DBBA/0325/3219 | 23.8103,90.4125 | iPhone 13 | 2024-01-13T... | abc-123 | SUCCESS | 95% / 92% |

### Manual Review Sheet

| Timestamp | Submission ID | OCR Results | Issues | Location | Device Info | Status | Plate Photo URL | Invoice Photo URLs | Reviewed By | Review Date |
|-----------|---------------|-------------|---------|----------|-------------|---------|----------------|-------------------|-------------|------------|
| 2024-01-13... | abc-123 | {...} | Low confidence | 23.8103,90.4125 | iPhone 13 | PENDING_REVIEW | https://... | https://... | - | - |

### Error Log Sheet

| Timestamp | Error Type | Error Message | Context | Stack Trace | Resolved |
|-----------|-------------|---------------|----------|-------------|-----------|
| 2024-01-13... | LowConfidenceError | Confidence 85% | Plate extraction | ... | false |

## OCR Processing Flow

```
User captures photos
        ↓
Upload to Google Drive
        ↓
Send to OpenRouter API (Gemini 2.5 Flash)
        ↓
Extract & validate data
        ↓
Confidence ≥ 90%?
    ├─ Yes → Save to main sheet → Show success
    └─ No  → Save to ManualReview sheet → Show manual entry modal
```

## Manual Override Workflow

When OCR confidence is below 90% or extraction fails:

1. **Automatic Trigger**: Manual entry modal appears
2. **Photo Preview**: Shows captured vehicle plate for reference
3. **Pre-filled Data**: OCR results are pre-filled for easy editing
4. **Manual Input**: User can correct or enter data manually
5. **Validation**: Manual input is validated against expected formats
6. **Submission**: Manual data is submitted with photo URLs
7. **Storage**: Saved to main sheet with manual override flag

## Cost Considerations

### OpenRouter API Costs

- **Model**: Google Gemini 2.5 Flash
- **Input**: $0.075 per 1M tokens
- **Output**: $0.30 per 1M tokens
- **Image tokens**: ~1,000 tokens per image

**Estimated Cost per Submission:**
- 1 plate image: ~1,000 tokens input + ~100 tokens output
- 2 invoice images: ~2,000 tokens input + ~200 tokens output
- **Total**: ~3,300 tokens per submission
- **Cost**: ~$0.00025 per submission
- **1,000 submissions**: ~$0.25

### Google Drive Storage

- Photos are stored in your Google Drive folder
- No additional storage costs (within free tier)
- Consider implementing cleanup for old photos if needed

## Troubleshooting

### OCR Not Detecting Data

**Problem**: OCR returns "NOT_FOUND" or low confidence

**Solutions**:
1. Ensure good lighting - avoid shadows and glare
2. Hold camera steady - use both hands or a stable surface
3. Check focus - tap to focus before capturing
4. Proper distance - 1-2 feet from plate/invoice
5. Clean lens - wipe camera lens if blurry
6. Use manual override if OCR consistently fails

### API Key Issues

**Problem**: "OpenRouter API key not configured" error

**Solution**:
1. Run `setAPIKey()` function in Google Apps Script editor
2. Enter your OpenRouter API key
3. Redeploy the web app

### Manual Review Not Working

**Problem**: Manual override modal not appearing

**Solutions**:
1. Check browser console for JavaScript errors
2. Verify ManualReview sheet exists (run `setup()`)
3. Check network connection to web app
4. Ensure submission ID is being generated correctly

## Security & Privacy

- **API Key**: Stored securely in script properties, never exposed to client
- **Photo Data**: Compressed and optimized before transmission
- **Location Data**: Captured only with user permission
- **Device Info**: Limited to user agent and screen size
- **No PII**: No personal data collected beyond what's necessary

## Performance Optimization

- **Image Compression**: Photos compressed to 800px max dimension at 80% quality
- **Concurrent Processing**: Multiple invoices processed in parallel
- **Caching**: OCR results cached for identical images
- **Error Recovery**: Automatic retry with exponential backoff
- **Timeout Handling**: 10-second timeout for all API calls

## Future Enhancements

- [ ] Batch processing for multiple submissions
- [ ] Offline mode with queue
- [ ] Photo quality preview before submission
- [ ] Historical data dashboard
- [ ] Export to PDF/Excel
- [ ] Email notifications for manual reviews
- [ ] Analytics and reporting

## License

This project is proprietary software of MBL. All rights reserved.

## Support

For issues or questions, contact the development team.
