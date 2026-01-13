// Configuration
const CONFIG = {
  FOLDER_ID: '1yNhbfNskQf0x74YOrpxsR24TBXHRrr3q', // Google Drive folder ID
  SHEET_NAME: 'Sheet1',
  MANUAL_REVIEW_SHEET: 'ManualReview',
  ERROR_LOG_SHEET: 'ErrorLog',
  OPENROUTER_API_KEY_PROPERTY: 'OPENROUTER_API_KEY',
  MIN_CONFIDENCE: 90 // Minimum confidence percentage
};

// Regex patterns for validation
const VEHICLE_PLATE_REGEX = /^(Dhaka Metro|Private|Motorcycle|[A-Za-z\s]+)-\d{2}-\d{4}$/;
const INVOICE_REGEX = /^INV-[A-Z]{4}\/\d{4}\/\d{4}$/;

// Web App Entry Point
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000); // Wait up to 10 seconds for lock

  try {
    // Parse request data
    const data = JSON.parse(e.postData.contents);
    
    // Validate required fields
    if (!data.platePhoto || !data.invoicePhotos || data.invoicePhotos.length === 0) {
      return createResponse(400, 'Missing required fields');
    }

    // Process submission with OCR
    const result = processSubmission(data);
    
    if (result.status === 'success') {
      return createResponse(200, 'Submission successful', result);
    } else if (result.status === 'requires_manual_review') {
      return createResponse(202, 'OCR requires manual review', result);
    } else {
      return createResponse(500, result.message, result);
    }

  } catch (error) {
    console.error('Error:', error);
    logError(error, e ? e.postData.contents : 'unknown');
    return createResponse(500, 'Internal server error: ' + error.message);
  } finally {
    lock.releaseLock();
  }
}

// Process submission with OCR
function processSubmission(data) {
  // 1. Upload vehicle plate photo
  const platePhotoUrl = uploadPhotoToDrive(data.platePhoto, `${data.submissionId}_plate`);
  
  // 2. Upload all invoice photos
  const invoicePhotoUrls = data.invoicePhotos.map((photo, index) => 
    uploadPhotoToDrive(photo, `${data.submissionId}_invoice_${index}`)
  );
  
  // 3. Process with OCR
  const ocrResults = processOCR(platePhotoUrl, invoicePhotoUrls, data.submissionId);
  
  // 4. Validate results
  const validation = validateOCRResults(ocrResults);
  
  if (validation.isValid) {
    // 5. Save to main sheet
    appendToSheet({
      timestamp: new Date().toISOString(),
      platePhotoUrl: platePhotoUrl,
      invoicePhotoUrls: invoicePhotoUrls.join(', '),
      vehicleNumber: ocrResults.vehiclePlate.number,
      invoiceNumbers: ocrResults.invoiceNumbers.map(inv => inv.number).join(', '),
      location: data.location || 'N/A',
      deviceInfo: data.deviceInfo || 'N/A',
      captureTime: data.captureTime || 'N/A',
      submissionId: data.submissionId,
      ocrStatus: 'SUCCESS',
      ocrConfidence: `${ocrResults.vehiclePlate.confidence}% / ${Math.min(...ocrResults.invoiceNumbers.map(inv => inv.confidence))}%`
    });
    
    return {
      status: 'success',
      message: 'OCR processing completed successfully',
      vehicleNumber: ocrResults.vehiclePlate.number,
      invoiceNumbers: ocrResults.invoiceNumbers.map(inv => inv.number),
      submissionId: data.submissionId
    };
  } else {
    // 6. Save for manual review
    saveForManualReview(data, ocrResults, validation.issues, platePhotoUrl, invoicePhotoUrls);
    
    return {
      status: 'requires_manual_review',
      message: 'OCR processing completed but requires manual review',
      issues: validation.issues,
      submissionId: data.submissionId,
      ocrResults: ocrResults
    };
  }
}

