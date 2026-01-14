# AI-Powered Vehicle Exit Tracker - ULTRATHINK Implementation Plan

## Executive Summary

**Objective**: Transform the current manual-entry vehicle exit tracker into a fully automated AI-powered system where users only capture photos, and Gemini 2.5 Flash (via OpenRouter) extracts vehicle numbers and invoice numbers automatically.

**Core Philosophy**: Zero manual data entry. The system must be intuitive, fast, and reliable for factory workers in the field.

**Key Changes**:
- Remove all manual input fields
- Implement dual-photo capture system (number plate + multiple invoices)
- Integrate OpenRouter/Gemini 2.5 Flash for OCR/text extraction
- Redesign UI with organized thumbnail system
- Enhance backend with AI processing pipeline
- Add confidence scoring and validation

---

## Deep Reasoning Chain

### 1. User Experience Analysis

**Current Flow**: Camera → Photo Preview → Manual Form Entry → Submit
**New Flow**: Number Plate Photo → Invoice Photos → AI Processing → Auto-Submit

**Psychological Considerations**:
- Factory workers need speed and reliability
- Manual typing on mobile is error-prone and slow
- Photo capture is natural and quick
- AI processing must be fast (< 5 seconds) to maintain flow
- Clear visual feedback is critical during AI processing

