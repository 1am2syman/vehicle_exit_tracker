# On-Device OCR Implementation Plan

> **Created:** 2026-01-14 20:42 BST  
> **Status:** Awaiting Review  
> **Objective:** Replace slow backend OCR with on-device processing + AI fallback

---

## Executive Summary

The current architecture sends images to Google Apps Script → OpenRouter (GPT-4o) → back to client. This round-trip takes **8-15 seconds** on 3G networks. 

**Proposed Solution:** Perform OCR **client-side** using Tesseract.js, display results **instantly** (~2-4 seconds locally), then:
1. If confidence ≥ 85%: Submit extracted text directly
2. If confidence < 85%: Fall back to GPT-4o for verification
3. Images still upload to Google Drive for record-keeping (in parallel)

**Expected Result:** Perceived processing time drops from **10-15s → 2-4s** for most submissions.

---

## Deep Reasoning Chain (ULTRATHINK)

### 1. Why Tesseract.js Over Alternatives?

| Library | Size | Bengali Support | Offline | WASM Acceleration | Verdict |
|---------|------|-----------------|---------|-------------------|---------|
| **Tesseract.js** | ~2MB core + traineddata | ✅ `ben` + `eng` | ✅ | ✅ | **Best fit** |
| PaddleOCR.js | ~15MB | ✅ | ✅ | ⚠️ Experimental | Overkill |
| Google MLKit (Web) | N/A | ❌ Native only | ❌ | N/A | Not applicable |
| Browser Shape Detection | <100KB | ❌ OCR not supported | ✅ | N/A | Won't work |

**Decision:** Tesseract.js v5+ with WASM workers. The `ben.traineddata` (Bengali) + `eng.traineddata` (English) files (~15MB total) can be cached via Service Worker for offline use.

### 2. Performance on Low-End Android

Tesseract.js WASM on a **Snapdragon 4xx/6xx** class chip (typical non-flagship):
- Small image (640x480): **1.5-2.5 seconds**
- Medium image (1280x720): **3-5 seconds**  
- Large image (1920x1080): **6-10 seconds**

**Mitigation Strategy:**
1. **Resize images** before OCR to max 1024px width (maintains accuracy, 2x speed)
2. **Crop ROI** (Region of Interest) if possible—license plates are small areas
3. **Use grayscale** conversion (reduces data by 3x)

### 3. Bengali Script Complexity

Current GPT-4o prompt performs **transliteration** (ঢাকা মেট্রো → DHAKA METRO) and **numeral conversion** (১২৩ → 123).

Tesseract **cannot** do this natively. We need a post-processing layer:

```javascript
// Bengali numeral map
const BENGALI_DIGITS = { '০':'0', '১':'1', '২':'2', '৩':'3', '৪':'4', 
                         '৫':'5', '৬':'6', '৭':'7', '৮':'8', '৯':'9' };

// Common transliterations
const REGION_MAP = {
  'ঢাকা মেট্রো': 'DHAKA METRO',
  'চট্ট মেট্রো': 'CHATTA METRO',
  // ... extend as needed
};
```

**Risk:** If Tesseract misrecognizes a Bengali character, translation fails. This is where **AI fallback** becomes critical.

### 4. Hybrid Architecture Decision Tree

```
┌─────────────────────────────────────────────────────────────────┐
│                    User Captures Image                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Client: Preprocess Image (resize to 1024px, grayscale)         │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────────────┐
│ Tesseract.js OCR        │     │ Upload Original to GAS          │
│ (runs in Web Worker)    │     │ (parallel, non-blocking)        │
└─────────────────────────┘     └─────────────────────────────────┘
              │                               │
              ▼                               │
┌─────────────────────────┐                   │
│ Post-process Text:      │                   │
│ - Bengali→English       │                   │
│ - Numeral conversion    │                   │
│ - Calculate confidence  │                   │
└─────────────────────────┘                   │
              │                               │
              ▼                               │
   ┌──────────────────────┐                   │
   │ Confidence ≥ 85%?    │                   │
   └──────────────────────┘                   │
        │ YES        │ NO                     │
        ▼            ▼                        │
┌──────────────┐  ┌──────────────────┐        │
│ Show Result  │  │ Call GPT-4o      │        │
│ Immediately  │  │ (fallback AI)    │        │
└──────────────┘  └──────────────────┘        │
        │                  │                  │
        └──────────────────┼──────────────────┘
                           ▼
              ┌─────────────────────────┐
              │ GAS: Store to Sheet     │
              │ (with OCR text + images)│
              └─────────────────────────┘
```

