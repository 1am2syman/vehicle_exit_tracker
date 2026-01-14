// Configuration
let CONFIG = {
  FOLDER_ID: '', // Will be loaded from script properties
  SHEET_NAME: 'Sheet1',
  OPENROUTER_API_KEY: '', // Will be loaded from script properties
  OPENROUTER_MODEL: 'openai/gpt-4o', // Best-in-class OCR & Reasoning
  MAX_PHOTO_SIZE: 1024 * 1024, // 1MB
  MIN_CONFIDENCE_SCORE: 0.7, // Minimum confidence threshold
  API_TIMEOUT: 30000, // 30 seconds
};

// ============================================================================
// WEB APP ENTRY POINTS
// ============================================================================

/**
 * Handle GET requests
 * - Default: Returns status/message
 * - ?action=fastOCR: WARNING - Cannot handle large payloads. Use POST instead.
 */
function doGet(e) {
  const callback = e.parameter.callback; // JSONP support
  
  // Default response
  const response = {
    status: 200,
    message: 'Vehicle Exit Tracker API is running'
  };

  return createResponse(response, callback);
}

/**
 * Handle POST requests
 * Routing:
 * 1. action='fastOCR' -> Fast Path (OpenRouter ONLY)
 * 2. action='upload'  -> Background Task (Drive + Sheet)
 * 3. Default          -> Legacy/Full Flow
 */
function doPost(e) {
  loadConfiguration();
  const lock = LockService.getScriptLock();
  
  try {
    const requestData = parseRequest(e);
    const action = requestData.action || e.parameter.action;

    Logger.log(`=== doPost Received: ${action || 'Standard'} ===`);

    if (action === 'fastOCR') {
      // FAST PATH: No Locking, Stateless, Direct API Call
      return handleFastOCR(requestData);
    } 
    
    if (action === 'upload') {
      // BACKGROUND PATH: Needs Locking for Sheet
      if (lock.tryLock(10000)) {
        try {
          return handleUploadOnly(requestData);
        } finally {
          lock.releaseLock();
        }
      } else {
        return createJSONResponse(503, 'Server busy, please try again');
      }
    }

    // LEGACY / STANDARD PATH (Full Process)
    if (lock.tryLock(10000)) {
      try {
        return handleStandardSubmission(requestData);
      } finally {
        lock.releaseLock();
      }
    } else {
      return createJSONResponse(503, 'Server busy');
    }

  } catch (error) {
    Logger.log('ERROR in doPost: ' + error.toString());
    return createJSONResponse(500, 'Internal server error: ' + error.message);
  }
}

// ============================================================================
// HANDLERS
// ============================================================================

/**
 * FAST PATH: Plate OCR Only
 * Input: { image: "base64...", type: "plate" }
 * Output: { vehicleNumber: "...", confidence: 0.99 }
 */
function handleFastOCR(data) {
  const startTime = new Date();
  Logger.log('Starting FastOCR...');
  
  if (!data.image) {
    return createJSONResponse(400, 'Missing image data');
  }

  // Define Prompt based on type
  const prompt = `
    You are an expert License Plate Recognition (LPR) system for Bangladesh.
    YOUR GOAL: Extract the vehicle registration number with 100% accuracy.
    The plate will be in either **BENGALI** or **ENGLISH** script.
    
    === INSTRUCTIONS ===
    1. **DETECT SCRIPT**:
       - If **English** (e.g., "DHAKA METRO..."), read it exactly as shown.
       - If **Bengali** (e.g., "ঢাকা মেট্রো..."), you MUST TRANSLITERATE and CONVERT NUMERALS.
    
    2. **BENGALI CONVERSION RULES**:
       - 'ঢাকা মেট্রো' -> 'DHAKA METRO', 'চট্ট মেট্রো' -> 'CHATTA METRO'
       - 'ক'->'KA', 'খ'->'KHA', 'গ'->'GA', 'ঘ'->'GHA', 'চ'->'CHA', 'ছ'->'CHHA', 'ব'->'BA', 'ম'->'MA'
       - ০=0, ১=1, ২=2, ৩=3, ৪=4, ৫=5, ৬=6, ৭=7, ৮=8, ৯=9
       - Format: "REGION-CLASS NUMBER" (e.g., 'DHAKA METRO-GA 12-3456')
    
    3. **FINAL OUTPUT**:
       - Return JSON: {"number": "DHAKA METRO-GA 12-3456", "confidence": 0.98}
       - If no plate is found: {"number": "", "confidence": 0}
  `;

  // Call OpenRouter
  const response = callOpenRouter(data.image, prompt);
  const result = parseAIResponse(response.getContentText());
  
  const processingTime = new Date() - startTime;
  Logger.log(`FastOCR Completed in ${processingTime}ms: ${result.number}`);

  return createJSONResponse(200, 'OCR Successful', {
    vehicleNumber: result.number,
    confidence: result.confidence,
    processingTime: processingTime
  });
}

