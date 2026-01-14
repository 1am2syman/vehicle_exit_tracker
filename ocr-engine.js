/**
 * On-Device OCR Engine (Invoice Only)
 * Vehicle Exit Tracker - Tesseract.js WASM Implementation
 * 
 * Features:
 * - Invoice number extraction (High Speed)
 * - Optimized for receipts/documents
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const OCR_CONFIG = {
    // Tesseract.js CDN paths (v5.x with WASM)
    WORKER_PATH: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',
    CORE_PATH: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core.wasm.js',
    LANG_PATH: 'https://tessdata.projectnaptha.com/4.0.0',
    LANGUAGES: 'eng', // English only for invoices

    // Processing settings
    MAX_IMAGE_WIDTH: 1024,
    CONFIDENCE_THRESHOLD: 0.70,

    // Invoice pattern (regex for common formats)
    INVOICE_PATTERNS: [
        /INV[-\/]?[A-Z0-9\/\-]+/gi,          // INV-DBBA/0325/3219
        /(?:Invoice\s*(?:No\.?|Number|#)[\s:]*)([\w\-\/]+)/gi,  // Invoice No: 12345
        /(?:Ref\s*(?:No\.?|#)[\s:]*)([\w\-\/]+)/gi,             // Ref No: ABC123
        /(?:Bill\s*(?:No\.?|#)[\s:]*)([\w\-\/]+)/gi,            // Bill No: 99999
        /BIN\s*:\s*(\d+)/gi,                                    // BIN: 123456
        /MUSHAK\s*:\s*([\w-]+)/gi                               // MUSHAK-11
    ]
};

// ============================================================================
// OCR ENGINE CLASS
// ============================================================================

class OCREngine {
    constructor() {
        this.worker = null;
        this.isInitialized = false;
        this.initializationPromise = null;
    }

    async initialize() {
        if (this.initializationPromise) return this.initializationPromise;

        this.initializationPromise = (async () => {
            try {
                console.log('[OCR] Initializing Tesseract.js worker...');
                if (typeof Tesseract === 'undefined') throw new Error('Tesseract.js not loaded');

                this.worker = await Tesseract.createWorker(OCR_CONFIG.LANGUAGES, 1, {
                    workerPath: OCR_CONFIG.WORKER_PATH,
                    corePath: OCR_CONFIG.CORE_PATH,
                    langPath: OCR_CONFIG.LANG_PATH,
                });

                await this.worker.setParameters({
                    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-/#:. ',
                    tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
                });

                this.isInitialized = true;
                return true;
            } catch (error) {
                console.error('[OCR] Initialization failed:', error);
                this.initializationPromise = null;
                throw error;
            }
        })();

        return this.initializationPromise;
    }

    async preprocessImage(imageData) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                let width = img.width;
                let height = img.height;

                if (width > OCR_CONFIG.MAX_IMAGE_WIDTH) {
                    const ratio = OCR_CONFIG.MAX_IMAGE_WIDTH / width;
                    width = OCR_CONFIG.MAX_IMAGE_WIDTH;
                    height = Math.round(height * ratio);
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                // Grayscale & Contrast
                const imageDataObj = ctx.getImageData(0, 0, width, height);
                const data = imageDataObj.data;
                for (let i = 0; i < data.length; i += 4) {
                    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
                    const enhanced = Math.min(255, Math.max(0, (gray - 128) * 1.5 + 128));
                    data[i] = data[i + 1] = data[i + 2] = enhanced;
                }
                ctx.putImageData(imageDataObj, 0, 0);
                resolve(canvas.toDataURL('image/jpeg', 0.9));
            };
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = imageData;
        });
    }

    extractInvoiceNumbers(rawText) {
        if (!rawText) return [];
        const invoiceNumbers = new Set();
        for (const pattern of OCR_CONFIG.INVOICE_PATTERNS) {
            pattern.lastIndex = 0;
            let match;
            while ((match = pattern.exec(rawText)) !== null) {
                const invoiceNum = (match[1] || match[0]).trim().toUpperCase();
                if (invoiceNum.length >= 3) invoiceNumbers.add(invoiceNum);
            }
        }
        return Array.from(invoiceNumbers);
    }

    async recognizeInvoice(imageData) {
        if (!this.isInitialized) await this.initialize();
        const startTime = performance.now();

        try {
            const processedImage = await this.preprocessImage(imageData);
            const result = await this.worker.recognize(processedImage);
            const rawText = result.data.text;
            let confidence = result.data.confidence / 100;
            const invoiceNumbers = this.extractInvoiceNumbers(rawText);

            // Boost confidence if we found a valid pattern
            if (invoiceNumbers.length > 0) confidence = Math.max(confidence, 0.9);

            return {
                invoiceNumbers,
                confidence,
                processingTimeMs: Math.round(performance.now() - startTime)
            };
        } catch (error) {
            console.error('[OCR] Invoice failed:', error);
            throw error;
        }
    }
}

const ocrEngine = new OCREngine();