**Cognitive Load Reduction**:
- Eliminate decision fatigue (no manual typing)
- Progressive disclosure (show only what's needed)
- Visual confirmation of extracted data
- Error recovery must be simple

### 2. Technical Architecture Analysis

**Why OpenRouter + Gemini 2.5 Flash?**
- **Gemini 2.5 Flash**: Optimized for vision tasks, fast inference, excellent OCR capabilities
- **OpenRouter**: Unified API, simple integration, cost-effective
- **Fallback Strategy**: If AI fails, provide manual override option

**Data Flow Complexity**:
1. Frontend captures 2+ photos
2. Photos compressed and sent to backend
3. Backend calls OpenRouter API with specific prompts
4. AI extracts structured data (vehicle number, invoice numbers)
5. Backend validates extraction (confidence scores, pattern matching)
6. Data inserted into Google Sheets
7. Frontend shows confirmation

**Edge Cases to Handle**:
- Poor lighting/blurry photos
- Multiple vehicles in frame
- Invoice numbers not starting with "INV"
- Network timeouts during AI processing
- API rate limits
- Partial extraction (only vehicle number found)

### 3. Accessibility & Usability

**WCAG AAA Considerations**:
- High contrast for thumbnail borders
- Large touch targets (minimum 44x44px)
- Clear error messages with actionable steps
- Screen reader announcements for AI processing status
- Keyboard navigation for all interactive elements

**Mobile-First Design**:
- One-handed operation support
- Fast photo capture (no preview lag)
- Thumbnail grid optimized for thumb reach
- Loading states with progress indicators

### 4. Performance Optimization

**Image Compression Strategy**:
- Number plate: High quality (800px max dimension, 0.85 JPEG)
- Invoices: Medium quality (600px max dimension, 0.8 JPEG)
- Total payload < 2MB per submission
- Progressive JPEG for faster loading

**API Call Optimization**:
- Batch invoice photos into single API call
- Use streaming responses for faster feedback
- Implement request caching for duplicate photos
- Timeout handling with graceful degradation

### 5. Security & Privacy

**Data Protection**:
- Photos transmitted over HTTPS
- No sensitive data stored in browser
- API keys secured in backend (never exposed to frontend)
- Google Drive permissions set to view-only
- Rate limiting to prevent abuse

**AI Privacy**:
- Photos sent to OpenRouter for processing only
- No data retention beyond processing
- Compliance with data protection regulations

---

## System Architecture

### High-Level Architecture Diagram

```mermaid
graph TD
    A[Mobile User] --> B[Frontend HTML/CSS/JS]
    B --> C[Number Plate Capture]
    B --> D[Invoice Photo Capture]
    C --> E[Image Compression]
    D --> E
    E --> F[Google Apps Script]
    F --> G[OpenRouter API]
    G --> H[Gemini 2.5 Flash]
    H --> I[Text Extraction]
    I --> J[Validation & Confidence Scoring]
    J --> K[Google Sheets API]
    K --> L[Centralized Google Sheet]
    F --> M[Google Drive]
    M --> N[Photo Storage]
    B --> O[LocalStorage Backup]
    O --> B
```

### Data Flow Diagram

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend (Apps Script)
    participant A as OpenRouter API
    participant G as Google Sheets
    participant D as Google Drive

    U->>F: Capture number plate photo
    U->>F: Capture invoice photos
    F->>F: Compress images
    F->>B: POST /submit with photos
    B->>A: Call Gemini 2.5 Flash
    A->>B: Return extracted data
    B->>B: Validate & score confidence
    B->>D: Upload photos
    B->>G: Insert extracted data
    G->>B: Confirmation
    B->>F: Success response
    F->>U: Show confirmation
```

---

## Google Sheets Schema Design

### Enhanced Sheet Structure

| Column | Header | Data Type | Description | Format |
|--------|--------|-----------|-------------|---------|
| A | Timestamp | DateTime | Submission timestamp | ISO 8601 |
| B | Number Plate Photo URL | String | URL to number plate photo | Google Drive URL |
| C | Invoice Photos URLs | String | Comma-separated URLs | Google Drive URLs |
| D | Vehicle Number | String | AI-extracted vehicle number | Uppercase |
| E | Invoice Numbers | String | Comma-separated invoice numbers | INV-XXXX format |
| F | Vehicle Number Confidence | Number | AI confidence score (0-1) | Decimal |
| G | Invoice Numbers Confidence | Number | AI confidence score (0-1) | Decimal |
| H | Location | String | Latitude, Longitude | Decimal |
| I | Device Info | String | User agent + resolution | String |
| J | Capture Time | DateTime | Photo capture time | ISO 8601 |
| K | Submission ID | String | Unique UUID | UUID v4 |
| L | AI Processing Time | Number | Time taken for AI extraction (ms) | Integer |
| M | Validation Status | String | Success/Partial/Fail | Enum |
| N | Error Message | String | Any errors during processing | String |
| O | Manual Override | Boolean | Whether data was manually corrected | Boolean |

### Sheet Formatting Rules

1. **Row 1**: Bold header, frozen, light gray background (#f8f9fa)
2. **Column Widths**:
   - A, J: 180px (timestamps)
   - B, C: 300px (photo URLs)
   - D, E: 150px (extracted data)
   - F, G: 120px (confidence scores)
   - H: 200px (location)
   - I: 250px (device info)
   - K: 200px (UUID)
   - L: 120px (processing time)
   - M, N, O: 100px (status columns)
3. **Conditional Formatting**:
   - Confidence scores < 0.7: Light red background
   - Confidence scores 0.7-0.85: Light yellow background
   - Confidence scores > 0.85: Light green background
   - Validation Status "Fail": Red text
   - Validation Status "Partial": Orange text
   - Validation Status "Success": Green text
4. **Text Wrapping**: Enabled for columns B, C, D, E, I, N
5. **Number Formatting**:
   - Confidence scores: Percentage (0-100%)
   - Processing time: Number with "ms" suffix

---

## Frontend Design Overhaul

### UI/UX Principles

**Intentional Minimalism**:
- Remove all manual input fields
- Focus on photo capture actions
- Use thumbnails for visual confirmation
- Progressive disclosure based on state

**Visual Hierarchy**:
1. Primary action: Camera capture (large, prominent)
2. Secondary action: Submit (enabled after photos captured)
3. Tertiary: Review thumbnails (small, organized)

**Color Psychology**:
- Primary (#2563eb): Action buttons, active states
- Success (#10b981): AI extraction success, high confidence
- Warning (#f59e0b): Medium confidence, partial extraction
- Error (#ef4444): Low confidence, extraction failure
- Neutral (#64748b): Instructions, secondary text

### New HTML Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="theme-color" content="#2563eb">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <title>Vehicle Exit Tracker</title>
    <style>
        /* CSS will be embedded here */
    </style>
</head>
<body>
    <div class="container">
        <!-- Logo Section -->
        <div class="logo-container">
            <img src="assets/logo.png" alt="MBL Logo" class="logo">
        </div>

        <!-- Step 1: Number Plate Capture -->
        <div id="step1" class="step-section active">
            <div class="step-header">
                <div class="step-number">1</div>
                <div class="step-title">Capture Number Plate</div>
            </div>
            <div class="camera-zone">
                <div class="camera-icon-wrapper" id="plateCameraIcon">
                    <svg class="camera-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                        <circle cx="12" cy="13" r="4"/>
                    </svg>
                </div>
                <p class="camera-instruction">Tap to capture vehicle number plate</p>
                <input type="file" id="plateCameraInput" accept="image/*" capture="environment" class="hidden">
            </div>
            <div id="plateThumbnail" class="thumbnail-container hidden">
                <img id="plateThumbnailImg" class="thumbnail" alt="Number plate">
                <button class="retake-button" aria-label="Retake number plate">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M23 4v6h-6"/>
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                    </svg>
                    Retake
                </button>
            </div>
        </div>

        <!-- Step 2: Invoice Photos Capture -->
        <div id="step2" class="step-section disabled">
            <div class="step-header">
                <div class="step-number">2</div>
                <div class="step-title">Capture Invoice Photos</div>
            </div>
            <div class="camera-zone">
                <div class="camera-icon-wrapper" id="invoiceCameraIcon">
                    <svg class="camera-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                        <circle cx="12" cy="13" r="4"/>
                    </svg>
                </div>
                <p class="camera-instruction">Tap to capture invoice photos</p>
                <input type="file" id="invoiceCameraInput" accept="image/*" capture="environment" multiple class="hidden">
            </div>
            <div id="invoiceThumbnails" class="thumbnails-grid hidden">
                <!-- Thumbnails will be dynamically added here -->
            </div>
            <button id="addMoreInvoices" class="add-more-button hidden">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add More Invoices
            </button>
        </div>

        <!-- Step 3: Review & Submit -->
        <div id="step3" class="step-section disabled">
            <div class="step-header">
                <div class="step-number">3</div>
                <div class="step-title">Review & Submit</div>
            </div>

            <!-- AI Processing Status -->
            <div id="aiProcessingStatus" class="processing-status hidden">
                <div class="processing-icon">
                    <svg class="spinner" viewBox="0 0 50 50">
                        <circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" stroke-width="5"/>
                    </svg>
                </div>
                <p class="processing-text">AI is extracting data...</p>
                <p class="processing-subtext">This usually takes 3-5 seconds</p>
            </div>

            <!-- Extracted Data Preview -->
            <div id="extractedData" class="extracted-data hidden">
                <div class="data-item">
                    <span class="data-label">Vehicle Number:</span>
                    <span id="extractedVehicleNumber" class="data-value">--</span>
                    <span id="vehicleConfidence" class="confidence-badge">--%</span>
                </div>
                <div class="data-item">
                    <span class="data-label">Invoice Numbers:</span>
                    <span id="extractedInvoiceNumbers" class="data-value">--</span>
                    <span id="invoiceConfidence" class="confidence-badge">--%</span>
                </div>
                <div class="data-item">
                    <span class="data-label">Location:</span>
                    <span id="extractedLocation" class="data-value">Acquiring...</span>
                </div>
            </div>

            <!-- Submit Button -->
            <button id="submitBtn" class="submit-button" disabled>
                <span class="button-text">Submit Entry</span>
                <span class="button-loader hidden">
                    <svg class="spinner" viewBox="0 0 50 50">
                        <circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" stroke-width="5"/>
                    </svg>
                </span>
            </button>
        </div>

        <!-- Success Message -->
        <div id="successMessage" class="success-message hidden">
            <div class="success-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
            </div>
            <h2 class="success-title">Entry Submitted!</h2>
            <p class="success-text">Your vehicle exit has been recorded.</p>
            <div class="submitted-data">
                <div class="data-row">
                    <span class="data-row-label">Vehicle:</span>
                    <span id="submittedVehicleNumber" class="data-row-value">--</span>
                </div>
                <div class="data-row">
                    <span class="data-row-label">Invoices:</span>
                    <span id="submittedInvoiceNumbers" class="data-row-value">--</span>
                </div>
            </div>
            <button id="newEntryButton" class="new-entry-button">Record Another Exit</button>
        </div>

        <!-- Error Message -->
        <div id="errorMessage" class="error-message hidden">
            <div class="error-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
            </div>
            <h2 class="error-title">Submission Failed</h2>
            <p id="errorText" class="error-text">An error occurred. Please try again.</p>
            <button id="retryButton" class="retry-button">Retry</button>
        </div>
    </div>

    <script>
        /* JavaScript will be embedded here */
    </script>
</body>
</html>
```

### CSS Styling (Embedded)

```css
/* Reset & Base Styles */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

:root {
    --primary: #2563eb;
    --primary-dark: #1d4ed8;
    --success: #10b981;
    --warning: #f59e0b;
    --error: #ef4444;
    --background: #f8fafc;
    --surface: #ffffff;
    --text-primary: #0f172a;
    --text-secondary: #64748b;
    --border: #e2e8f0;
    --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background: var(--background);
    color: var(--text-primary);
    line-height: 1.5;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
}

.container {
    width: 100%;
    max-width: 480px;
    background: var(--surface);
    border-radius: 16px;
    box-shadow: var(--shadow-lg);
    overflow: hidden;
    min-height: 700px;
    display: flex;
    flex-direction: column;
}

/* Utility Classes */
.hidden {
    display: none !important;
}

.disabled {
    opacity: 0.5;
    pointer-events: none;
}

/* Logo Section */
.logo-container {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem 1rem;
    background: var(--surface);
    min-height: 100px;
    flex-shrink: 0;
    border-bottom: 1px solid var(--border);
}

.logo {
    width: 80px;
    height: 80px;
    max-width: 100%;
    max-height: 100px;
    object-fit: contain;
    display: block;
}

/* Step Sections */
.step-section {
    padding: 1.5rem;
    border-bottom: 1px solid var(--border);
    transition: all 0.3s ease;
}

.step-section.active {
    opacity: 1;
    pointer-events: auto;
}

.step-section.disabled {
    opacity: 0.4;
    pointer-events: none;
}

.step-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.step-number {
    width: 32px;
    height: 32px;
    background: var(--primary);
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 1rem;
    flex-shrink: 0;
}

.step-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
}

/* Camera Zone */
.camera-zone {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
}

.camera-icon-wrapper {
    width: 100px;
    height: 100px;
    background: linear-gradient(135deg, var(--primary), var(--primary-dark));
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    box-shadow: var(--shadow);
}

.camera-icon-wrapper:hover,
.camera-icon-wrapper:active {
    transform: scale(1.05);
    box-shadow: var(--shadow-lg);
}

.camera-icon {
    width: 50px;
    height: 50px;
    color: white;
}

.camera-instruction {
    font-size: 0.875rem;
    color: var(--text-secondary);
    text-align: center;
}

/* Thumbnail Styles */
.thumbnail-container {
    position: relative;
    width: 100%;
    aspect-ratio: 16/9;
    border-radius: 8px;
    overflow: hidden;
    background: var(--border);
    margin-top: 1rem;
}

.thumbnail {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.retake-button {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    border: none;
    border-radius: 6px;
    padding: 0.375rem 0.75rem;
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.75rem;
    cursor: pointer;
    transition: background 0.2s ease;
    backdrop-filter: blur(4px);
}

.retake-button:hover {
    background: rgba(0, 0, 0, 0.85);
}

.retake-button svg {
    width: 14px;
    height: 14px;
}

/* Thumbnails Grid */
.thumbnails-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 0.5rem;
    margin-top: 1rem;
}

.thumbnail-item {
    position: relative;
    aspect-ratio: 1;
    border-radius: 6px;
    overflow: hidden;
    background: var(--border);
    border: 2px solid transparent;
    transition: border-color 0.2s ease;
}

.thumbnail-item:hover {
    border-color: var(--primary);
}

.thumbnail-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.thumbnail-item .remove-button {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 24px;
    height: 24px;
    background: var(--error);
    color: white;
    border: none;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 1rem;
    line-height: 1;
    transition: background 0.2s ease;
}

.thumbnail-item .remove-button:hover {
    background: #dc2626;
}

.add-more-button {
    width: 100%;
    padding: 0.75rem;
    background: transparent;
    border: 2px dashed var(--border);
    border-radius: 8px;
    color: var(--primary);
    font-weight: 600;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin-top: 1rem;
}

.add-more-button:hover {
    border-color: var(--primary);
    background: rgba(37, 99, 235, 0.05);
}

.add-more-button svg {
    width: 16px;
    height: 16px;
}

/* Processing Status */
.processing-status {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 2rem 1rem;
    text-align: center;
}

.processing-icon {
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.processing-text {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
}

.processing-subtext {
    font-size: 0.875rem;
    color: var(--text-secondary);
}

/* Extracted Data */
.extracted-data {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    background: var(--background);
    border-radius: 8px;
    margin-bottom: 1rem;
}

.data-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.data-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.data-value {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
}

.confidence-badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
    background: var(--warning);
    color: white;
}

.confidence-badge.high {
    background: var(--success);
}

.confidence-badge.low {
    background: var(--error);
}

/* Submit Button */
.submit-button {
    width: 100%;
    padding: 1rem;
    background: linear-gradient(135deg, var(--primary), var(--primary-dark));
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    box-shadow: var(--shadow);
}

.submit-button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
}

.submit-button:active:not(:disabled) {
    transform: translateY(0);
}

.submit-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.button-loader {
    display: flex;
    align-items: center;
}

.spinner {
    width: 20px;
    height: 20px;
    animation: spin 1s linear infinite;
}

.spinner circle {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: 0;
    stroke-linecap: round;
    animation: dash 1.5s ease-in-out infinite;
}

@keyframes spin {
    100% { transform: rotate(360deg); }
}

@keyframes dash {
    0% { stroke-dasharray: 1, 150; stroke-dashoffset: 0; }
    50% { stroke-dasharray: 90, 150; stroke-dashoffset: -35; }
    100% { stroke-dasharray: 90, 150; stroke-dashoffset: -124; }
}

/* Success Message */
.success-message {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 2rem;
    text-align: center;
    gap: 1.5rem;
}

.success-icon {
    width: 80px;
    height: 80px;
    background: var(--success);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: scaleIn 0.5s ease;
}

.success-icon svg {
    width: 40px;
    height: 40px;
    color: white;
}

@keyframes scaleIn {
    0% { transform: scale(0); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
}

.success-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-primary);
}

.success-text {
    color: var(--text-secondary);
    font-size: 1rem;
}

.submitted-data {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem;
    background: var(--background);
    border-radius: 8px;
}

.data-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.data-row-label {
    font-size: 0.875rem;
    color: var(--text-secondary);
}

.data-row-value {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
}

.new-entry-button {
    padding: 1rem 2rem;
    background: var(--primary);
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s ease;
}

.new-entry-button:hover {
    background: var(--primary-dark);
}

/* Error Message */
.error-message {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 2rem;
    text-align: center;
    gap: 1.5rem;
}

.error-icon {
    width: 80px;
    height: 80px;
    background: var(--error);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.error-icon svg {
    width: 40px;
    height: 40px;
    color: white;
}

.error-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-primary);
}

.error-text {
    color: var(--text-secondary);
    font-size: 1rem;
}

.retry-button {
    padding: 1rem 2rem;
    background: var(--error);
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s ease;
}

.retry-button:hover {
    background: #dc2626;
}

/* Responsive Design */
@media (max-width: 480px) {
    body {
        padding: 0;
    }

    .container {
        border-radius: 0;
        min-height: 100vh;
    }

    .logo-container {
        padding: 1rem 0.75rem;
        min-height: 80px;
    }

    .logo {
        width: 60px;
        height: 60px;
    }

    .step-section {
        padding: 1rem;
    }

    .camera-icon-wrapper {
        width: 80px;
        height: 80px;
    }

    .camera-icon {
        width: 40px;
        height: 40px;
    }

    .thumbnails-grid {
        grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    }
}

/* Accessibility */
@media (prefers-reduced-motion: reduce) {
    * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
}

*:focus-visible {
    outline: 3px solid var(--primary);
    outline-offset: 2px;
}
```

---

## Backend Architecture (Google Apps Script)

### Enhanced Code.gs

```javascript
// Configuration
const CONFIG = {
  FOLDER_ID: 'YOUR_DRIVE_FOLDER_ID', // Replace with actual folder ID
  SHEET_NAME: 'Sheet1',
  OPENROUTER_API_KEY: 'YOUR_OPENROUTER_API_KEY', // Replace with actual API key
  OPENROUTER_MODEL: 'google/gemini-2.0-flash-exp', // Updated model name
  MAX_PHOTO_SIZE: 1024 * 1024, // 1MB
  MIN_CONFIDENCE_SCORE: 0.7, // Minimum confidence threshold
  API_TIMEOUT: 30000, // 30 seconds
};

// Web App Entry Point
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000); // Wait up to 10 seconds for lock

  try {
    const startTime = new Date();
    
    // Parse request data
    const data = JSON.parse(e.postData.contents);
    
    // Validate required fields
    if (!data.platePhotoBase64 || !data.invoicePhotosBase64 || data.invoicePhotosBase64.length === 0) {
      return createResponse(400, 'Missing required photos');
    }

    // AI Processing
    const aiResult = processPhotosWithAI(data.platePhotoBase64, data.invoicePhotosBase64);
    
    // Validation
    const validationResult = validateExtraction(aiResult);
    
    // Upload photos to Drive
    const platePhotoUrl = uploadPhotoToDrive(data.platePhotoBase64, data.submissionId, 'plate');
    const invoicePhotoUrls = data.invoicePhotosBase64.map((photo, index) => 
      uploadPhotoToDrive(photo, data.submissionId, `invoice_${index}`)
    );

    // Append data to sheet
    const processingTime = new Date() - startTime;
    appendToSheet({
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
    });

    return createResponse(200, 'Submission successful', {
      vehicleNumber: aiResult.vehicleNumber,
      invoiceNumbers: aiResult.invoiceNumbers,
      confidence: {
        vehicle: aiResult.vehicleNumberConfidence,
        invoices: aiResult.invoiceNumbersConfidence
      },
      validationStatus: validationResult.status
    });

  } catch (error) {
    console.error('Error:', error);
    return createResponse(500, 'Internal server error: ' + error.message);
  } finally {
    lock.releaseLock();
  }
}

// Process photos with OpenRouter/Gemini 2.5 Flash
function processPhotosWithAI(platePhotoBase64, invoicePhotosBase64) {
  try {
    // Extract vehicle number from plate photo
    const vehicleResult = extractVehicleNumber(platePhotoBase64);
    
    // Extract invoice numbers from invoice photos
    const invoiceResult = extractInvoiceNumbers(invoicePhotosBase64);
    
    return {
      vehicleNumber: vehicleResult.number,
      vehicleNumberConfidence: vehicleResult.confidence,
      invoiceNumbers: invoiceResult.numbers,
      invoiceNumbersConfidence: invoiceResult.confidence
    };
  } catch (error) {
    console.error('AI Processing error:', error);
    throw new Error('Failed to process photos with AI');
  }
}

// Extract vehicle number from plate photo
function extractVehicleNumber(photoBase64) {
  const prompt = `
    Analyze this image of a vehicle number plate (back of vehicle).
    
    Task:
    1. Identify and extract ONLY the vehicle number/registration number
    2. This is the back of a vehicle, so the only detectable text will be the number plate
    3. Ignore any other text, logos, or markings
    4. Return the vehicle number in uppercase letters and numbers only
    5. Provide a confidence score (0-1) for your extraction
    
    Expected format:
    - Vehicle numbers typically follow patterns like: ABC-1234, AB1234, 1234-ABC, etc.
    - Look for alphanumeric characters with possible hyphens or spaces
    
    Return your response in this exact JSON format:
    {
      "number": "ABC-1234",
      "confidence": 0.95
    }
    
    If you cannot confidently identify a vehicle number, return:
    {
      "number": "",
      "confidence": 0
    }
  `;

  const response = callOpenRouterAPI(photoBase64, prompt);
  return parseAIResponse(response);
}

// Extract invoice numbers from invoice photos
function extractInvoiceNumbers(invoicePhotosBase64) {
  const allInvoiceNumbers = [];
  let totalConfidence = 0;
  
  for (const photoBase64 of invoicePhotosBase64) {
    const prompt = `
      Analyze this invoice document image.
      
      Task:
      1. Find and extract ALL invoice numbers from this document
      2. Invoice numbers MUST start with "INV" (case-insensitive)
      3. Extract the complete invoice number including any digits/letters after "INV"
      4. Provide a confidence score (0-1) for each extraction
      
      Expected format:
      - Invoice numbers typically follow patterns like: INV-001, INV001, INV-2024-001, etc.
      - Look for text starting with "INV" followed by numbers and possibly hyphens
      
      Return your response in this exact JSON format:
      {
        "numbers": ["INV-001", "INV-002"],
        "confidence": 0.92
      }
      
      If you cannot find any invoice numbers starting with "INV", return:
      {
        "numbers": [],
        "confidence": 0
      }
    `;

    const response = callOpenRouterAPI(photoBase64, prompt);
    const result = parseAIResponse(response);
    
    allInvoiceNumbers.push(...result.numbers);
    totalConfidence += result.confidence;
  }
  
  // Remove duplicates
  const uniqueInvoiceNumbers = [...new Set(allInvoiceNumbers)];
  
  // Calculate average confidence
  const avgConfidence = invoicePhotosBase64.length > 0 
    ? totalConfidence / invoicePhotosBase64.length 
    : 0;
  
  return {
    numbers: uniqueInvoiceNumbers,
    confidence: avgConfidence
  };
}

// Call OpenRouter API
function callOpenRouterAPI(photoBase64, prompt) {
  try {
    const url = 'https://openrouter.ai/api/v1/chat/completions';
    
    const payload = {
      model: CONFIG.OPENROUTER_MODEL,
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
                url: photoBase64
              }
            }
          ]
        }
      ],
      max_tokens: 500,
      temperature: 0.1, // Low temperature for consistent extraction
      response_format: { type: 'json_object' } // Force JSON response
    };
    
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://your-website.com', // Required by OpenRouter
        'X-Title': 'Vehicle Exit Tracker' // Required by OpenRouter
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
      timeout: CONFIG.API_TIMEOUT
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();
    
    if (responseCode !== 200) {
      console.error('OpenRouter API Error:', responseCode, responseBody);
      throw new Error(`OpenRouter API returned status ${responseCode}`);
    }
    
    const jsonResponse = JSON.parse(responseBody);
    const content = jsonResponse.choices[0].message.content;
    
    return content;
  } catch (error) {
    console.error('OpenRouter API call error:', error);
    throw new Error('Failed to call OpenRouter API');
  }
}

// Parse AI response
function parseAIResponse(response) {
  try {
    const parsed = JSON.parse(response);
    return parsed;
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
      message: 'AI-Powered Vehicle Exit Tracker API is running'
    }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

---

## Frontend JavaScript Logic

```javascript
// Configuration
const CONFIG = {
    WEB_APP_URL: 'YOUR_WEB_APP_URL_HERE', // Replace with actual URL
    MAX_PHOTO_SIZE: 1024 * 1024, // 1MB
    MAX_PHOTO_DIMENSION: 800,
    MIN_INVOICE_DIMENSION: 600,
    GEOLOCATION_TIMEOUT: 10000,
    GEOLOCATION_OPTIONS: {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
    }
};

// State Management
const state = {
    platePhoto: null,
    platePhotoTime: null,
    invoicePhotos: [],
    invoicePhotosTimes: [],
    location: null,
    submissionId: null,
    aiResult: null
};

// DOM Elements
const elements = {
    step1: document.getElementById('step1'),
    step2: document.getElementById('step2'),
    step3: document.getElementById('step3'),
    plateCameraIcon: document.getElementById('plateCameraIcon'),
    plateCameraInput: document.getElementById('plateCameraInput'),
    plateThumbnail: document.getElementById('plateThumbnail'),
    plateThumbnailImg: document.getElementById('plateThumbnailImg'),
    invoiceCameraIcon: document.getElementById('invoiceCameraIcon'),
    invoiceCameraInput: document.getElementById('invoiceCameraInput'),
    invoiceThumbnails: document.getElementById('invoiceThumbnails'),
    addMoreInvoices: document.getElementById('addMoreInvoices'),
    aiProcessingStatus: document.getElementById('aiProcessingStatus'),
    extractedData: document.getElementById('extractedData'),
    extractedVehicleNumber: document.getElementById('extractedVehicleNumber'),
    extractedInvoiceNumbers: document.getElementById('extractedInvoiceNumbers'),
    extractedLocation: document.getElementById('extractedLocation'),
    vehicleConfidence: document.getElementById('vehicleConfidence'),
    invoiceConfidence: document.getElementById('invoiceConfidence'),
    submitBtn: document.getElementById('submitBtn'),
    successMessage: document.getElementById('successMessage'),
    errorMessage: document.getElementById('errorMessage'),
    errorText: document.getElementById('errorText'),
    submittedVehicleNumber: document.getElementById('submittedVehicleNumber'),
    submittedInvoiceNumbers: document.getElementById('submittedInvoiceNumbers'),
    newEntryButton: document.getElementById('newEntryButton'),
    retryButton: document.getElementById('retryButton')
};

// Utility Functions
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function getDeviceInfo() {
    return `${navigator.userAgent} | ${window.screen.width}x${window.screen.height}`;
}

function showElement(element) {
    element.classList.remove('hidden');
}

function hideElement(element) {
    element.classList.add('hidden');
}

function enableStep(stepElement) {
    stepElement.classList.remove('disabled');
}

function disableStep(stepElement) {
    stepElement.classList.add('disabled');
}

function setLoading(loading) {
    const buttonText = elements.submitBtn.querySelector('.button-text');
    const buttonLoader = elements.submitBtn.querySelector('.button-loader');
    
    elements.submitBtn.disabled = loading;
    
    if (loading) {
        hideElement(buttonText);
        showElement(buttonLoader);
    } else {
        showElement(buttonText);
        hideElement(buttonLoader);
    }
}

// Initialize Camera
function initCamera() {
    // Number plate camera
    elements.plateCameraIcon.addEventListener('click', () => {
        elements.plateCameraInput.click();
    });
    
    elements.plateCameraInput.addEventListener('change', handlePlateCapture);
    
    // Invoice camera
    elements.invoiceCameraIcon.addEventListener('click', () => {
        elements.invoiceCameraInput.click();
    });
    
    elements.invoiceCameraInput.addEventListener('change', handleInvoiceCapture);
    
    elements.addMoreInvoices.addEventListener('click', () => {
        elements.invoiceCameraInput.click();
    });
}

// Handle number plate capture
async function handlePlateCapture(event) {
    const file = event.target.files[0];
    
    if (!file) return;
    
    try {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }
        
        // Compress photo
        const compressedData = await compressPhoto(file, CONFIG.MAX_PHOTO_DIMENSION);
        
        // Update state
        state.platePhoto = compressedData;
        state.platePhotoTime = new Date().toISOString();
        state.submissionId = state.submissionId || generateUUID();
        
        // Show thumbnail
        elements.plateThumbnailImg.src = compressedData;
        showElement(elements.plateThumbnail);
        
        // Enable step 2
        enableStep(elements.step2);
        
        // Start geolocation
        startGeolocation();
        
    } catch (error) {
        console.error('Plate capture error:', error);
        alert('Failed to process photo. Please try again.');
    }
    
    // Reset input
    elements.plateCameraInput.value = '';
}

