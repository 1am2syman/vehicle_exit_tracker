/**
 * OCR Test Script
 * Tests Tesseract.js implementation against sample images
 * 
 * Run: node test-ocr.js
 */

const Tesseract = require('tesseract.js');
const fs = require('fs');
const path = require('path');

// ============================================================================
// BENGALI TO ENGLISH TRANSLITERATION TABLES (copied from ocr-engine.js)
// ============================================================================

const BENGALI_DIGITS = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
};

const REGION_TRANSLITERATIONS = {
    'ঢাকা মেট্রো': 'DHAKA METRO',
    'ঢাকা মেট্র': 'DHAKA METRO',
    'ঢাকা': 'DHAKA',
    'চট্টগ্রাম মেট্রো': 'CHATTOGRAM METRO',
    'চট্ট মেট্রো': 'CHATTOGRAM METRO',
    'চট্টগ্রাম': 'CHATTOGRAM',
    // ... other regions
};

const CLASS_TRANSLITERATIONS = {
    'ক': 'KA', 'খ': 'KHA', 'গ': 'GA', 'ঘ': 'GHA', 'ঙ': 'UMA',
    'চ': 'CHA', 'ছ': 'CHHA', 'জ': 'JA', 'ঝ': 'JHA', 'ঞ': 'NYA',
    'ট': 'TA', 'ঠ': 'THA', 'ড': 'DA', 'ঢ': 'DHA', 'ণ': 'NA',
    'ত': 'TA', 'থ': 'THA', 'দ': 'DA', 'ধ': 'DHA', 'ন': 'NA',
    'প': 'PA', 'ফ': 'PHA', 'ব': 'BA', 'ভ': 'BHA', 'ম': 'MA',
    'য': 'YA', 'র': 'RA', 'ল': 'LA', 'শ': 'SHA', 'ষ': 'SHA',
    'স': 'SA', 'হ': 'HA', 'ড়': 'RA', 'ঢ়': 'RHA', 'য়': 'YA'
};