### 5. Invoice OCR Strategy

Since invoices are **consistent format** and we only need the **invoice number**:

1. **Keyword Search:** Look for patterns like `INV-`, `Invoice No:`, `Ref:`
2. **Regex Extraction:** `/INV[-\/]?[A-Z0-9\/\-]+/gi`
3. **Confidence:** If regex matches exactly 1 pattern, confidence = HIGH (90%)

This is **simpler** than license plates—Tesseract's English model handles typed text well.

### 6. Data Flow Changes to `Code.gs`

Current: GAS receives images → calls OpenRouter → returns result  
Proposed: GAS receives **both** images AND pre-extracted OCR data

New payload structure:
```javascript
{
  platePhotoBase64: "data:image/jpeg;base64,...",
  invoicePhotosBase64: ["..."],
  // NEW: Client-side OCR results
  clientOCR: {
    vehicleNumber: "DHAKA METRO-GA 12-3456",
    vehicleConfidence: 0.92,
    invoiceNumbers: ["INV-DBBA/0325/3219"],
    invoiceConfidence: 0.88,
    ocrEngine: "tesseract-5.0.0",
    processingTimeMs: 2340
  },
  // Existing fields
  location: "...",
  deviceInfo: "...",
  submissionId: "..."
}
```

GAS logic change:
```javascript
// If client OCR confidence is high, skip OpenRouter call
if (data.clientOCR && 
    data.clientOCR.vehicleConfidence >= 0.85 && 
    data.clientOCR.invoiceConfidence >= 0.85) {
  // Use client results directly
  aiResult = {
    vehicleNumber: data.clientOCR.vehicleNumber,
    invoiceNumbers: data.clientOCR.invoiceNumbers,
    // ...
  };
} else {
  // Fallback to OpenRouter
  aiResult = processPhotosWithAI(...);
}
```

---

## User Review Required

> [!IMPORTANT]
> **Bengali Transliteration Coverage**
> 
> I need a list of all possible **region names** that appear on license plates. The current GPT-4o prompt handles this dynamically, but for on-device OCR, we need a static mapping table.
> 
> Example: `ঢাকা মেট্রো → DHAKA METRO`
> 
> Can you provide the complete list, or should I research all Bangladeshi vehicle registration regions?

> [!WARNING]
> **First Load Delay**
> 
> First-time users will need to download Tesseract WASM + language files (~17MB total). On 5mbps, this takes **~30 seconds**. Subsequent loads are instant (cached).
> 
> Options:
> 1. Show a one-time "Setting up OCR..." progress bar
> 2. Preload in background after page load
> 3. Accept first-submission-is-slow trade-off
> 
> Which approach do you prefer?

---

## Proposed Changes

### Frontend (`index.html`)

#### [NEW] [tesseract-worker.js](file:///c:/Users/USER/vehicle_exit_tracker/tesseract-worker.js)
Dedicated Web Worker for Tesseract.js to prevent UI freeze.

#### [NEW] [ocr-processor.js](file:///c:/Users/USER/vehicle_exit_tracker/ocr-processor.js)
Client-side OCR pipeline:
- Image preprocessing (resize, grayscale)
- Tesseract execution
- Bengali→English post-processing
- Confidence calculation
- Invoice number regex extraction