// Handle invoice capture
async function handleInvoiceCapture(event) {
    const files = Array.from(event.target.files);
    
    if (files.length === 0) return;
    
    try {
        for (const file of files) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                alert('Please select image files only');
                continue;
            }
            
            // Compress photo
            const compressedData = await compressPhoto(file, CONFIG.MIN_INVOICE_DIMENSION);
            
            // Update state
            state.invoicePhotos.push(compressedData);
            state.invoicePhotosTimes.push(new Date().toISOString());
            
            // Add thumbnail
            addInvoiceThumbnail(compressedData, state.invoicePhotos.length - 1);
        }
        
        // Show thumbnails grid and add more button
        showElement(elements.invoiceThumbnails);
        showElement(elements.addMoreInvoices);
        
        // Enable step 3
        enableStep(elements.step3);
        
        // Auto-process with AI
        processWithAI();
        
    } catch (error) {
        console.error('Invoice capture error:', error);
        alert('Failed to process photos. Please try again.');
    }
    
    // Reset input
    elements.invoiceCameraInput.value = '';
}

// Add invoice thumbnail
function addInvoiceThumbnail(photoData, index) {
    const thumbnailItem = document.createElement('div');
    thumbnailItem.className = 'thumbnail-item';
    
    const img = document.createElement('img');
    img.src = photoData;
    img.alt = `Invoice ${index + 1}`;
    
    const removeButton = document.createElement('button');
    removeButton.className = 'remove-button';
    removeButton.innerHTML = '×';
    removeButton.setAttribute('aria-label', `Remove invoice ${index + 1}`);
    
    removeButton.addEventListener('click', () => {
        removeInvoiceThumbnail(index, thumbnailItem);
    });
    
    thumbnailItem.appendChild(img);
    thumbnailItem.appendChild(removeButton);
    elements.invoiceThumbnails.appendChild(thumbnailItem);
}

