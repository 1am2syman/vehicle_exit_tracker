// Configuration
const CONFIG = {
  FOLDER_ID: '1yNhbfNskQf0x74YOrpxsR24TBXHRrr3q', // Google Drive folder ID
  SHEET_NAME: 'Sheet1'
};

// Web App Entry Point
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000); // Wait up to 10 seconds for lock

  try {
    // Parse request data
    const data = JSON.parse(e.postData.contents);
    
    // Validate required fields
    if (!data.photoBase64 || !data.vehicleNumber || !data.invoiceNumbers) {
      return createResponse(400, 'Missing required fields');
    }

    // Upload photo to Drive
    const photoUrl = uploadPhotoToDrive(data.photoBase64, data.submissionId);
    
    // Append data to sheet
    appendToSheet({
      timestamp: new Date().toISOString(),
      photoUrl: photoUrl,
      vehicleNumber: data.vehicleNumber,
      invoiceNumbers: data.invoiceNumbers.join(', '),
      location: data.location || 'N/A',
      deviceInfo: data.deviceInfo || 'N/A',
      captureTime: data.captureTime || 'N/A',
      submissionId: data.submissionId
    });

    return createResponse(200, 'Submission successful', { photoUrl: photoUrl });

  } catch (error) {
    console.error('Error:', error);
    return createResponse(500, 'Internal server error: ' + error.message);
  } finally {
    lock.releaseLock();
  }
}

// Upload base64 photo to Google Drive
function uploadPhotoToDrive(base64Data, submissionId) {
  try {
    // Extract MIME type and data
    const matches = base64Data.match(/^data:(.+);base64,(.+)$/);
    const mimeType = matches[1];
    const data = Utilities.base64Decode(matches[2]);
    
    // Create blob
    const blob = Utilities.newBlob(data, mimeType, `vehicle_${submissionId}.jpg`);
    
    // Upload to Drive
    const folder = DriveApp.getFolderById(CONFIG.FOLDER_ID);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return file.getUrl();
  } catch (error) {
    console.error('Photo upload error:', error);
    throw new Error('Failed to upload photo');
  }
}

// Append data to Google Sheet
function appendToSheet(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  
  const rowData = [
    data.timestamp,
    data.photoUrl,
    data.vehicleNumber,
    data.invoiceNumbers,
    data.location,
    data.deviceInfo,
    data.captureTime,
    data.submissionId
  ];
  
  sheet.appendRow(rowData);
}

// Create HTTP response
function createResponse(statusCode, message, data = {}) {
  return ContentService
    .createTextOutput(JSON.stringify({
      status: statusCode,
      message: message,
      data: data
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

// CORS handling for OPTIONS requests
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      status: 200,
      message: 'Vehicle Exit Tracker API is running'
    }))
    .setMimeType(ContentService.MimeType.JSON);
}