/**
 * BACKGROUND PATH: Upload & Log
 * Input: { images: { plate: "...", invoices: [] }, extractedData: {...}, submissionId: "..." }
 */
function handleUploadOnly(data) {
  Logger.log('Starting Background Upload...');
  
  const { images, extractedData, submissionId, meta } = data;
  
  if (!images || !submissionId) {
    return createJSONResponse(400, 'Missing upload data');
  }

  // 1. Upload Images to Drive
  let plateUrl = 'Failed to upload';
  try {
     plateUrl = uploadPhotoToDrive(images.plate, submissionId, 'plate');
  } catch(e) {
     Logger.log("Plate upload failed: " + e.message);
  }
  
  const invoiceUrls = (images.invoices || []).map((img, idx) => {
    try {
        return uploadPhotoToDrive(img, submissionId, `invoice_${idx}`);
    } catch(e) {
        return `Failed to upload invoice ${idx}`;
    }
  });

  // 2. Append to Sheet
  const sheetData = {
    timestamp: new Date().toISOString(),
    numberPlatePhotoUrl: plateUrl,
    invoicePhotosUrls: invoiceUrls.join(', '),
    vehicleNumber: extractedData.vehicleNumber || 'N/A',
    invoiceNumbers: (extractedData.invoiceNumbers || []).join(', '),
    vehicleNumberConfidence: extractedData.confidence?.vehicle || 0,
    invoiceNumbersConfidence: extractedData.confidence?.invoices || 0,
    location: meta?.location || 'N/A',
    deviceInfo: meta?.deviceInfo || 'N/A',
    captureTime: meta?.captureTime || 'N/A',
    submissionId: submissionId,
    aiProcessingTime: meta?.processingTime || 0,
    validationStatus: extractedData.validationStatus || 'Success',
    errorMessage: '',
    manualOverride: false,
    ocrSource: extractedData.ocrSource || 'hybrid'
  };

  appendToSheet(sheetData);
  
  return createJSONResponse(200, 'Upload & Log Successful');
}

/**
 * LEGACY/FALLBACK PATH
 * Keeps original logic for backward compatibility or direct calls
 */
function handleStandardSubmission(data) {
  if (!data.platePhotoBase64) return createJSONResponse(400, "Invalid legacy request");
  
  const aiResult = processPhotosWithAI(data.platePhotoBase64, data.invoicePhotosBase64 || []);
  
  const plateUrl = uploadPhotoToDrive(data.platePhotoBase64, data.submissionId, 'plate');
  const invoiceUrls = (data.invoicePhotosBase64 || []).map((p, i) => uploadPhotoToDrive(p, data.submissionId, `invoice_${i}`));
  
  const sheetData = {
      timestamp: new Date().toISOString(),
      numberPlatePhotoUrl: plateUrl,
      invoicePhotosUrls: invoiceUrls.join(', '),
      vehicleNumber: aiResult.vehicleNumber,
      invoiceNumbers: (aiResult.invoiceNumbers || []).join(', '),
      vehicleNumberConfidence: aiResult.vehicleNumberConfidence,
      invoiceNumbersConfidence: aiResult.invoiceNumbersConfidence,
      location: data.location,
      deviceInfo: data.deviceInfo,
      captureTime: data.captureTime,
      submissionId: data.submissionId,
      aiProcessingTime: 0,
      validationStatus: validateExtraction(aiResult).status,
      errorMessage: '',
      manualOverride: false,
      ocrSource: 'legacy-ai'
  };
  
  appendToSheet(sheetData);
  
  return createJSONResponse(200, "Legacy Submission Successful", aiResult);
}


// ============================================================================
// HELPERS
// ============================================================================

/**
 * Handle OPTIONS requests for CORS Preflight
 */
function doOptions(e) {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}