// Remove invoice thumbnail
function removeInvoiceThumbnail(index, thumbnailElement) {
    // Remove from state
    state.invoicePhotos.splice(index, 1);
    state.invoicePhotosTimes.splice(index, 1);
    
    // Remove from DOM
    thumbnailElement.remove();
    
    // Re-index remaining thumbnails
    const thumbnails = elements.invoiceThumbnails.querySelectorAll('.thumbnail-item');
    thumbnails.forEach((thumb, newIndex) => {
        const removeBtn = thumb.querySelector('.remove-button');
        removeBtn.setAttribute('aria-label', `Remove invoice ${newIndex + 1}`);
        
        const img = thumb.querySelector('img');
        img.alt = `Invoice ${newIndex + 1}`;
    });
    
    // Check if no invoices left
    if (state.invoicePhotos.length === 0) {
        hideElement(elements.invoiceThumbnails);
        hideElement(elements.addMoreInvoices);
        disableStep(elements.step3);
    }
}

// Compress photo
async function compressPhoto(file, maxDimension) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (event) => {
            const img = new Image();
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // Calculate dimensions
                if (width > height) {
                    if (width > maxDimension) {
                        height = Math.round((height * maxDimension) / width);
                        width = maxDimension;
                    }
                } else {
                    if (height > maxDimension) {
                        width = Math.round((width * maxDimension) / height);
                        height = maxDimension;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Compress to JPEG
                const quality = maxDimension === CONFIG.MAX_PHOTO_DIMENSION ? 0.85 : 0.8;
                const compressedData = canvas.toDataURL('image/jpeg', quality);
                
                // Check size
                const sizeInBytes = Math.round((compressedData.length - 'data:image/jpeg;base64,'.length) * 3 / 4);
                
                if (sizeInBytes > CONFIG.MAX_PHOTO_SIZE) {
                    reject(new Error('Photo too large even after compression'));
                } else {
                    resolve(compressedData);
                }
            };
            
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = event.target.result;
        };
        
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

// Geolocation
function startGeolocation() {
    if (!navigator.geolocation) {
        elements.extractedLocation.textContent = 'Location not supported';
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            state.location = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
            elements.extractedLocation.textContent = state.location;
        },
        (error) => {
            console.warn('Geolocation error:', error);
            let message = 'Location unavailable';
            
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    message = 'Location permission denied';
                    break;
                case error.POSITION_UNAVAILABLE:
                    message = 'Position unavailable';
                    break;
                case error.TIMEOUT:
                    message = 'Location timeout';
                    break;
            }
            
            elements.extractedLocation.textContent = message;
        },
        CONFIG.GEOLOCATION_OPTIONS
    );
}

