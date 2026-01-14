// Configuration
let CONFIG = {
  FOLDER_ID: '', // Will be loaded from script properties
  SHEET_NAME: 'Sheet1',
  OPENROUTER_API_KEY: '', // Will be loaded from script properties
  OPENROUTER_MODEL: 'google/gemini-2.0-flash-exp', // Updated model name
  MAX_PHOTO_SIZE: 1024 * 1024, // 1MB
  MIN_CONFIDENCE_SCORE: 0.7, // Minimum confidence threshold
  API_TIMEOUT: 30000, // 30 seconds
};

// Setup Functions - Run these from Apps Script editor to configure the system

/**
 * Setup Google Sheets columns with proper headers and formatting
 * Run this function from the Apps Script editor to initialize the sheet
 */
function setupColumns() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  
  // Define column headers
  const headers = [
    'Timestamp',
    'Number Plate Photo URL',
    'Invoice Photos URLs',
    'Vehicle Number',
    'Invoice Numbers',
    'Vehicle Number Confidence',
    'Invoice Numbers Confidence',
    'Location',
    'Device Info',
    'Capture Time',
    'Submission ID',
    'AI Processing Time',
    'Validation Status',
    'Error Message',
    'Manual Override'
  ];
  
  // Set headers in row 1
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Format headers
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#f8f9fa');
  headerRange.setFontColor('#0f172a');
  
  // Freeze header row
  sheet.setFrozenRows(1);
  
  // Set column widths
  sheet.setColumnWidth(1, 180);  // Timestamp
  sheet.setColumnWidth(2, 300);  // Number Plate Photo URL
  sheet.setColumnWidth(3, 300);  // Invoice Photos URLs
  sheet.setColumnWidth(4, 150);  // Vehicle Number
  sheet.setColumnWidth(5, 150);  // Invoice Numbers
  sheet.setColumnWidth(6, 120);  // Vehicle Number Confidence
  sheet.setColumnWidth(7, 120);  // Invoice Numbers Confidence
  sheet.setColumnWidth(8, 200);  // Location
  sheet.setColumnWidth(9, 250);  // Device Info
  sheet.setColumnWidth(10, 180); // Capture Time
  sheet.setColumnWidth(11, 200); // Submission ID
  sheet.setColumnWidth(12, 120); // AI Processing Time
  sheet.setColumnWidth(13, 100); // Validation Status
  sheet.setColumnWidth(14, 100); // Error Message
  sheet.setColumnWidth(15, 100); // Manual Override
  
  // Enable text wrapping for appropriate columns
  const wrapColumns = [2, 3, 4, 5, 9, 14];
  wrapColumns.forEach(col => {
    sheet.setColumnWidth(col, sheet.getColumnWidth(col));
    sheet.getRange(1, col, sheet.getLastRow(), 1).setWrap(true);
  });
  
  // Set up conditional formatting for confidence scores
  // Vehicle Number Confidence (Column F)
  const vehicleConfidenceRange = sheet.getRange(2, 6, sheet.getMaxRows(), 1);
  const vehicleConfidenceRules = [
    SpreadsheetApp.newConditionalFormatRule()
      .whenNumberLessThan(0.7)
      .setBackground('#fee2e2')
      .setFontColor('#991b1b')
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenNumberBetween(0.7, 0.85)
      .setBackground('#fef3c7')
      .setFontColor('#92400e')
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenNumberGreaterThan(0.85)
      .setBackground('#dcfce7')
      .setFontColor('#166534')
      .build()
  ];
  vehicleConfidenceRange.setConditionalFormatRules(vehicleConfidenceRules);
  
  // Invoice Numbers Confidence (Column G)
  const invoiceConfidenceRange = sheet.getRange(2, 7, sheet.getMaxRows(), 1);
  invoiceConfidenceRange.setConditionalFormatRules(vehicleConfidenceRules);
  
  // Validation Status (Column M)
  const validationRange = sheet.getRange(2, 13, sheet.getMaxRows(), 1);
  const validationRules = [
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('Fail')
      .setFontColor('#dc2626')
      .setFontWeight('bold')
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('Partial')
      .setFontColor('#ea580c')
      .setFontWeight('bold')
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('Success')
      .setFontColor('#16a34a')
      .setFontWeight('bold')
      .build()
  ];
  validationRange.setConditionalFormatRules(validationRules);
  
  // Format confidence scores as percentage
  sheet.getRange(2, 6, sheet.getMaxRows(), 2).setNumberFormat('0%');
  
  // Format AI Processing Time with "ms" suffix
  sheet.getRange(2, 12, sheet.getMaxRows(), 1).setNumberFormat('0" ms"');
  
  return 'Sheet setup complete! Columns created with proper formatting.';
}