function parseRequest(e) {
  if (e.postData.type === 'application/x-www-form-urlencoded') {
      return e.parameter;
  } else {
      return JSON.parse(e.postData.contents);
  }
}

function createResponse(data, callback) {
  const json = JSON.stringify(data);
  const output = callback 
    ? ContentService.createTextOutput(`${callback}(${json})`).setMimeType(ContentService.MimeType.JAVASCRIPT)
    : ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
  return output;
}

function createJSONResponse(code, message, data = null) {
  return ContentService.createTextOutput(JSON.stringify({
    status: code,
    message: message,
    data: data
  })).setMimeType(ContentService.MimeType.JSON);
}

function callOpenRouter(photoBase64, prompt) {
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
  
  return UrlFetchApp.fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CONFIG.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://vehicle-exit-tracker.netlify.app',
      'X-Title': 'Vehicle Exit Tracker'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
}

function processPhotosWithAI(platePhoto, invoicePhotos) {
    const platePrompt = `Extract vehicle number from this Bangladesh license plate. Return JSON { "number": "...", "confidence": 0.9 }`;
    const plateRes = callOpenRouter(platePhoto, platePrompt);
    const plateJson = parseAIResponse(plateRes.getContentText());
    
    return {
        vehicleNumber: plateJson.number,
        vehicleNumberConfidence: plateJson.confidence,
        invoiceNumbers: [],
        invoiceNumbersConfidence: 0
    };
}

function parseAIResponse(responseString) {
  try {
    const jsonResponse = JSON.parse(responseString);
    if (jsonResponse.choices && jsonResponse.choices[0]) {
      const content = jsonResponse.choices[0].message.content;
      return JSON.parse(content);
    }
    return jsonResponse;
  } catch (error) {
    return { number: '', confidence: 0 };
  }
}

function validateExtraction(data) {
    if (!data) return { status: 'Fail', error: 'No data' };
    const vehicleConf = data.vehicleNumberConfidence || data.confidence?.vehicle || 0;
    if (vehicleConf < CONFIG.MIN_CONFIDENCE_SCORE) return { status: 'Partial', error: 'Low Confidence' };
    return { status: 'Success', error: '' };
}

function uploadPhotoToDrive(base64Data, submissionId, photoType) {
  try {
    const matches = base64Data.match(/^data:(.+);base64,(.+)$/);
    if (!matches) throw new Error("Invalid base64");
    const mimeType = matches[1];
    const data = Utilities.base64Decode(matches[2]);
    const blob = Utilities.newBlob(data, mimeType, `${photoType}_${submissionId}_${new Date().getTime()}.jpg`);
    const folder = DriveApp.getFolderById(CONFIG.FOLDER_ID);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (e) {
    Logger.log('Upload error: ' + e.message);
    throw e;
  }
}

function appendToSheet(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  sheet.appendRow([
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
    data.manualOverride,
    data.ocrSource
  ]);
}

function loadConfiguration() {
  const props = PropertiesService.getScriptProperties();
  CONFIG.OPENROUTER_API_KEY = props.getProperty('OPENROUTER_API_KEY') || CONFIG.OPENROUTER_API_KEY;
  CONFIG.FOLDER_ID = props.getProperty('FOLDER_ID') || CONFIG.FOLDER_ID;
}

// SETUP FUNCTIONS (Keep these for user to run manually)
function setupColumns() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  const headers = ['Timestamp','Number Plate Photo URL','Invoice Photos URLs','Vehicle Number','Invoice Numbers','Vehicle Number Confidence','Invoice Numbers Confidence','Location','Device Info','Capture Time','Submission ID','AI Processing Time','Validation Status','Error Message','Manual Override','OCR Source'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  // ... basic formatting ...
  return 'Setup complete';
}

function setupAPI() {
   const ui = SpreadsheetApp.getUi();
   const response = ui.prompt('Enter OpenRouter API Key');
   if (response.getSelectedButton() == ui.Button.OK) {
     PropertiesService.getScriptProperties().setProperty('OPENROUTER_API_KEY', response.getResponseText());
   }
}

function setupImageFolder() {
   const ui = SpreadsheetApp.getUi();
   const response = ui.prompt('Enter Drive Folder ID');
   if (response.getSelectedButton() == ui.Button.OK) {
     PropertiesService.getScriptProperties().setProperty('FOLDER_ID', response.getResponseText());
   }
}