#### [MODIFY] [index.html](file:///c:/Users/USER/vehicle_exit_tracker/index.html)
- Add Tesseract.js CDN import
- Add OCR processing logic after image capture
- Update UI to show "Processing locally..." during OCR
- Modify submission payload to include `clientOCR` object
- Add fallback indicator when AI is used

---

### Backend (`Code.gs`)

#### [MODIFY] [Code.gs](file:///c:/Users/USER/vehicle_exit_tracker/Code.gs)
- Modify `doPost` to accept `clientOCR` in payload
- Add conditional logic to skip OpenRouter when client confidence is high
- Add new column "OCR Source" (Client/AI) to sheet
- Log client-side metrics for analysis

---

### New Files (PWA Support)

#### [NEW] [sw.js](file:///c:/Users/USER/vehicle_exit_tracker/sw.js)
Service Worker for:
- Caching Tesseract WASM files
- Caching language traineddata files
- Offline OCR capability

#### [NEW] [manifest.json](file:///c:/Users/USER/vehicle_exit_tracker/manifest.json)
PWA manifest for installability.

---

## Verification Plan

### Automated Tests
*Not applicable for this HTML/GAS stack. No existing test framework detected.*

### Manual Verification

#### Test 1: Basic OCR Speed Comparison
1. Open the app on an Android device (Chrome)
2. Capture a license plate image
3. **Before change:** Measure time from capture → result display
4. **After change:** Measure same flow
5. **Expected:** After < 5 seconds, Before was ~10-15 seconds

#### Test 2: Bengali Plate Recognition
1. Capture a plate with Bengali text (e.g., "ঢাকা মেট্রো-গ ১২-৩৪৫৬")
2. Verify output is correctly transliterated ("DHAKA METRO-GA 12-3456")
3. If on-device confidence < 85%, verify AI fallback triggers

#### Test 3: Invoice Number Extraction
1. Capture an invoice photo
2. Verify invoice number is extracted correctly
3. Check confidence badge shows appropriate level

#### Test 4: AI Fallback Flow
1. Capture a **blurry/unclear** license plate image deliberately
2. Verify on-device OCR shows low confidence
3. Verify system automatically falls back to GPT-4o
4. Verify final result is from AI (logging or UI indicator)

#### Test 5: Offline OCR (After SW Implementation)
1. Load app once with internet
2. Turn off network (airplane mode)
3. Capture image → verify OCR still works locally
4. Turn network back on → verify submission completes

#### Test 6: First Load Performance
1. Clear browser cache and storage
2. Open app on 5mbps throttled connection
3. Measure time to download Tesseract assets
4. Verify progress indicator is shown
5. **Expected:** ~30 seconds first load, instant thereafter

---

## Edge Case Analysis

| Scenario | Risk | Mitigation |
|----------|------|------------|
| Tesseract WASM fails to load | App unusable | Fallback to backend-only mode |
| Bengali character not in mapping | Wrong transliteration | AI fallback for low confidence |
| Very blurry image | Tesseract returns garbage | Confidence threshold triggers AI |
| Multiple plates in frame | Wrong plate extracted | User can manually edit or retake |
| Device runs out of memory | App crashes on low-RAM phones | Limit image size, show warning for <2GB RAM |
| Service Worker update fails | Stale cache | Force reload mechanism |

---

## Implementation Order

1. **Phase 1:** Tesseract.js integration (local OCR working)
2. **Phase 2:** Post-processing for Bengali transliteration
3. **Phase 3:** GAS modification to accept client OCR
4. **Phase 4:** Fallback logic and confidence thresholds
5. **Phase 5:** Service Worker for caching/offline
6. **Phase 6:** PWA manifest and install prompt

---

## Open Questions for User

1. Do you have a complete list of BD vehicle registration regions for the transliteration table?
2. Preferred first-load UX for Tesseract download?
3. Should "OCR Source" (Client vs AI) be visible to end users, or just logged internally?