/**
 * Setup OpenRouter API Key
 * Run this function from Apps Script editor - it will prompt you for API key
 */
function setupAPI() {
  // Prompt user for API key
  const ui = SpreadsheetApp.getUi();
  const apiKey = ui.prompt(
    'Setup OpenRouter API',
    'Please enter your OpenRouter API key:\n\n(Get your key from https://openrouter.ai/keys)',
    ui.ButtonSet.OK_CANCEL
  );
  
  // Check if user cancelled
  if (apiKey.getSelectedButton() !== ui.Button.OK) {
    return 'Setup cancelled.';
  }
  
  const apiKeyValue = apiKey.getResponseText();
  
  // Validate API key
  if (!apiKeyValue || apiKeyValue.trim() === '') {
    ui.alert('Error', 'Please provide a valid API key.', ui.ButtonSet.OK);
    return 'API key is required.';
  }
  
  // Store API key in script properties
  PropertiesService.getScriptProperties().setProperty('OPENROUTER_API_KEY', apiKeyValue.trim());
  
  // Update CONFIG
  CONFIG.OPENROUTER_API_KEY = apiKeyValue.trim();
  
  ui.alert(
    'Success!',
    `API key saved successfully!\n\nKey: ${apiKeyValue.trim().substring(0, 10)}...`,
    ui.ButtonSet.OK
  );
  
  return `API key saved successfully! Key: ${apiKeyValue.trim().substring(0, 10)}...`;
}

/**
 * Setup Google Drive Folder ID for image storage
 * Run this function from Apps Script editor - it will prompt you for the folder ID
 */
function setupImageFolder() {
  // Prompt user for folder ID
  const ui = SpreadsheetApp.getUi();
  const folderId = ui.prompt(
    'Setup Image Folder',
    'Please enter your Google Drive Folder ID:\n\n(You can find this in the folder URL: drive.google.com/drive/folders/FOLDER_ID)',
    ui.ButtonSet.OK_CANCEL
  );
  
  // Check if user cancelled
  if (folderId.getSelectedButton() !== ui.Button.OK) {
    return 'Setup cancelled.';
  }
  
  const folderIdValue = folderId.getResponseText();
  
  // Validate folder ID
  if (!folderIdValue || folderIdValue.trim() === '') {
    ui.alert('Error', 'Please provide a valid folder ID.', ui.ButtonSet.OK);
    return 'Folder ID is required.';
  }
  
  try {
    // Verify folder exists and is accessible
    const folder = DriveApp.getFolderById(folderIdValue.trim());
    const folderName = folder.getName();
    
    // Store folder ID in script properties
    PropertiesService.getScriptProperties().setProperty('FOLDER_ID', folderIdValue.trim());
    
    // Update CONFIG
    CONFIG.FOLDER_ID = folderIdValue.trim();
    
    ui.alert(
      'Success!',
      `Image folder configured successfully!\n\nFolder: ${folderName}\nID: ${folderIdValue.trim()}`,
      ui.ButtonSet.OK
    );
    
    return `Image folder setup complete! Folder: ${folderName} (ID: ${folderIdValue.trim()})`;
  } catch (error) {
    ui.alert(
      'Error',
      `Failed to access folder: ${error.message}\n\nPlease verify:\n1. The folder ID is correct\n2. The folder exists\n3. You have access to the folder\n4. The folder has "Anyone with link can view" permission`,
      ui.ButtonSet.OK
    );
    throw new Error(`Failed to access folder: ${error.message}. Please verify the folder ID and sharing permissions.`);
  }
}

/**
 * Load configuration from script properties
 * Call this at the start of doPost to load saved configuration
 */
function loadConfiguration() {
  const properties = PropertiesService.getScriptProperties();
  
  const apiKey = properties.getProperty('OPENROUTER_API_KEY');
  if (apiKey) {
    CONFIG.OPENROUTER_API_KEY = apiKey;
  }
  
  const folderId = properties.getProperty('FOLDER_ID');
  if (folderId) {
    CONFIG.FOLDER_ID = folderId;
  }
}