// Process OCR for all images
function processOCR(platePhotoUrl, invoicePhotoUrls, submissionId) {
  const results = {
    vehiclePlate: null,
    invoiceNumbers: [],
    errors: []
  };
  
  // Process vehicle plate
  try {
    results.vehiclePlate = extractVehiclePlate(platePhotoUrl);
  } catch (error) {
    results.errors.push(`Plate OCR failed: ${error.message}`);
    console.error(`Plate OCR error for ${submissionId}:`, error);
  }
  
  // Process each invoice
  for (let i = 0; i < invoicePhotoUrls.length; i++) {
    try {
      const invoice = extractInvoiceNumber(invoicePhotoUrls[i]);
      if (invoice) {
        results.invoiceNumbers.push(invoice);
      }
    } catch (error) {
      results.errors.push(`Invoice ${i+1} OCR failed: ${error.message}`);
      console.error(`Invoice ${i+1} OCR error for ${submissionId}:`, error);
    }
  }
  
  return results;
}

// Call OpenRouter API for OCR
function callOpenRouterOCR(imageUrl, prompt) {
  const apiKey = PropertiesService.getScriptProperties().getProperty(CONFIG.OPENROUTER_API_KEY_PROPERTY);
  
  if (!apiKey) {
    throw new Error('OpenRouter API key not configured. Please set OPENROUTER_API_KEY in script properties.');
  }
  
  const payload = {
    model: 'google/gemini-2.5-flash',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: prompt
          },
          {
            type: 'image_url',
            image_url: {
              url: imageUrl
            }
          }
        ]
      }
    ],
    max_tokens: 100,
    temperature: 0.1  // Low temperature for consistent results
  };
  
  const response = UrlFetchApp.fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': ScriptApp.getService().getUrl(),
      'X-Title': 'Vehicle Exit Tracker'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  
  const responseCode = response.getResponseCode();
  if (responseCode !== 200) {
    const errorText = response.getContentText();
    console.error('OpenRouter API error:', responseCode, errorText);
    throw new Error(`OpenRouter API error (${responseCode}): ${errorText}`);
  }
  
  return JSON.parse(response.getContentText());
}

// Extract vehicle plate number
function extractVehiclePlate(imageUrl) {
  const prompt = `Extract the Bangladesh vehicle license plate number from this image.

Requirements:
- Return ONLY the plate number, nothing else
- Format examples: Dhaka Metro-14-5678, Private-25-7890, Chittagong-15-1234, Motorcycle-30-4567
- The format is: City/Type-XX-XXXX where XX is 2 digits and XXXX is 4 digits
- Confidence: Rate your confidence from 0-100%
- If the plate is not clearly visible or readable, return "NOT_FOUND"

Return format (valid JSON):
{
  "plate": "extracted plate number",
  "confidence": 95
}`;

  const response = callOpenRouterOCR(imageUrl, prompt);
  
  if (!response.choices || response.choices.length === 0) {
    throw new Error('No OCR response received');
  }
  
  const content = response.choices[0].message.content.trim();
  
  // Try to parse JSON from response
  let result;
  try {
    result = JSON.parse(content);
  } catch (e) {
    // If JSON parsing fails, try to extract from text
    const plateMatch = content.match(/[A-Za-z\s]+-\d{2}-\d{4}/);
    if (plateMatch) {
      result = { plate: plateMatch[0], confidence: 95 };
    } else {
      throw new Error('Could not extract plate from OCR response');
    }
  }
  
  // Validate
  if (result.plate === 'NOT_FOUND' || !result.plate) {
    throw new Error('Plate not clearly visible or not found');
  }
  
  // Normalize plate format
  result.plate = result.plate.replace(/\s+/g, ' ').trim();
  
  if (!VEHICLE_PLATE_REGEX.test(result.plate)) {
    throw new Error(`Invalid plate format: ${result.plate}. Expected format: City/Type-XX-XXXX`);
  }
  
  if (result.confidence < CONFIG.MIN_CONFIDENCE) {
    throw new Error(`Low confidence: ${result.confidence}% (minimum: ${CONFIG.MIN_CONFIDENCE}%)`);
  }
  
  return {
    number: result.plate,
    confidence: result.confidence,
    imageUrl: imageUrl
  };
}