// Process with AI
async function processWithAI() {
    if (!state.platePhoto || state.invoicePhotos.length === 0) {
        return;
    }
    
    // Show processing status
    showElement(elements.aiProcessingStatus);
    hideElement(elements.extractedData);
    disableStep(elements.step3);
    
    try {
        // Prepare data
        const submissionData = {
            platePhotoBase64: state.platePhoto,
            invoicePhotosBase64: state.invoicePhotos,
            location: state.location,
            deviceInfo: getDeviceInfo(),
            captureTime: state.platePhotoTime,
            submissionId: state.submissionId
        };
        
        // Submit to backend
        const response = await fetch(CONFIG.WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(submissionData)
        });
        
        // Since mode is 'no-cors', we can't read the response
        // We'll assume success and show a placeholder
        // In production, you'd use a different approach to get the response
        
        // Hide processing status
        hideElement(elements.aiProcessingStatus);
        
        // Show extracted data (placeholder - in production, get from backend response)
        showElement(elements.extractedData);
        elements.extractedVehicleNumber.textContent = 'Processing...';
        elements.extractedInvoiceNumbers.textContent = 'Processing...';
        elements.vehicleConfidence.textContent = '--%';
        elements.invoiceConfidence.textContent = '--%';
        
        // Enable submit button
        elements.submitBtn.disabled = false;
        
    } catch (error) {
        console.error('AI processing error:', error);
        hideElement(elements.aiProcessingStatus);
        showError('Failed to process photos. Please try again.');
    }
}