const INVOICE_PATTERNS = [
    /INV[-\/]?[A-Z0-9\/\-]+/gi,
    /(?:Invoice\s*(?:No\.?|Number|#)[\s:]*)([\w\-\/]+)/gi,
    /(?:Ref\s*(?:No\.?|#)[\s:]*)([\w\-\/]+)/gi,
    /(?:Bill\s*(?:No\.?|#)[\s:]*)([\w\-\/]+)/gi,
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function convertBengaliNumerals(text) {
    let result = text;
    for (const [bengali, english] of Object.entries(BENGALI_DIGITS)) {
        result = result.split(bengali).join(english);
    }
    return result;
}

function transliterateRegion(text) {
    let result = text;
    const sortedRegions = Object.entries(REGION_TRANSLITERATIONS)
        .sort((a, b) => b[0].length - a[0].length);

    for (const [bengali, english] of sortedRegions) {
        if (result.includes(bengali)) {
            result = result.replace(bengali, english);
            break;
        }
    }
    return result;
}

function transliterateClass(text) {
    let result = text;
    const sortedClasses = Object.entries(CLASS_TRANSLITERATIONS)
        .sort((a, b) => b[0].length - a[0].length);

    for (const [bengali, english] of sortedClasses) {
        result = result.split(bengali).join(english);
    }
    return result;
}

function postProcessPlateText(rawText) {
    if (!rawText) return '';

    let processed = rawText.trim();

    // Convert Bengali numerals
    processed = convertBengaliNumerals(processed);

    // Transliterate region names
    processed = transliterateRegion(processed);

    // Transliterate class letters
    processed = transliterateClass(processed);

    // Normalize
    processed = processed
        .replace(/\s+/g, ' ')
        .replace(/\s*-\s*/g, '-')
        .replace(/\s*\/\s*/g, '/')
        .toUpperCase()
        .trim();

    return processed;
}

function extractInvoiceNumbers(rawText) {
    if (!rawText) return [];
    const invoiceNumbers = new Set();

    for (const pattern of INVOICE_PATTERNS) {
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(rawText)) !== null) {
            const invoiceNum = (match[1] || match[0]).trim().toUpperCase();
            if (invoiceNum.length >= 3) {
                invoiceNumbers.add(invoiceNum);
            }
        }
    }
    return Array.from(invoiceNumbers);
}

// ============================================================================
// TEST FUNCTIONS
// ============================================================================

async function testPlateOCR() {
    console.log('\n' + '='.repeat(60));
    console.log('TEST 1: License Plate OCR (Bengali → English)');
    console.log('='.repeat(60));
    console.log('Expected: DHAKA METRO-GA 31-9157');
    console.log('Image: assets/images.jpg\n');

    const imagePath = path.join(__dirname, 'assets', 'images.jpg');

    if (!fs.existsSync(imagePath)) {
        console.error('ERROR: Image not found at', imagePath);
        return;
    }

    console.log('Starting Tesseract OCR (Bengali + English)...');
    const startTime = Date.now();

    try {
        const result = await Tesseract.recognize(
            imagePath,
            'ben+eng',
            {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        process.stdout.write(`\rProgress: ${Math.round(m.progress * 100)}%`);
                    }
                }
            }
        );

        const endTime = Date.now();
        console.log('\n');

        console.log('RAW OCR OUTPUT:');
        console.log('-'.repeat(40));
        console.log(result.data.text);
        console.log('-'.repeat(40));

        console.log('\nPOST-PROCESSED OUTPUT:');
        console.log('-'.repeat(40));
        const processed = postProcessPlateText(result.data.text);
        console.log(processed);
        console.log('-'.repeat(40));

        console.log('\nMETRICS:');
        console.log(`  Confidence: ${result.data.confidence.toFixed(1)}%`);
        console.log(`  Processing Time: ${endTime - startTime}ms`);
        console.log(`  Expected: DHAKA METRO-GA 31-9157`);
        console.log(`  Match: ${processed.includes('DHAKA METRO') && processed.includes('31-9157') ? '✅ PASS' : '❌ PARTIAL'}`);

    } catch (error) {
        console.error('OCR Error:', error.message);
    }
}

async function testInvoiceOCR() {
    console.log('\n' + '='.repeat(60));
    console.log('TEST 2: Invoice Number Extraction');
    console.log('='.repeat(60));
    console.log('Expected: INV-DBBA/0325/3219');
    console.log('Image: assets/invoice.jpg\n');

    const imagePath = path.join(__dirname, 'assets', 'invoice.jpg');

    if (!fs.existsSync(imagePath)) {
        console.error('ERROR: Image not found at', imagePath);
        return;
    }

    console.log('Starting Tesseract OCR (English)...');
    const startTime = Date.now();

    try {
        const result = await Tesseract.recognize(
            imagePath,
            'eng',
            {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        process.stdout.write(`\rProgress: ${Math.round(m.progress * 100)}%`);
                    }
                }
            }
        );

        const endTime = Date.now();
        console.log('\n');

        console.log('RAW OCR OUTPUT (first 500 chars):');
        console.log('-'.repeat(40));
        console.log(result.data.text.substring(0, 500));
        console.log('...');
        console.log('-'.repeat(40));

        console.log('\nEXTRACTED INVOICE NUMBERS:');
        console.log('-'.repeat(40));
        const invoiceNumbers = extractInvoiceNumbers(result.data.text);
        console.log(invoiceNumbers.length > 0 ? invoiceNumbers.join(', ') : 'None found');
        console.log('-'.repeat(40));

        console.log('\nMETRICS:');
        console.log(`  Confidence: ${result.data.confidence.toFixed(1)}%`);
        console.log(`  Processing Time: ${endTime - startTime}ms`);
        console.log(`  Expected: INV-DBBA/0325/3219`);
        console.log(`  Match: ${invoiceNumbers.some(n => n.includes('INV-DBBA')) ? '✅ PASS' : '❌ CHECK MANUALLY'}`);

    } catch (error) {
        console.error('OCR Error:', error.message);
    }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
    console.log('\n🔍 OCR ENGINE TEST SUITE');
    console.log('Testing Tesseract.js with Bengali + English support\n');

    await testPlateOCR();
    await testInvoiceOCR();

    console.log('\n' + '='.repeat(60));
    console.log('TEST COMPLETE');
    console.log('='.repeat(60) + '\n');
}

main().catch(console.error);