// Extract invoice number
function extractInvoiceNumber(imageUrl) {
  const prompt = `Extract the invoice number from this image.

Requirements:
- Return ONLY the invoice number, nothing else
- Format: INV-XXXX/YYYY/ZZZZ where XXXX is 4 letters, YYYY and ZZZZ are 4 digits each
- Example: INV-DBBA/0325/3219
- Must start with "INV-"
- Confidence: Rate your confidence from 0-100%
- If the invoice number is not clearly visible or readable, return "NOT_FOUND"

Return format (valid JSON):
{
  "invoice": "extracted invoice number",
  "confidence": 95
}`;

  const response = callOpenRouterOCR(imageUrl, prompt);
  
  if (!response.choices || response.choices.length === 0) {
    throw new Error('No OCR response received');
  }
  
  const content = response.choices[0].message.content.trim();
  
  // Try to parse JSON from response
  let result;
  try {
    result = JSON.parse(content);
  } catch (e) {
    // If JSON parsing fails, try to extract from text
    const invoiceMatch = content.match(/INV-[A-Z]{4}\/\d{4}\/\d{4}/);
    if (invoiceMatch) {
      result = { invoice: invoiceMatch[0], confidence: 95 };
    } else {
      throw new Error('Could not extract invoice number from OCR response');
    }
  }
  
  // Validate
  if (result.invoice === 'NOT_FOUND' || !result.invoice) {
    throw new Error('Invoice number not clearly visible or not found');
  }
  
  if (!INVOICE_REGEX.test(result.invoice)) {
    throw new Error(`Invalid invoice format: ${result.invoice}. Expected format: INV-XXXX/YYYY/ZZZZ`);
  }
  
  if (result.confidence < CONFIG.MIN_CONFIDENCE) {
    throw new Error(`Low confidence: ${result.confidence}% (minimum: ${CONFIG.MIN_CONFIDENCE}%)`);
  }
  
  return {
    number: result.invoice,
    confidence: result.confidence,
    imageUrl: imageUrl
  };
}

// Validate OCR results
function validateOCRResults(results) {
  const validation = {
    isValid: true,
    requiresManualReview: false,
    issues: []
  };
  
  // Check vehicle plate
  if (!results.vehiclePlate) {
    validation.isValid = false;
    validation.requiresManualReview = true;
    validation.issues.push('Vehicle plate not detected or confidence < 90%');
  }
  
  // Check invoice numbers
  if (results.invoiceNumbers.length === 0) {
    validation.isValid = false;
    validation.requiresManualReview = true;
    validation.issues.push('No valid invoice numbers detected');
  }
  
  // Check for errors
  if (results.errors.length > 0) {
    validation.isValid = false;
    validation.requiresManualReview = true;
    validation.issues.push(`OCR errors: ${results.errors.join('; ')}`);
  }
  
  return validation;
}

// Save for manual review
function saveForManualReview(data, ocrResults, issues, platePhotoUrl, invoicePhotoUrls) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.MANUAL_REVIEW_SHEET);
  
  // Create sheet if it doesn't exist
  if (!sheet) {
    createManualReviewSheet();
    return saveForManualReview(data, ocrResults, issues, platePhotoUrl, invoicePhotoUrls);
  }
  
  const rowData = [
    new Date().toISOString(),
    data.submissionId,
    JSON.stringify(ocrResults),
    issues.join('; '),
    data.location || 'N/A',
    data.deviceInfo || 'N/A',
    'PENDING_REVIEW',
    platePhotoUrl,
    invoicePhotoUrls.join(', ')
  ];
  
  sheet.appendRow(rowData);
}