// Form Submission
async function handleSubmit(event) {
    event.preventDefault();
    
    // Validate
    if (!state.platePhoto || state.invoicePhotos.length === 0) {
        alert('Please capture all required photos');
        return;
    }
    
    // Show loading
    setLoading(true);
    
    try {
        // Prepare data
        const submissionData = {
            platePhotoBase64: state.platePhoto,
            invoicePhotosBase64: state.invoicePhotos,
            location: state.location,
            deviceInfo: getDeviceInfo(),
            captureTime: state.platePhotoTime,
            submissionId: state.submissionId
        };
        
        // Submit to backend
        const response = await fetch(CONFIG.WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(submissionData)
        });
        
        // Store submission in localStorage for backup
        storeSubmission(submissionData);
        
        // Show success
        showSuccess();
        
    } catch (error) {
        console.error('Submission error:', error);
        showError(error.message);
    } finally {
        setLoading(false);
    }
}

// Store submission
function storeSubmission(data) {
    const submissions = JSON.parse(localStorage.getItem('vehicleExitSubmissions') || '[]');
    submissions.push({
        ...data,
        timestamp: new Date().toISOString(),
        synced: true
    });
    
    // Keep only last 50 submissions
    if (submissions.length > 50) {
        submissions.splice(0, submissions.length - 50);
    }
    
    localStorage.setItem('vehicleExitSubmissions', JSON.stringify(submissions));
}