// Web App Entry Point
function doPost(e) {
  // Load configuration from script properties
  loadConfiguration();
  
  Logger.log('=== doPost STARTED ===');
  Logger.log('Configuration loaded:');
  Logger.log('  FOLDER_ID: ' + (CONFIG.FOLDER_ID ? 'SET' : 'NOT SET'));
  Logger.log('  API_KEY: ' + (CONFIG.OPENROUTER_API_KEY ? 'SET' : 'NOT SET'));
  
  const lock = LockService.getScriptLock();
  lock.tryLock(10000); // Wait up to 10 seconds for lock

  try {
    const startTime = new Date();
    Logger.log('Request received at: ' + startTime.toISOString());
    Logger.log('Content type: ' + e.postData.type);
    
    // Parse request data based on content type
    let data;
    
    if (e.postData.type === 'application/x-www-form-urlencoded') {
      // Parse URL-encoded form data (from no-cors requests)
      Logger.log('Parsing URL-encoded form data...');
      data = {
        platePhotoBase64: e.parameter.platePhotoBase64,
        invoicePhotosBase64: JSON.parse(e.parameter.invoicePhotosBase64 || '[]'),
        location: e.parameter.location,
        deviceInfo: e.parameter.deviceInfo,
        captureTime: e.parameter.captureTime,
        submissionId: e.parameter.submissionId
      };
    } else {
      // Parse JSON data (standard requests)
      Logger.log('Parsing JSON data...');
      data = JSON.parse(e.postData.contents);
    }
    
    Logger.log('Parsed request data:');
    Logger.log('  platePhotoBase64: ' + (data.platePhotoBase64 ? 'PRESENT (' + data.platePhotoBase64.substring(0, 50) + '...)' : 'MISSING'));
    Logger.log('  invoicePhotosBase64: ' + (data.invoicePhotosBase64 ? data.invoicePhotosBase64.length + ' photos' : 'MISSING'));
    Logger.log('  submissionId: ' + data.submissionId);
    Logger.log('  location: ' + data.location);
    Logger.log('  deviceInfo: ' + data.deviceInfo);
    
    // Validate required fields
    if (!data.platePhotoBase64 || !data.invoicePhotosBase64 || data.invoicePhotosBase64.length === 0) {
      Logger.log('VALIDATION FAILED: Missing required photos');
      return createResponse(400, 'Missing required photos');
    }
    
    Logger.log('Validation passed, starting AI processing...');

    // AI Processing
    Logger.log('Calling processPhotosWithAI...');
    const aiResult = processPhotosWithAI(data.platePhotoBase64, data.invoicePhotosBase64);
    Logger.log('AI Processing result:');
    Logger.log('  vehicleNumber: ' + aiResult.vehicleNumber);
    Logger.log('  vehicleNumberConfidence: ' + aiResult.vehicleNumberConfidence);
    Logger.log('  invoiceNumbers: ' + aiResult.invoiceNumbers.join(', '));
    Logger.log('  invoiceNumbersConfidence: ' + aiResult.invoiceNumbersConfidence);
    
    // Validation
    Logger.log('Validating extraction results...');
    const validationResult = validateExtraction(aiResult);
    Logger.log('Validation result: ' + validationResult.status);
    if (validationResult.error) {
      Logger.log('Validation error: ' + validationResult.error);
    }
    
    // IMMEDIATE STORAGE: Store AI result in script properties for retrieval
    // We do this BEFORE uploads to make the UI responsive faster
    const resultKey = 'aiResult_' + data.submissionId;
    const resultData = {
      vehicleNumber: aiResult.vehicleNumber,
      invoiceNumbers: aiResult.invoiceNumbers,
      confidence: {
        vehicle: aiResult.vehicleNumberConfidence,
        invoices: aiResult.invoiceNumbersConfidence
      },
      validationStatus: validationResult.status
    };
    PropertiesService.getScriptProperties().setProperty(resultKey, JSON.stringify(resultData));
    Logger.log('AI result stored with key: ' + resultKey);
    
    // Upload photos to Drive
    Logger.log('Starting Drive uploads...');
    Logger.log('Uploading plate photo...');
    const platePhotoUrl = uploadPhotoToDrive(data.platePhotoBase64, data.submissionId, 'plate');
    Logger.log('Plate photo URL: ' + platePhotoUrl);
    
    Logger.log('Uploading ' + data.invoicePhotosBase64.length + ' invoice photos...');
    const invoicePhotoUrls = data.invoicePhotosBase64.map((photo, index) => {
      const url = uploadPhotoToDrive(photo, data.submissionId, `invoice_${index}`);
      Logger.log('Invoice photo ' + index + ' URL: ' + url);
      return url;
    });

    // Append data to sheet
    const processingTime = new Date() - startTime;
    Logger.log('Total processing time: ' + processingTime + 'ms');
    
    Logger.log('Appending to sheet...');
    const sheetData = {
      timestamp: new Date().toISOString(),
      numberPlatePhotoUrl: platePhotoUrl,
      invoicePhotosUrls: invoicePhotoUrls.join(', '),
      vehicleNumber: aiResult.vehicleNumber || 'N/A',
      invoiceNumbers: aiResult.invoiceNumbers.join(', ') || 'N/A',
      vehicleNumberConfidence: aiResult.vehicleNumberConfidence || 0,
      invoiceNumbersConfidence: aiResult.invoiceNumbersConfidence || 0,
      location: data.location || 'N/A',
      deviceInfo: data.deviceInfo || 'N/A',
      captureTime: data.captureTime || 'N/A',
      submissionId: data.submissionId,
      aiProcessingTime: processingTime,
      validationStatus: validationResult.status,
      errorMessage: validationResult.error || '',
      manualOverride: false
    };
    Logger.log('Sheet data prepared, calling appendToSheet...');
    appendToSheet(sheetData);
    Logger.log('Data appended to sheet successfully');

    return createResponse(200, 'Submission successful', resultData);

  } catch (error) {
    Logger.log('ERROR in doPost: ' + error.toString());
    Logger.log('Error stack: ' + error.stack);
    console.error('Error:', error);
    return createResponse(500, 'Internal server error: ' + error.message);
  } finally {
    lock.releaseLock();
    Logger.log('Lock released');
    Logger.log('=== doPost COMPLETED ===');
  }
}