// Create manual review sheet
function createManualReviewSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.insertSheet(CONFIG.MANUAL_REVIEW_SHEET);
  
  // Set headers
  sheet.getRange('A1:J1').setValues([[
    'Timestamp',
    'Submission ID',
    'OCR Results',
    'Issues',
    'Location',
    'Device Info',
    'Status',
    'Plate Photo URL',
    'Invoice Photo URLs',
    'Reviewed By'
  ]]);
  
  // Format headers
  sheet.getRange('A1:J1').setFontWeight('bold').setBackground('#4285f4').setFontColor('white');
  sheet.setFrozenRows(1);
}

// Upload base64 photo to Google Drive
function uploadPhotoToDrive(base64Data, filename) {
  try {
    // Extract MIME type and data
    const matches = base64Data.match(/^data:(.+);base64,(.+)$/);
    const mimeType = matches[1];
    const data = Utilities.base64Decode(matches[2]);
    
    // Create blob
    const blob = Utilities.newBlob(data, mimeType, `${filename}.jpg`);
    
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
  
  if (!sheet) {
    throw new Error(`Sheet '${CONFIG.SHEET_NAME}' not found`);
  }
  
  const rowData = [
    data.timestamp,
    data.platePhotoUrl,
    data.invoicePhotoUrls,
    data.vehicleNumber,
    data.invoiceNumbers,
    data.location,
    data.deviceInfo,
    data.captureTime,
    data.submissionId,
    data.ocrStatus,
    data.ocrConfidence
  ];
  
  sheet.appendRow(rowData);
}

// Log error to error log sheet
function logError(error, context) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.ERROR_LOG_SHEET);
  
  // Create sheet if it doesn't exist
  if (!sheet) {
    createErrorLogSheet();
    return logError(error, context);
  }
  
  const rowData = [
    new Date().toISOString(),
    error.name || 'UnknownError',
    error.message || 'No message',
    context.substring(0, 500), // Limit context length
    error.stack || 'No stack trace'
  ];
  
  sheet.appendRow(rowData);
}

// Create error log sheet
function createErrorLogSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.insertSheet(CONFIG.ERROR_LOG_SHEET);
  
  // Set headers
  sheet.getRange('A1:E1').setValues([[
    'Timestamp',
    'Error Type',
    'Error Message',
    'Context',
    'Stack Trace'
  ]]);
  
  // Format headers
  sheet.getRange('A1:E1').setFontWeight('bold').setBackground('#dc2626').setFontColor('white');
  sheet.setFrozenRows(1);
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

// Setup function - Run once to initialize sheets and set API key
function setup() {
  // Create manual review sheet if it doesn't exist
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet.getSheetByName(CONFIG.MANUAL_REVIEW_SHEET)) {
    createManualReviewSheet();
  }
  
  // Create error log sheet if it doesn't exist
  if (!spreadsheet.getSheetByName(CONFIG.ERROR_LOG_SHEET)) {
    createErrorLogSheet();
  }
  
  // Update main sheet headers if needed
  const mainSheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME);
  if (mainSheet) {
    const headers = mainSheet.getRange('A1:K1').getValues()[0];
    if (headers.length < 11 || headers[9] !== 'OCR Status' || headers[10] !== 'OCR Confidence') {
      mainSheet.getRange('A1:K1').setValues([[
        'Timestamp',
        'Plate Photo URL',
        'Invoice Photo URLs',
        'Vehicle Number',
        'Invoice Numbers',
        'Location',
        'Device Info',
        'Capture Time',
        'Submission ID',
        'OCR Status',
        'OCR Confidence'
      ]]);
      mainSheet.getRange('A1:K1').setFontWeight('bold').setBackground('#4285f4').setFontColor('white');
      mainSheet.setFrozenRows(1);
    }
  }
  
  return 'Setup complete. Please set OPENROUTER_API_KEY in script properties.';
}

// Function to set OpenRouter API key
function setAPIKey() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt('Enter OpenRouter API Key', 'Please enter your OpenRouter API key:', ui.ButtonSet.OK_CANCEL);
  
  if (response.getSelectedButton() === ui.Button.OK) {
    PropertiesService.getScriptProperties().setProperty(CONFIG.OPENROUTER_API_KEY_PROPERTY, response.getResponseText());
    ui.alert('API key saved successfully!');
  }
}