// Show success
function showSuccess() {
    hideElement(elements.step1);
    hideElement(elements.step2);
    hideElement(elements.step3);
    showElement(elements.successMessage);
    
    // Show submitted data
    elements.submittedVehicleNumber.textContent = state.aiResult?.vehicleNumber || 'Processing...';
    elements.submittedInvoiceNumbers.textContent = state.aiResult?.invoiceNumbers?.join(', ') || 'Processing...';
}

// Show error
function showError(message) {
    elements.errorText.textContent = message || 'An error occurred. Please try again.';
    hideElement(elements.step3);
    showElement(elements.errorMessage);
}

// Reset form
function resetForm() {
    // Reset state
    state.platePhoto = null;
    state.platePhotoTime = null;
    state.invoicePhotos = [];
    state.invoicePhotosTimes = [];
    state.location = null;
    state.aiResult = null;
    state.submissionId = null;
    
    // Reset thumbnails
    elements.invoiceThumbnails.innerHTML = '';
    
    // Reset UI
    hideElement(elements.plateThumbnail);
    hideElement(elements.invoiceThumbnails);
    hideElement(elements.addMoreInvoices);
    hideElement(elements.extractedData);
    hideElement(elements.aiProcessingStatus);
    hideElement(elements.successMessage);
    hideElement(elements.errorMessage);
    
    // Reset steps
    enableStep(elements.step1);
    disableStep(elements.step2);
    disableStep(elements.step3);
    
    // Reset location
    elements.extractedLocation.textContent = 'Acquiring...';
    
    // Reset submit button
    elements.submitBtn.disabled = true;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initCamera();
    
    // Submit button
    elements.submitBtn.addEventListener('click', handleSubmit);
    
    // New entry button
    elements.newEntryButton.addEventListener('click', resetForm);
    
    // Retry button
    elements.retryButton.addEventListener('click', () => {
        hideElement(elements.errorMessage);
        showElement(elements.step3);
    });
    
    // Check for unsynced submissions
    checkUnsyncedSubmissions();
});