// Process photos with OpenRouter/Gemini 2.5 Flash in PARALLEL
function processPhotosWithAI(platePhotoBase64, invoicePhotosBase64) {
  try {
    // 1. Prepare all requests
    const requests = [];
    
    // Plate Request
    const platePrompt = `
      Analyze this image of a vehicle number plate (back of vehicle).
      Task:
      1. Identify and extract ONLY the vehicle number/registration number
      2. This is the back of a vehicle, so the only detectable text will be the number plate
      3. Return the vehicle number in uppercase letters and numbers only
      4. Provide a confidence score (0-1) for your extraction
      
      Return JSON: {"number": "ABC-1234", "confidence": 0.95}
      If not found: {"number": "", "confidence": 0}
    `;
    requests.push(buildOpenRouterRequest(platePhotoBase64, platePrompt));

    // Invoice Requests
    invoicePhotosBase64.forEach(photo => {
      const invoicePrompt = `
        Analyze this invoice document image.
        Task:
        1. Find and extract ALL invoice numbers (starting with "INV")
        2. Extract the complete number including digits/letters
        3. Provide a confidence score (0-1)
        
        Return JSON: {"numbers": ["INV-001"], "confidence": 0.92}
        If not found: {"numbers": [], "confidence": 0}
      `;
      requests.push(buildOpenRouterRequest(photo, invoicePrompt));
    });

    // 2. Execute all requests in parallel
    Logger.log(`Executing ${requests.length} AI requests in parallel...`);
    const responses = UrlFetchApp.fetchAll(requests);
    Logger.log('All parallel requests completed.');

    // 3. Process Plate Result (First response)
    const plateResponse = responses[0];
    const plateResult = parseAIResponse(plateResponse.getContentText());
    
    // 4. Process Invoice Results (Remaining responses)
    const invoiceResponses = responses.slice(1);
    const allInvoiceNumbers = [];
    let totalInvoiceConfidence = 0;

    invoiceResponses.forEach(res => {
      const result = parseAIResponse(res.getContentText());
      if (result.numbers) allInvoiceNumbers.push(...result.numbers);
      if (result.confidence) totalInvoiceConfidence += result.confidence;
    });

    // Calculate aggregated invoice stats
    const uniqueInvoiceNumbers = [...new Set(allInvoiceNumbers)];
    const avgInvoiceConfidence = invoiceResponses.length > 0 
      ? totalInvoiceConfidence / invoiceResponses.length 
      : 0;

    return {
      vehicleNumber: plateResult.number,
      vehicleNumberConfidence: plateResult.confidence,
      invoiceNumbers: uniqueInvoiceNumbers,
      invoiceNumbersConfidence: avgInvoiceConfidence
    };

  } catch (error) {
    console.error('AI Processing error:', error);
    throw new Error('Failed to process photos with AI: ' + error.message);
  }
}

// Build request object for UrlFetchApp
function buildOpenRouterRequest(photoBase64, prompt) {
  const url = 'https://openrouter.ai/api/v1/chat/completions';
  
  const payload = {
    model: CONFIG.OPENROUTER_MODEL,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: photoBase64 } }
        ]
      }
    ],
    max_tokens: 500,
    temperature: 0.1,
    response_format: { type: 'json_object' }
  };
  
  return {
    url: url,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CONFIG.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://vehicle-exit-tracker.netlify.app',
      'X-Title': 'Vehicle Exit Tracker'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
}

