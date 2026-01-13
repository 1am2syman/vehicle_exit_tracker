# Vehicle Exit Tracker

A mobile-first single-page web application for tracking factory vehicle exits with photo capture, vehicle number, and invoice numbers. Data is submitted to a centralized Google Sheet without using a database.

## Features

- **Camera-first UI**: Large centered camera icon that opens phone camera
- **Progressive disclosure**: Form fields appear only after photo capture
- **Multi-invoice support**: Dynamic add/remove invoice number fields
- **Photo metadata**: Capture time, geolocation, device info automatically collected
- **Modern minimal UI**: Clean design with smooth animations and mobile-optimized touch targets
- **Cross-platform**: Works on Android/iPhone/PC as a single page webapp
- **No database**: Uses Google Sheets + Google Drive for storage

## Quick Setup

### Step 1: Create Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com)
2. Create a new spreadsheet named "Vehicle Exit Tracker"
3. Create the following columns in the first row (A1 through H1):

| Column | Header | Description |
|--------|--------|-------------|
| A | Timestamp | ISO 8601 format |
| B | Photo URL | URL to uploaded photo |
| C | Vehicle Number | Alphanumeric identifier |
| D | Invoice Numbers | Comma-separated invoices |
| E | Location | Latitude, Longitude |
| F | Device Info | User agent + resolution |
| G | Capture Time | Photo capture time |
| H | Submission ID | Unique UUID |

4. Format the sheet:
   - Set row 1 as bold header
   - Freeze row 1
   - Enable text wrapping for columns C and D

### Step 2: Create Google Drive Folder

1. Go to [drive.google.com](https://drive.google.com)
2. Create a folder named "Vehicle Exit Photos"
3. Note the folder ID from the URL (e.g., `1ABC...xyz`)
4. Share the folder with "Anyone with the link can view"

### Step 3: Deploy Google Apps Script

1. In your Google Sheet, go to **Extensions** → **Apps Script**
2. Delete any existing code and paste the contents of [`Code.gs`](Code.gs)
3. Replace `YOUR_DRIVE_FOLDER_ID` with your actual folder ID from Step 2
4. Click **Deploy** → **New deployment**
5. Click the gear icon (⚙️) → **Web app**
6. Configure:
   - **Description**: "Vehicle Exit Tracker v1"
   - **Execute as**: "Me"
   - **Who has access**: "Anyone"
7. Click **Deploy** and authorize the script
8. **Copy the Web App URL** (e.g., `https://script.google.com/macros/s/ABC.../exec`)

### Step 4: Configure Frontend

1. Open [`index.html`](index.html)
2. Find the CONFIG object in the JavaScript section
3. Replace `YOUR_WEB_APP_URL_HERE` with your actual Web App URL from Step 3

### Step 5: Deploy Frontend

Choose one of the following hosting options:

#### Option A: GitHub Pages (Free)
1. Create a GitHub repository
2. Upload `index.html` to the repository
3. Go to **Settings** → **Pages**
4. Select **main** branch as source
5. Access at `https://yourusername.github.io/repository-name/`

#### Option B: Netlify (Free)
1. Go to [netlify.com](https://netlify.com)
2. Drag and drop the folder containing `index.html`
3. Get your URL instantly

#### Option C: Vercel (Free)
1. Go to [vercel.com](https://vercel.com)
2. Import your repository or upload files
3. Deploy with one click

#### Option D: Firebase Hosting
1. Install Firebase CLI: `npm install -g firebase-tools`
2. Run `firebase login`
3. Run `firebase init` in your project directory
4. Select **Hosting**
5. Run `firebase deploy`

## Testing

1. Open the deployed URL on your mobile device
2. Tap the camera icon to capture a photo
3. Fill in vehicle number and invoice numbers
4. Tap "Submit Entry"
5. Check your Google Sheet for the new entry

## File Structure

```
vehicle_exit_tracker/
├── index.html          # Single page application (HTML + CSS + JS)
├── Code.gs             # Google Apps Script backend
├── plans/
│   └── plan.md         # Detailed implementation plan
└── README.md           # This file
```

## Security Considerations

- **Google Apps Script Security**: Deployed as "Me" with "Anyone" access for public web app
- **Data Privacy**: Only vehicle numbers, invoice numbers, and photos are collected
- **Input Validation**: All inputs are sanitized before submission
- **Location Data**: Only captured with user permission
- **Photo Storage**: Stored in Google Drive with view-only access

## Troubleshooting

### Camera not opening on mobile
- Ensure HTTPS is used (required for camera access on most browsers)
- Check browser permissions for camera access

### Photos not uploading to Google Drive
- Verify FOLDER_ID in Code.gs CONFIG is correct
- Check Google Drive folder permissions

### Form submission fails
- Check browser console for errors
- Verify Web App URL is correct
- Ensure Google Apps Script is deployed with "Anyone" access

### Location not captured
- Ensure location permission is granted
- Check device GPS settings
- Location may be unavailable indoors

## Browser Compatibility

- **Chrome**: Full support
- **Safari**: Full support (iOS 11+)
- **Firefox**: Full support
- **Edge**: Full support
- **Opera**: Full support

## License

This project is provided as-is for educational and commercial use.

## Support

For detailed technical documentation, see [`plans/plan.md`](plans/plan.md).
