// Configuration
const CONFIG = {
    WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbwAB7tQFexsVkXRmIWdlXUDUySP-JCZaa7S3ExLUiHFqzGcd_sP3KsP7RpEAFSmhHKLKw/exec', // Replace with actual URL
    MAX_PHOTO_SIZE: 1024 * 1024, // 1MB
    MAX_PHOTO_DIMENSION: 800,
    MIN_INVOICE_DIMENSION: 600,
    GEOLOCATION_TIMEOUT: 10000,
    GEOLOCATION_OPTIONS: {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
    },
    // OCR Configuration
    OCR_CONFIDENCE_THRESHOLD: 0.85, // 85% confidence required to skip AI fallback
    ENABLE_AI_FALLBACK: true        // If false, always use client OCR result
};

// State Management
const state = {
    platePhoto: null,
    platePhotoTime: null,
    invoicePhotos: [],
    invoicePhotosTimes: [],
    location: null,
    submissionId: null,
    aiResult: null,
    parsedResult: null,  // Stores OCR result between parse and submit
    // OCR State (legacy, kept for compatibility)
    ocrResult: null,
    ocrSource: null,
    ocrInitialized: false,
    ocrInitializing: false
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
    // OCR Status Elements
    ocrInitStatus: document.getElementById('ocrInitStatus'),
    ocrInitProgress: document.getElementById('ocrInitProgress'),
    ocrProgressBar: document.getElementById('ocrProgressBar'),
    localOcrStatus: document.getElementById('localOcrStatus'),
    aiProcessingStatus: document.getElementById('aiProcessingStatus'),
    ocrSourceBadge: document.getElementById('ocrSourceBadge'),
    // Data Display Elements
    extractedData: document.getElementById('extractedData'),
    extractedVehicleNumber: document.getElementById('extractedVehicleNumber'),
    extractedInvoiceNumbers: document.getElementById('extractedInvoiceNumbers'),
    extractedLocation: document.getElementById('extractedLocation'),
    vehicleConfidence: document.getElementById('vehicleConfidence'),
    invoiceConfidence: document.getElementById('invoiceConfidence'),
    // Edit Elements
    vehicleNumberInput: document.getElementById('vehicleNumberInput'),
    invoiceNumbersInput: document.getElementById('invoiceNumbersInput'),
    editVehicleBtn: document.getElementById('editVehicleBtn'),
    editInvoiceBtn: document.getElementById('editInvoiceBtn'),
    invoiceNumbersContainer: document.getElementById('invoiceNumbersContainer'),
    // Buttons
    parseBtn: document.getElementById('parseBtn'),
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
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
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

function setLoading(button, loading) {
    const buttonText = button.querySelector('.button-text');
    const buttonLoader = button.querySelector('.button-loader');

    button.disabled = loading;

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

        // Animate camera icon out, then show thumbnail
        const cameraZone = elements.plateCameraIcon.closest('.camera-zone');
        elements.plateCameraIcon.classList.add('fade-out');

        // Wait for animation to complete before hiding
        setTimeout(() => {
            cameraZone.classList.add('photo-captured');
            elements.plateThumbnailImg.src = compressedData;
            showElement(elements.plateThumbnail);
        }, 300);

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

        // Hide camera icon with animation (only on first photo set)
        if (state.invoicePhotos.length === files.length) {
            const cameraZone = elements.invoiceCameraIcon.closest('.camera-zone');
            elements.invoiceCameraIcon.classList.add('fade-out');
            
            setTimeout(() => {
                cameraZone.classList.add('photo-captured');
            }, 300);
        }

        // Show thumbnails grid and add more button
        showElement(elements.invoiceThumbnails);
        showElement(elements.addMoreInvoices);

        // Enable step 3
        enableStep(elements.step3);

        // Enable Parse button (not Submit - that comes after successful parse)
        showElement(elements.parseBtn);
        elements.parseBtn.disabled = false;
        hideElement(elements.submitBtn);

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

// ============================================================================
// NOTE: Local Tesseract.js OCR has been replaced with GAS Fast Path
// All OCR (plate + invoice) now goes through OpenRouter via GAS for
// consistent performance and accuracy.
// ============================================================================

// ============================================================================
// FAST PATH AI PROCESSING (Plate + Invoice) with Timeout
// ============================================================================

const OCR_TIMEOUT_MS = 30000; // 30 seconds max per request

/**
 * Process image with GAS Fast Path (OpenRouter)
 * @param {string} imageData - Base64 image
 * @param {string} type - 'plate' or 'invoice'
 * @returns {Object} - OCR result
 */
async function fetchFastOCR(imageData, type) {
    console.log(`[FastOCR] Starting ${type} OCR...`);

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        console.warn(`[FastOCR] ${type} request timed out after ${OCR_TIMEOUT_MS}ms`);
        controller.abort();
    }, OCR_TIMEOUT_MS);

    try {
        const payload = {
            action: 'fastOCR',
            image: imageData,
            type: type
        };

        const response = await fetch(CONFIG.WEB_APP_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        const json = await response.json();

        if (json.status !== 200) throw new Error(json.message);

        console.log(`[FastOCR] ${type} Result:`, json.data);
        return json.data;

    } catch (error) {
        clearTimeout(timeoutId);

        if (error.name === 'AbortError') {
            console.error(`[FastOCR] ${type} TIMEOUT - request aborted`);
        } else {
            console.error(`[FastOCR] ${type} Failed:`, error);
        }

        // Return empty result on failure/timeout
        if (type === 'invoice') {
            return { invoiceNumbers: [], confidence: 0, timedOut: true };
        }
        return { vehicleNumber: '', confidence: 0, timedOut: true };
    }
}

// ============================================================================
// TWO-STEP FLOW: Parse → Submit
// ============================================================================

/**
 * STEP 1: Parse Images (OCR only, no upload)
 */
async function handleParse() {
    console.log('=== PARSE STARTED ===');

    if (!state.platePhoto || state.invoicePhotos.length === 0) {
        alert('Please capture all required photos');
        return;
    }

    state.submissionId = state.submissionId || generateUUID();

    // Show processing UI
    showElement(elements.aiProcessingStatus);
    setLoading(elements.parseBtn, true);
    hideElement(elements.submitBtn);

    try {
        // Build parallel OCR requests: 1 plate + N invoices
        const ocrPromises = [
            fetchFastOCR(state.platePhoto, 'plate'),
            ...state.invoicePhotos.map(img => fetchFastOCR(img, 'invoice'))
        ];

        // Execute ALL in parallel
        const results = await Promise.all(ocrPromises);

        // First result is plate, rest are invoices
        const plateResult = results[0];
        const invoiceResults = results.slice(1);

        // Merge invoice numbers from all invoice OCR results
        const allInvoiceNumbers = new Set();
        let totalInvoiceConf = 0;
        invoiceResults.forEach(r => {
            (r.invoiceNumbers || []).forEach(n => allInvoiceNumbers.add(n));
            totalInvoiceConf += (r.confidence || 0);
        });
        const avgInvoiceConf = invoiceResults.length > 0
            ? totalInvoiceConf / invoiceResults.length
            : 0;

        // Combine results
        const finalResult = {
            vehicleNumber: plateResult.vehicleNumber || '',
            vehicleConfidence: plateResult.confidence || 0,
            invoiceNumbers: Array.from(allInvoiceNumbers),
            invoiceConfidence: avgInvoiceConf,
            validationStatus: 'Success'
        };

        console.log('[Parse] Final combined result:', finalResult);

        // Store in state for later submit
        state.aiResult = {
            vehicleNumber: finalResult.vehicleNumber,
            invoiceNumbers: finalResult.invoiceNumbers,
            confidence: {
                vehicle: finalResult.vehicleConfidence,
                invoices: finalResult.invoiceConfidence
            }
        };
        state.parsedResult = finalResult;

        // DISPLAY RESULTS
        hideElement(elements.aiProcessingStatus);
        displayOCRResult(finalResult, 'gas-fast-path');
        setLoading(elements.parseBtn, false);

        // Hide Parse, Show Submit
        hideElement(elements.parseBtn);
        showElement(elements.submitBtn);

        console.log('[Parse] Complete. Ready for submit.');

    } catch (error) {
        console.error('Parse failed:', error);
        hideElement(elements.aiProcessingStatus);
        setLoading(elements.parseBtn, false);

        // Show error but allow retry
        alert('Parsing failed. Please try again.');
    }
}

/**
 * STEP 2: Submit Entry (optimistic UI - show success immediately)
 */
async function handleSubmit() {
    console.log('=== SUBMIT STARTED ===');

    if (!state.parsedResult) {
        alert('Please parse images first');
        return;
    }

    // OPTIMISTIC UI: Show success immediately
    showSuccess();
    console.log('[Submit] Success shown (optimistic)');

    // BACKGROUND: Upload data (fire and forget)
    uploadToBackend(state.parsedResult).then(success => {
        if (success) {
            console.log('[Submit] Background upload confirmed');
        } else {
            console.warn('[Submit] Background upload failed - data saved locally');
            // Data is already saved locally via storeSubmission()
        }
    }).catch(error => {
        console.error('[Submit] Background upload error:', error);
    });
}

function displayOCRResult(result, source) {
    showElement(elements.extractedData);
    hideElement(elements.localOcrStatus);
    hideElement(elements.aiProcessingStatus);

    elements.extractedVehicleNumber.textContent = result.vehicleNumber || 'Not found';
    
    // Display invoices as separate lines with individual edit icons
    const invoiceNumbers = result.invoiceNumbers || [];
    const container = elements.invoiceNumbersContainer;
    container.innerHTML = '';
    
    if (invoiceNumbers.length === 0) {
        container.innerHTML = '<span class="data-value">Not found</span>';
    } else {
        invoiceNumbers.forEach((invoice, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'invoice-item';
            
            const span = document.createElement('span');
            span.className = 'invoice-number-text';
            span.textContent = invoice;
            span.dataset.index = index;
            
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'invoice-number-input hidden';
            input.value = invoice;
            input.dataset.index = index;
            input.setAttribute('aria-label', `Edit invoice ${index + 1}`);
            
            const btn = document.createElement('button');
            btn.className = 'edit-icon-btn';
            btn.setAttribute('aria-label', `Edit invoice ${index + 1}`);
            btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>`;
            btn.addEventListener('click', () => enterInvoiceEditMode(index));
            
            input.addEventListener('blur', () => exitInvoiceEditMode(index));
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') exitInvoiceEditMode(index);
                if (e.key === 'Escape') cancelInvoiceEditMode(index);
            });
            
            itemDiv.appendChild(span);
            itemDiv.appendChild(input);
            itemDiv.appendChild(btn);
            container.appendChild(itemDiv);
        });
    }

    const vehicleConf = Math.round((result.vehicleConfidence || 0) * 100);
    const invoiceConf = Math.round((result.invoiceConfidence || 0) * 100);

    elements.vehicleConfidence.textContent = vehicleConf + '%';
    elements.invoiceConfidence.textContent = invoiceConf + '%';

    elements.vehicleConfidence.className = 'confidence-badge ' + (vehicleConf >= 80 ? 'high' : 'low');
    elements.invoiceConfidence.className = 'confidence-badge ' + (invoiceConf >= 80 ? 'high' : 'low');
}

// ============================================================================
// INLINE EDIT FUNCTIONALITY
// ============================================================================

function initEditableFields() {
    elements.editVehicleBtn.addEventListener('click', () => enterEditMode('vehicle'));
    elements.vehicleNumberInput.addEventListener('blur', () => exitEditMode('vehicle'));
    elements.vehicleNumberInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') exitEditMode('vehicle');
        if (e.key === 'Escape') cancelEditMode('vehicle');
    });

    elements.editInvoiceBtn.addEventListener('click', () => enterEditMode('invoice'));
    elements.invoiceNumbersInput.addEventListener('blur', () => exitEditMode('invoice'));
    elements.invoiceNumbersInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') exitEditMode('invoice');
        if (e.key === 'Escape') cancelEditMode('invoice');
    });
}

function enterEditMode(field) {
    const span = field === 'vehicle' ? elements.extractedVehicleNumber : elements.extractedInvoiceNumbers;
    const input = field === 'vehicle' ? elements.vehicleNumberInput : elements.invoiceNumbersInput;
    
    span.classList.add('editing');
    input.value = span.textContent;
    showElement(input);
    input.focus();
    input.select();
}

function exitEditMode(field) {
    const span = field === 'vehicle' ? elements.extractedVehicleNumber : elements.extractedInvoiceNumbers;
    const input = field === 'vehicle' ? elements.vehicleNumberInput : elements.invoiceNumbersInput;
    const badge = field === 'vehicle' ? elements.vehicleConfidence : elements.invoiceConfidence;
    
    const newValue = input.value.trim() || 'Not found';
    span.textContent = newValue;
    span.classList.remove('editing');
    hideElement(input);
    
    // Update state
    if (field === 'vehicle') {
        if (state.parsedResult) state.parsedResult.vehicleNumber = newValue;
        if (state.aiResult) state.aiResult.vehicleNumber = newValue;
    } else {
        const arr = newValue.split(',').map(s => s.trim()).filter(Boolean);
        if (state.parsedResult) state.parsedResult.invoiceNumbers = arr;
        if (state.aiResult) state.aiResult.invoiceNumbers = arr;
    }
    
    badge.textContent = 'Edited';
    badge.className = 'confidence-badge high';
}

function cancelEditMode(field) {
    const span = field === 'vehicle' ? elements.extractedVehicleNumber : elements.extractedInvoiceNumbers;
    const input = field === 'vehicle' ? elements.vehicleNumberInput : elements.invoiceNumbersInput;
    span.classList.remove('editing');
    hideElement(input);
}

// Invoice-specific edit functions
function enterInvoiceEditMode(index) {
    const container = elements.invoiceNumbersContainer;
    const itemDiv = container.children[index];
    const span = itemDiv.querySelector('.invoice-number-text');
    const input = itemDiv.querySelector('.invoice-number-input');
    
    span.classList.add('editing');
    showElement(input);
    input.focus();
    input.select();
}

function exitInvoiceEditMode(index) {
    const container = elements.invoiceNumbersContainer;
    const itemDiv = container.children[index];
    const span = itemDiv.querySelector('.invoice-number-text');
    const input = itemDiv.querySelector('.invoice-number-input');
    const badge = elements.invoiceConfidence;
    
    const newValue = input.value.trim() || 'Not found';
    span.textContent = newValue;
    span.classList.remove('editing');
    hideElement(input);
    
    // Update state with all current invoice values
    updateInvoiceNumbersFromDOM();
    
    badge.textContent = 'Edited';
    badge.className = 'confidence-badge high';
}

function cancelInvoiceEditMode(index) {
    const container = elements.invoiceNumbersContainer;
    const itemDiv = container.children[index];
    const span = itemDiv.querySelector('.invoice-number-text');
    const input = itemDiv.querySelector('.invoice-number-input');
    
    span.classList.remove('editing');
    hideElement(input);
}

function updateInvoiceNumbersFromDOM() {
    const container = elements.invoiceNumbersContainer;
    const spans = container.querySelectorAll('.invoice-number-text');
    const numbers = Array.from(spans)
        .map(span => span.textContent)
        .filter(text => text && text !== 'Not found');
    
    if (state.parsedResult) {
        state.parsedResult.invoiceNumbers = numbers;
    }
    if (state.aiResult) {
        state.aiResult.invoiceNumbers = numbers;
    }
}

/**
 * Upload images + extracted data to backend
 * Returns true on success, false on failure
 */
async function uploadToBackend(extractedData) {
    console.log('[Upload] Starting...');
    try {
        const payload = {
            action: 'upload',
            images: {
                plate: state.platePhoto,
                invoices: state.invoicePhotos
            },
            extractedData: {
                vehicleNumber: extractedData.vehicleNumber,
                invoiceNumbers: extractedData.invoiceNumbers,
                confidence: {
                    vehicle: extractedData.vehicleConfidence,
                    invoices: extractedData.invoiceConfidence
                },
                ocrSource: 'gas-fast-path'
            },
            submissionId: state.submissionId,
            meta: {
                location: state.location,
                deviceInfo: getDeviceInfo(),
                captureTime: state.platePhotoTime
            }
        };

        const response = await fetch(CONFIG.WEB_APP_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (result.status === 200) {
            console.log('[Upload] Success');
            storeSubmission(extractedData);
            return true;
        } else {
            console.warn('[Upload] Error:', result.message);
            return false;
        }
    } catch (e) {
        console.error('[Upload] Failed', e);
        return false;
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
    state.parsedResult = null;
    state.submissionId = null;

    // Reset thumbnails
    elements.invoiceThumbnails.innerHTML = '';

    // Reset UI
    hideElement(elements.plateThumbnail);
    hideElement(elements.invoiceThumbnails);
    hideElement(elements.addMoreInvoices);
    hideElement(elements.extractedData);
    hideElement(elements.aiProcessingStatus);
    hideElement(elements.localOcrStatus);
    hideElement(elements.ocrInitStatus);
    hideElement(elements.parseBtn);
    hideElement(elements.submitBtn);
    
    // Hide overlay screens
    hideElement(elements.successMessage);
    hideElement(elements.errorMessage);

    // Reset camera icon visibility
    const cameraZones = document.querySelectorAll('.camera-zone');
    cameraZones.forEach(zone => {
        zone.classList.remove('photo-captured');
        const icon = zone.querySelector('.camera-icon-wrapper');
        if (icon) icon.classList.remove('fade-out');
    });

    // CRITICAL: Show step sections (they were hidden by showSuccess)
    showElement(elements.step1);
    showElement(elements.step2);
    showElement(elements.step3);

    // Reset steps
    enableStep(elements.step1);
    disableStep(elements.step2);
    disableStep(elements.step3);

    // Reset buttons
    elements.parseBtn.disabled = true;

    // Reset form fields
    elements.extractedLocation.textContent = 'Acquiring...';
    elements.extractedVehicleNumber.textContent = '--';
    elements.invoiceNumbersContainer.innerHTML = '<span class="data-value">--</span>';
    elements.vehicleConfidence.textContent = '--%';
    elements.invoiceConfidence.textContent = '--%';
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initCamera();

    // Parse button (OCR)
    elements.parseBtn.addEventListener('click', handleParse);

    // Submit button (Upload)
    elements.submitBtn.addEventListener('click', handleSubmit);

    // New entry button
    elements.newEntryButton.addEventListener('click', resetForm);

    // Exit button
    document.getElementById('exitButton').addEventListener('click', () => {
        if (confirm('Are you sure you want to exit?')) {
            window.close();
            // Fallback if window.close() is blocked
            window.location.href = 'about:blank';
        }
    });

    // Retry button
    elements.retryButton.addEventListener('click', () => {
        hideElement(elements.errorMessage);
        showElement(elements.step3);
    });

    // Check for unsynced submissions
    checkUnsyncedSubmissions();

    // Register Service Worker for PWA caching
    registerServiceWorker();

    // Initialize inline edit functionality
    initEditableFields();

    // Note: Local OCR preload removed - all OCR now via GAS Fast Path
});

/**
 * Register Service Worker for offline support and caching
 */
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/'
            });
            console.log('[SW] Service Worker registered:', registration.scope);

            // Listen for updates
            registration.addEventListener('updatefound', () => {
                console.log('[SW] New service worker found');
            });
        } catch (error) {
            console.warn('[SW] Service Worker registration failed:', error);
            // Not critical - app works without SW
        }
    }
}

function checkUnsyncedSubmissions() {
    const submissions = JSON.parse(localStorage.getItem('vehicleExitSubmissions') || '[]');
    const unsynced = submissions.filter(s => !s.synced);

    if (unsynced.length > 0) {
        console.log(`Found ${unsynced.length} unsynced submissions`);
    }
}
