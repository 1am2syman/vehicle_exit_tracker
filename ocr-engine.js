/**
 * On-Device OCR Engine
 * Vehicle Exit Tracker - Tesseract.js WASM Implementation
 * 
 * Features:
 * - Bengali + English license plate recognition
 * - Invoice number extraction
 * - Confidence-based thresholds
 * - Post-processing for Bengali→English transliteration
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const OCR_CONFIG = {
    // Tesseract.js CDN paths (v5.x with WASM)
    WORKER_PATH: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',
    CORE_PATH: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core.wasm.js',
    
    // Language files (Bengali + English)
    LANG_PATH: 'https://tessdata.projectnaptha.com/4.0.0',
    LANGUAGES: 'eng+ben', // English + Bengali
    
    // Processing settings
    MAX_IMAGE_WIDTH: 1024,  // Resize for performance
    CONFIDENCE_THRESHOLD: 0.85, // 85% confidence required to skip AI fallback
    
    // Invoice pattern (regex for common formats)
    INVOICE_PATTERNS: [
        /INV[-\/]?[A-Z0-9\/\-]+/gi,          // INV-DBBA/0325/3219
        /(?:Invoice\s*(?:No\.?|Number|#)[\s:]*)([\w\-\/]+)/gi,  // Invoice No: 12345
        /(?:Ref\s*(?:No\.?|#)[\s:]*)([\w\-\/]+)/gi,             // Ref No: ABC123
        /(?:Bill\s*(?:No\.?|#)[\s:]*)([\w\-\/]+)/gi,            // Bill No: 99999
    ]
};

// ============================================================================
// BENGALI TO ENGLISH TRANSLITERATION TABLES
// ============================================================================

// Bengali digit to English digit mapping
const BENGALI_DIGITS = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
};

// Bengali region names to English (Bangladeshi vehicle registration regions)
const REGION_TRANSLITERATIONS = {
    // Metro regions
    'ঢাকা মেট্রো': 'DHAKA METRO',
    'ঢাকা মেট্র': 'DHAKA METRO',  // Partial match
    'ঢাকা': 'DHAKA',
    'চট্টগ্রাম মেট্রো': 'CHATTOGRAM METRO',
    'চট্ট মেট্রো': 'CHATTOGRAM METRO',
    'চট্টগ্রাম': 'CHATTOGRAM',
    'রাজশাহী মেট্রো': 'RAJSHAHI METRO',
    'রাজশাহী': 'RAJSHAHI',
    'খুলনা মেট্রো': 'KHULNA METRO',
    'খুলনা': 'KHULNA',
    'সিলেট মেট্রো': 'SYLHET METRO',
    'সিলেট': 'SYLHET',
    'রংপুর মেট্রো': 'RANGPUR METRO',
    'রংপুর': 'RANGPUR',
    'বরিশাল মেট্রো': 'BARISHAL METRO',
    'বরিশাল': 'BARISHAL',
    'ময়মনসিংহ মেট্রো': 'MYMENSINGH METRO',
    'ময়মনসিংহ': 'MYMENSINGH',
    
    // District variations
    'গাজীপুর মেট্রো': 'GAZIPUR METRO',
    'গাজীপুর': 'GAZIPUR',
    'নারায়ণগঞ্জ মেট্রো': 'NARAYANGANJ METRO',
    'নারায়ণগঞ্জ': 'NARAYANGANJ',
    'কুমিল্লা': 'CUMILLA',
    'নোয়াখালী': 'NOAKHALI',
    'ফেনী': 'FENI',
    'ব্রাহ্মণবাড়িয়া': 'BRAHMANBARIA',
    'চাঁদপুর': 'CHANDPUR',
    'লক্ষ্মীপুর': 'LAKSHMIPUR',
    'কক্সবাজার': 'COX BAZAR',
    'বান্দরবান': 'BANDARBAN',
    'রাঙ্গামাটি': 'RANGAMATI',
    'খাগড়াছড়ি': 'KHAGRACHHARI',
    'পাবনা': 'PABNA',
    'বগুড়া': 'BOGURA',
    'নাটোর': 'NATORE',
    'নওগাঁ': 'NAOGAON',
    'চাঁপাইনবাবগঞ্জ': 'CHAPAINAWABGANJ',
    'জয়পুরহাট': 'JOYPURHAT',
    'যশোর': 'JESSORE',
    'সাতক্ষীরা': 'SATKHIRA',
    'ঝিনাইদহ': 'JHENAIDAH',
    'নড়াইল': 'NARAIL',
    'মাগুরা': 'MAGURA',
    'কুষ্টিয়া': 'KUSHTIA',
    'মেহেরপুর': 'MEHERPUR',
    'চুয়াডাঙ্গা': 'CHUADANGA',
    'হবিগঞ্জ': 'HABIGANJ',
    'মৌলভীবাজার': 'MOULVIBAZAR',
    'সুনামগঞ্জ': 'SUNAMGANJ',
    'দিনাজপুর': 'DINAJPUR',
    'ঠাকুরগাঁও': 'THAKURGAON',
    'পঞ্চগড়': 'PANCHAGARH',
    'নীলফামারী': 'NILPHAMARI',
    'লালমনিরহাট': 'LALMONIRHAT',
    'কুড়িগ্রাম': 'KURIGRAM',
    'গাইবান্ধা': 'GAIBANDHA',
    'পটুয়াখালী': 'PATUAKHALI',
    'বরগুনা': 'BARGUNA',
    'পিরোজপুর': 'PIROJPUR',
    'ভোলা': 'BHOLA',
    'ঝালকাঠি': 'JHALOKATHI',
    'জামালপুর': 'JAMALPUR',
    'শেরপুর': 'SHERPUR',
    'নেত্রকোনা': 'NETROKONA',
    'টাঙ্গাইল': 'TANGAIL',
    'কিশোরগঞ্জ': 'KISHOREGANJ',
    'মানিকগঞ্জ': 'MANIKGANJ',
    'মুন্সিগঞ্জ': 'MUNSHIGANJ',
    'নরসিংদী': 'NARSINGDI',
    'গোপালগঞ্জ': 'GOPALGANJ',
    'মাদারীপুর': 'MADARIPUR',
    'শরীয়তপুর': 'SHARIATPUR',
    'ফরিদপুর': 'FARIDPUR',
    'রাজবাড়ী': 'RAJBARI',
    'সিরাজগঞ্জ': 'SIRAJGANJ'
};

// Bengali vehicle class letters to English
const CLASS_TRANSLITERATIONS = {
    // Single letter classes
    'ক': 'KA', 'খ': 'KHA', 'গ': 'GA', 'ঘ': 'GHA', 'ঙ': 'UMA',
    'চ': 'CHA', 'ছ': 'CHHA', 'জ': 'JA', 'ঝ': 'JHA', 'ঞ': 'NYA',
    'ট': 'TA', 'ঠ': 'THA', 'ড': 'DA', 'ঢ': 'DHA', 'ণ': 'NA',
    'ত': 'TA', 'থ': 'THA', 'দ': 'DA', 'ধ': 'DHA', 'ন': 'NA',
    'প': 'PA', 'ফ': 'PHA', 'ব': 'BA', 'ভ': 'BHA', 'ম': 'MA',
    'য': 'YA', 'র': 'RA', 'ল': 'LA', 'শ': 'SHA', 'ষ': 'SHA',
    'স': 'SA', 'হ': 'HA', 'ড়': 'RA', 'ঢ়': 'RHA', 'য়': 'YA',
    'ৎ': 'T', 'ং': 'NG', 'ঃ': 'H', 'ঁ': 'N',
    
    // Common two-letter combinations found on plates
    'থক': 'THAKA', 'থখ': 'THAKHA', 'থগ': 'THAGA'
};

// ============================================================================
// OCR ENGINE CLASS
// ============================================================================

class OCREngine {
    constructor() {
        this.worker = null;
        this.isInitialized = false;
        this.initializationPromise = null;
        this.onProgress = null; // Callback for download progress
    }

    /**
     * Initialize Tesseract.js worker
     * Downloads WASM + language files (~17MB first time, cached thereafter)
     */
    async initialize(progressCallback = null) {
        // Prevent multiple initializations
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.onProgress = progressCallback;

        this.initializationPromise = (async () => {
            try {
                console.log('[OCR] Initializing Tesseract.js worker...');
                
                // Check if Tesseract is loaded
                if (typeof Tesseract === 'undefined') {
                    throw new Error('Tesseract.js not loaded. Include the CDN script.');
                }

                // Create worker with progress tracking
                this.worker = await Tesseract.createWorker(OCR_CONFIG.LANGUAGES, 1, {
                    workerPath: OCR_CONFIG.WORKER_PATH,
                    corePath: OCR_CONFIG.CORE_PATH,
                    langPath: OCR_CONFIG.LANG_PATH,
                    logger: (m) => {
                        console.log('[OCR Progress]', m);
                        if (this.onProgress && m.progress !== undefined) {
                            this.onProgress({
                                status: m.status,
                                progress: m.progress
                            });
                        }
                    }
                });

                // Configure for best accuracy
                await this.worker.setParameters({
                    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-/ ০১২৩৪৫৬৭৮৯অআইঈউঊঋএঐওঔকখগঘঙচছজঝঞটঠডঢণতথদধনপফবভমযরলশষসহড়ঢ়য়',
                    tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
                    preserve_interword_spaces: '1'
                });

                this.isInitialized = true;
                console.log('[OCR] Tesseract.js initialized successfully');
                
                return true;
            } catch (error) {
                console.error('[OCR] Initialization failed:', error);
                this.initializationPromise = null; // Allow retry
                throw error;
            }
        })();

        return this.initializationPromise;
    }

    /**
     * Check if OCR engine is ready
     */
    isReady() {
        return this.isInitialized && this.worker !== null;
    }

    /**
     * Preprocess image for better OCR accuracy
     * - Resize to optimal dimension
     * - Convert to grayscale
     * - Increase contrast
     */
    async preprocessImage(imageData) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // Calculate new dimensions (max width 1024)
                let width = img.width;
                let height = img.height;
                
                if (width > OCR_CONFIG.MAX_IMAGE_WIDTH) {
                    const ratio = OCR_CONFIG.MAX_IMAGE_WIDTH / width;
                    width = OCR_CONFIG.MAX_IMAGE_WIDTH;
                    height = Math.round(height * ratio);
                }

                canvas.width = width;
                canvas.height = height;

                // Draw and convert to grayscale with contrast enhancement
                ctx.drawImage(img, 0, 0, width, height);
                
                const imageDataObj = ctx.getImageData(0, 0, width, height);
                const data = imageDataObj.data;

                // Grayscale conversion with contrast boost
                for (let i = 0; i < data.length; i += 4) {
                    // Weighted grayscale (luminosity method)
                    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
                    
                    // Contrast enhancement (stretch histogram)
                    const enhanced = Math.min(255, Math.max(0, (gray - 128) * 1.5 + 128));
                    
                    data[i] = enhanced;     // R
                    data[i + 1] = enhanced; // G
                    data[i + 2] = enhanced; // B
                    // Alpha remains unchanged
                }

                ctx.putImageData(imageDataObj, 0, 0);
                resolve(canvas.toDataURL('image/jpeg', 0.95));
            };
            
            img.onerror = () => reject(new Error('Failed to load image for preprocessing'));
            img.src = imageData;
        });
    }

    /**
     * Convert Bengali numerals to English
     */
    convertBengaliNumerals(text) {
        let result = text;
        for (const [bengali, english] of Object.entries(BENGALI_DIGITS)) {
            result = result.split(bengali).join(english);
        }
        return result;
    }

    /**
     * Transliterate Bengali region names to English
     */
    transliterateRegion(text) {
        let result = text;
        
        // Sort by length (longest first) to match multi-word regions first
        const sortedRegions = Object.entries(REGION_TRANSLITERATIONS)
            .sort((a, b) => b[0].length - a[0].length);
        
        for (const [bengali, english] of sortedRegions) {
            if (result.includes(bengali)) {
                result = result.replace(bengali, english);
                break; // Only replace one region
            }
        }
        
        return result;
    }

    /**
     * Transliterate Bengali vehicle class to English
     */
    transliterateClass(text) {
        let result = text;
        
        // Sort by length (longest first)
        const sortedClasses = Object.entries(CLASS_TRANSLITERATIONS)
            .sort((a, b) => b[0].length - a[0].length);
        
        for (const [bengali, english] of sortedClasses) {
            result = result.split(bengali).join(english);
        }
        
        return result;
    }

    /**
     * Post-process OCR result for license plates
     * Handles Bengali→English conversion
     */
    postProcessPlateText(rawText) {
        if (!rawText) return { text: '', confidence: 0 };

        let processed = rawText.trim();
        
        // Step 1: Convert Bengali numerals
        processed = this.convertBengaliNumerals(processed);
        
        // Step 2: Transliterate region names
        processed = this.transliterateRegion(processed);
        
        // Step 3: Transliterate class letters
        processed = this.transliterateClass(processed);
        
        // Step 4: Normalize whitespace and separators
        processed = processed
            .replace(/\s+/g, ' ')           // Collapse multiple spaces
            .replace(/\s*-\s*/g, '-')       // Normalize dashes
            .replace(/\s*\/\s*/g, '/')      // Normalize slashes
            .toUpperCase()                   // Uppercase everything
            .trim();

        // Step 5: Try to format as standard BD plate format
        // Typical format: REGION-CLASS XX-XXXX or REGION CLASS XX-XXXX
        const plateRegex = /([A-Z\s]+)\s*[-\s]?\s*([A-Z]{1,4})\s*[-\s]?\s*(\d{2})\s*[-\s]?\s*(\d{4})/;
        const match = processed.match(plateRegex);
        
        if (match) {
            const [, region, classCode, series, number] = match;
            processed = `${region.trim()}-${classCode.trim()} ${series}-${number}`;
        }

        return processed;
    }

    /**
     * Extract invoice numbers from OCR text
     */
    extractInvoiceNumbers(rawText) {
        if (!rawText) return [];

        const invoiceNumbers = new Set();

        for (const pattern of OCR_CONFIG.INVOICE_PATTERNS) {
            // Reset lastIndex for global patterns
            pattern.lastIndex = 0;
            
            let match;
            while ((match = pattern.exec(rawText)) !== null) {
                // If pattern has a capture group, use it; otherwise use full match
                const invoiceNum = (match[1] || match[0]).trim().toUpperCase();
                if (invoiceNum.length >= 3) { // Minimum 3 chars for valid invoice
                    invoiceNumbers.add(invoiceNum);
                }
            }
        }

        return Array.from(invoiceNumbers);
    }

    /**
     * OCR a license plate image
     * Returns: { vehicleNumber, confidence, rawText, processingTimeMs }
     */
    async recognizePlate(imageData) {
        if (!this.isReady()) {
            throw new Error('OCR engine not initialized. Call initialize() first.');
        }

        const startTime = performance.now();

        try {
            // Preprocess image
            console.log('[OCR] Preprocessing plate image...');
            const processedImage = await this.preprocessImage(imageData);

            // Run OCR
            console.log('[OCR] Running plate recognition...');
            const result = await this.worker.recognize(processedImage);
            
            const rawText = result.data.text;
            const confidence = result.data.confidence / 100; // Convert to 0-1 scale

            // Post-process
            const vehicleNumber = this.postProcessPlateText(rawText);

            const processingTimeMs = Math.round(performance.now() - startTime);

            console.log('[OCR] Plate result:', {
                raw: rawText,
                processed: vehicleNumber,
                confidence: confidence,
                timeMs: processingTimeMs
            });

            return {
                vehicleNumber,
                confidence,
                rawText,
                processingTimeMs
            };
        } catch (error) {
            console.error('[OCR] Plate recognition failed:', error);
            throw error;
        }
    }

    /**
     * OCR an invoice image
     * Returns: { invoiceNumbers, confidence, rawText, processingTimeMs }
     */
    async recognizeInvoice(imageData) {
        if (!this.isReady()) {
            throw new Error('OCR engine not initialized. Call initialize() first.');
        }

        const startTime = performance.now();

        try {
            // Preprocess image
            console.log('[OCR] Preprocessing invoice image...');
            const processedImage = await this.preprocessImage(imageData);

            // Run OCR
            console.log('[OCR] Running invoice recognition...');
            const result = await this.worker.recognize(processedImage);
            
            const rawText = result.data.text;
            const baseConfidence = result.data.confidence / 100;

            // Extract invoice numbers
            const invoiceNumbers = this.extractInvoiceNumbers(rawText);
            
            // Adjust confidence based on extraction success
            let confidence = baseConfidence;
            if (invoiceNumbers.length === 0) {
                confidence = 0;
            } else if (invoiceNumbers.length === 1) {
                // Single clear match = higher confidence
                confidence = Math.min(1, baseConfidence * 1.1);
            }

            const processingTimeMs = Math.round(performance.now() - startTime);

            console.log('[OCR] Invoice result:', {
                raw: rawText.substring(0, 200) + '...',
                extracted: invoiceNumbers,
                confidence: confidence,
                timeMs: processingTimeMs
            });

            return {
                invoiceNumbers,
                confidence,
                rawText,
                processingTimeMs
            };
        } catch (error) {
            console.error('[OCR] Invoice recognition failed:', error);
            throw error;
        }
    }

    /**
     * Process all images (plate + invoices) in parallel
     * Returns aggregated results
     */
    async processAll(plateImage, invoiceImages) {
        const startTime = performance.now();

        try {
            // Run plate OCR (cannot parallelize with same worker)
            const plateResult = await this.recognizePlate(plateImage);

            // Run invoice OCR sequentially (same worker limitation)
            const invoiceResults = [];
            for (const invoiceImage of invoiceImages) {
                const result = await this.recognizeInvoice(invoiceImage);
                invoiceResults.push(result);
            }

            // Aggregate invoice numbers
            const allInvoiceNumbers = new Set();
            let totalInvoiceConfidence = 0;
            
            for (const result of invoiceResults) {
                result.invoiceNumbers.forEach(num => allInvoiceNumbers.add(num));
                totalInvoiceConfidence += result.confidence;
            }

            const avgInvoiceConfidence = invoiceResults.length > 0 
                ? totalInvoiceConfidence / invoiceResults.length 
                : 0;

            const totalTimeMs = Math.round(performance.now() - startTime);

            return {
                vehicleNumber: plateResult.vehicleNumber,
                vehicleConfidence: plateResult.confidence,
                invoiceNumbers: Array.from(allInvoiceNumbers),
                invoiceConfidence: avgInvoiceConfidence,
                processingTimeMs: totalTimeMs,
                ocrEngine: 'tesseract-5.0.0',
                needsAIFallback: 
                    plateResult.confidence < OCR_CONFIG.CONFIDENCE_THRESHOLD ||
                    avgInvoiceConfidence < OCR_CONFIG.CONFIDENCE_THRESHOLD
            };
        } catch (error) {
            console.error('[OCR] processAll failed:', error);
            throw error;
        }
    }

    /**
     * Cleanup worker resources
     */
    async terminate() {
        if (this.worker) {
            await this.worker.terminate();
            this.worker = null;
            this.isInitialized = false;
            this.initializationPromise = null;
            console.log('[OCR] Worker terminated');
        }
    }
}

// ============================================================================
// GLOBAL INSTANCE (Singleton Pattern)
// ============================================================================

// Export singleton instance
const ocrEngine = new OCREngine();

// For module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { OCREngine, ocrEngine, OCR_CONFIG };
}