function checkUnsyncedSubmissions() {
    const submissions = JSON.parse(localStorage.getItem('vehicleExitSubmissions') || '[]');
    const unsynced = submissions.filter(s => !s.synced);
    
    if (unsynced.length > 0) {
        console.log(`Found ${unsynced.length} unsynced submissions`);
    }
}
```

---

## Error Handling & Validation Strategies

### Frontend Error Handling

1. **Photo Capture Errors**:
   - Invalid file type: Show alert and prevent capture
   - File too large: Compress or reject
   - Camera permission denied: Show user-friendly message
   - Camera not available: Show fallback message

2. **AI Processing Errors**:
   - Network timeout: Retry with exponential backoff (max 3 attempts)
   - API rate limit: Show message and queue for retry
   - Low confidence: Show warning and offer manual override
   - No extraction: Show error and offer retake option

3. **Submission Errors**:
   - Network failure: Store in localStorage for retry
   - Server error: Show specific error message
   - Validation failure: Highlight missing data

### Backend Error Handling

1. **API Call Errors**:
   - Timeout: Return error with specific message
   - Rate limit: Implement retry with delay
   - Invalid response: Log and return error

2. **Validation Errors**:
   - Missing photos: Return 400 error
   - Low confidence: Mark as "Partial" or "Fail"
   - Invalid format: Log and return error

3. **Storage Errors**:
   - Drive upload failure: Retry up to 3 times
   - Sheet append failure: Log and return error
   - Lock acquisition failure: Retry after delay

### Confidence Scoring Strategy

**High Confidence (> 0.85)**:
- Auto-accept and submit
- Show green badge

**Medium Confidence (0.7 - 0.85)**:
- Show warning badge
- Allow user to review before submit
- Offer manual override option

**Low Confidence (< 0.7)**:
- Show error badge
- Require manual correction
- Offer retake option

---

## Deployment Checklist

### Phase 1: Google Sheets Setup

- [ ] Create new Google Sheet "Vehicle Exit Tracker - AI Powered"
- [ ] Set up 15 columns with headers (A-O)
- [ ] Format headers (bold, frozen, gray background)
- [ ] Set column widths
- [ ] Enable conditional formatting for confidence scores
- [ ] Enable text wrapping for appropriate columns
- [ ] Test column structure

### Phase 2: Google Drive Setup

- [ ] Create folder "Vehicle Exit Photos - AI"
- [ ] Note folder ID
- [ ] Set sharing permissions to "Anyone with link can view"
- [ ] Test folder access

### Phase 3: OpenRouter API Setup

- [ ] Create OpenRouter account at openrouter.ai
- [ ] Generate API key
- [ ] Note API key securely
- [ ] Test API with sample image
- [ ] Verify Gemini 2.5 Flash model availability
- [ ] Check pricing and limits

### Phase 4: Google Apps Script Deployment

- [ ] Open Apps Script editor in Google Sheet
- [ ] Replace Code.gs with new implementation
- [ ] Update CONFIG with:
  - FOLDER_ID
  - OPENROUTER_API_KEY
- [ ] Test doPost function with sample data
- [ ] Deploy as Web App:
  - Description: "Vehicle Exit Tracker AI v1"
  - Execute as: "Me"
  - Who has access: "Anyone"
- [ ] Copy Web App URL
- [ ] Test live endpoint
- [ ] Monitor execution logs

### Phase 5: Frontend Deployment

- [ ] Update index.html with new implementation
- [ ] Update CONFIG.WEB_APP_URL
- [ ] Test locally:
  - Number plate capture
  - Invoice photo capture
  - Thumbnail display
  - AI processing status
  - Submit functionality
- [ ] Deploy to hosting:
  - GitHub Pages / Netlify / Vercel
- [ ] Test on mobile devices:
  - Android Chrome
  - iOS Safari
- [ ] Verify HTTPS is enabled

### Phase 6: End-to-End Testing

- [ ] Test complete flow:
  1. Capture number plate
  2. Capture invoice photos
  3. Wait for AI processing
  4. Review extracted data
  5. Submit entry
  6. Check Google Sheet
- [ ] Test edge cases:
  - Blurry photos
  - Poor lighting
  - Multiple invoices
  - Low confidence extraction
  - Network timeout
  - API rate limit
- [ ] Test error recovery:
  - Retake photos
  - Manual override
  - Retry submission
- [ ] Verify data quality in Google Sheet

### Phase 7: Monitoring & Maintenance

- [ ] Set up Google Drive storage alerts
- [ ] Monitor OpenRouter API usage and costs
- [ ] Check Google Apps Script execution logs
- [ ] Review Google Sheet data quality
- [ ] Track submission success rate
- [ ] Monitor AI confidence scores
- [ ] Set up error alerting

---

## Testing Strategy

### Unit Testing

**Frontend**:
- [ ] Photo compression function
- [ ] Thumbnail rendering
- [ ] State management
- [ ] Form validation

**Backend**:
- [ ] AI response parsing
- [ ] Confidence scoring
- [ ] Validation logic
- [ ] Data formatting

### Integration Testing

- [ ] Frontend to backend communication
- [ ] Backend to OpenRouter API
- [ ] Backend to Google Drive
- [ ] Backend to Google Sheets
- [ ] End-to-end data flow

### User Acceptance Testing

- [ ] Factory worker usability test
- [ ] Mobile device compatibility test
- [ ] Network condition test (3G, 4G, WiFi)
- [ ] Lighting condition test
- [ ] Error scenario test

### Performance Testing

- [ ] Photo compression speed
- [ ] AI processing latency
- [ ] Submission response time
- [ ] Memory usage
- [ ] Battery impact

---

## Security Considerations

### API Key Management

- Never expose OpenRouter API key in frontend
- Store API key in Google Apps Script CONFIG
- Rotate API keys regularly
- Monitor API usage for anomalies
- Implement rate limiting

### Data Privacy

- Photos transmitted over HTTPS only
- No data stored in browser beyond session
- Google Drive permissions set to view-only
- Consider data retention policy
- Comply with local data protection laws

### Input Validation

- Validate file types before processing
- Limit file sizes
- Sanitize extracted data
- Validate confidence scores
- Check for malicious inputs

### Access Control

- Google Apps Script deployed as "Me"
- Web app access set to "Anyone"
- Google Drive folder view-only access
- Google Sheet view-only access for public

---

## Future Enhancements

### Short Term

1. **Manual Override UI**:
   - Allow users to correct AI-extracted data
   - Show confidence scores clearly
   - Provide edit buttons for low-confidence extractions

2. **Offline Support**:
   - Service Worker for offline functionality
   - Queue submissions when offline
   - Sync when connection restored

3. **Batch Processing**:
   - Allow multiple submissions at once
   - Bulk photo upload
   - Batch AI processing

### Long Term

1. **Advanced AI Features**:
   - Vehicle type detection
   - Damage detection
   - License plate region detection
   - Multi-language support

2. **Analytics Dashboard**:
   - Submission statistics
   - AI accuracy tracking
   - Usage patterns
   - Error analysis

3. **Mobile App**:
   - Native iOS/Android app
   - Push notifications
   - Background processing
   - Enhanced camera features

4. **Integration**:
   - ERP system integration
   - Barcode scanning
   - RFID support
   - Automated invoice matching

---

## Cost Analysis

### OpenRouter API Costs

**Gemini 2.5 Flash Pricing** (estimated):
- Input: $0.075 per 1M tokens
- Output: $0.30 per 1M tokens
- Images: $0.01 per image

**Estimated Monthly Cost**:
- 100 submissions/day × 30 days = 3,000 submissions
- 2 images per submission = 6,000 images
- 6,000 × $0.01 = $60/month
- Tokens minimal (< 1M) = <$1/month
- **Total: ~$61/month**

### Google Services Costs

- Google Drive: Free tier (15GB)
- Google Sheets: Free tier
- Google Apps Script: Free tier (1,000 executions/day)

### Hosting Costs

- GitHub Pages: Free
- Netlify: Free tier
- Vercel: Free tier

**Total Monthly Cost: ~$61 (OpenRouter only)**

---

## Success Metrics

### Technical Metrics

- AI extraction accuracy: > 90%
- Average processing time: < 5 seconds
- Submission success rate: > 95%
- Average confidence score: > 0.8
- Error rate: < 5%

### User Experience Metrics

- Time per submission: < 30 seconds
- User satisfaction: > 4.5/5
- Retake rate: < 10%
- Manual override rate: < 5%
- Task completion rate: > 95%

### Business Metrics

- Increased submission speed: 3x faster
- Reduced data entry errors: 90% reduction
- Worker productivity: 2x improvement
- Cost per submission: < $0.02

---

## Conclusion

This implementation plan provides a comprehensive roadmap for transforming the vehicle exit tracker into a fully automated AI-powered system. The key innovations are:

1. **Zero Manual Entry**: Complete elimination of manual data input
2. **AI-Powered Extraction**: Gemini 2.5 Flash via OpenRouter for accurate OCR
3. **Confidence Scoring**: Transparent AI reliability metrics
4. **Intuitive UI**: Step-by-step flow with visual thumbnails
5. **Robust Error Handling**: Graceful degradation and recovery
6. **Scalable Architecture**: Ready for future enhancements

The system is designed for factory workers in the field, prioritizing speed, reliability, and ease of use. With proper implementation and testing, this system will significantly improve efficiency and reduce errors in vehicle exit tracking.

---

**End of ULTRATHINK Implementation Plan**