// Parse AI response
function parseAIResponse(responseString) {
  try {
    const jsonResponse = JSON.parse(responseString);
    // If it's the raw OpenRouter response, extract content
    if (jsonResponse.choices && jsonResponse.choices[0]) {
      const content = jsonResponse.choices[0].message.content;
      return JSON.parse(content);
    }
    // Otherwise assume it's already the inner content (legacy check)
    return jsonResponse;
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    return {
      number: '',
      numbers: [],
      confidence: 0
    };
  }
}

// Validate extraction results
function validateExtraction(aiResult) {
  const status = {
    status: 'Success',
    error: ''
  };
  
  // Check vehicle number
  if (!aiResult.vehicleNumber || aiResult.vehicleNumberConfidence < CONFIG.MIN_CONFIDENCE_SCORE) {
    status.status = 'Partial';
    status.error += 'Low confidence in vehicle number extraction. ';
  }
  
  // Check invoice numbers
  if (!aiResult.invoiceNumbers || aiResult.invoiceNumbers.length === 0 || 
      aiResult.invoiceNumbersConfidence < CONFIG.MIN_CONFIDENCE_SCORE) {
    status.status = status.status === 'Partial' ? 'Fail' : 'Partial';
    status.error += 'Low confidence in invoice number extraction. ';
  }
  
  return status;
}

// Upload base64 photo to Google Drive
function uploadPhotoToDrive(base64Data, submissionId, photoType) {
  try {
    const matches = base64Data.match(/^data:(.+);base64,(.+)$/);
    const mimeType = matches[1];
    const data = Utilities.base64Decode(matches[2]);
    
    const timestamp = new Date().getTime();
    const fileName = `${photoType}_${submissionId}_${timestamp}.jpg`;
    
    const blob = Utilities.newBlob(data, mimeType, fileName);
    
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
    data.numberPlatePhotoUrl,
    data.invoicePhotosUrls,
    data.vehicleNumber,
    data.invoiceNumbers,
    data.vehicleNumberConfidence,
    data.invoiceNumbersConfidence,
    data.location,
    data.deviceInfo,
    data.captureTime,
    data.submissionId,
    data.aiProcessingTime,
    data.validationStatus,
    data.errorMessage,
    data.manualOverride
  ];
  
  sheet.appendRow(rowData);
}

// Create HTTP response with proper CORS handling
function createResponse(statusCode, message, data = {}) {
  const output = ContentService
    .createTextOutput(JSON.stringify({
      status: statusCode,
      message: message,
      data: data
    }))
    .setMimeType(ContentService.MimeType.JSON);
  
  // Google Apps Script requires this specific approach for CORS
  return output;
}

// CORS handling for OPTIONS preflight requests
function doOptions(e) {
  const output = ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.JSON);
  
  return output;
}

// CORS handling for GET requests (with JSONP support for file:// origins)
function doGet(e) {
  // Get callback name for JSONP (if provided)
  const callback = e.parameter.callback;
  
  // Check if this is a request to retrieve AI results
  const submissionId = e.parameter.submissionId;
  
  if (submissionId) {
    Logger.log('=== doGet STARTED (Result Retrieval) ===');
    Logger.log('Retrieving AI result for submissionId: ' + submissionId);
    Logger.log('JSONP callback: ' + (callback || 'none'));
    
    const resultKey = 'aiResult_' + submissionId;
    const resultData = PropertiesService.getScriptProperties().getProperty(resultKey);
    
    if (resultData) {
      Logger.log('AI result found');
      
      // If JSONP callback is provided, wrap response in callback function
      if (callback) {
        Logger.log('Returning JSONP response');
        return ContentService
          .createTextOutput(callback + '(' + resultData + ')')
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
      }
      
      // Standard JSON response
      return ContentService
        .createTextOutput(resultData)
        .setMimeType(ContentService.MimeType.JSON);
    } else {
      Logger.log('AI result not found');
      const errorResponse = JSON.stringify({
        status: 404,
        message: 'Result not found. The submission may still be processing.'
      });
      
      // If JSONP callback is provided, wrap error in callback function
      if (callback) {
        return ContentService
          .createTextOutput(callback + '(' + errorResponse + ')')
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
      }
      
      return ContentService
        .createTextOutput(errorResponse)
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  // Default response
  const defaultResponse = JSON.stringify({
    status: 200,
    message: 'AI-Powered Vehicle Exit Tracker API is running'
  });
  
  // If JSONP callback is provided, wrap default response
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + defaultResponse + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  
  return ContentService
    .createTextOutput(defaultResponse)
    .setMimeType(ContentService.MimeType.JSON);
}
