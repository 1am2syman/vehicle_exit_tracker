# Edit Icon Feature Implementation Plan

> **Created**: 2026-01-15 14:49 (UTC+6)  
> **Status**: PENDING REVIEW

---

## Goal

Add inline edit icons (✏️) next to extracted OCR data fields, allowing users to correct Vehicle Number and Invoice Numbers after parsing.

---

## Technical Analysis

**Current State** (lines 892-901 in `index.html`):
```html
<div class="data-item">
    <span class="data-label">Vehicle Number:</span>
    <span id="extractedVehicleNumber" class="data-value">--</span>
    <span id="vehicleConfidence" class="confidence-badge">--%</span>
</div>
```

**Problem**: Read-only `<span>` elements with no edit affordance.

**Solution**:
1. Add pencil icon button after each `.data-value` span
2. On click: Hide span, show `<input>` with current value
3. On Enter/blur: Save value to `state`, revert to span
4. On Escape: Cancel edit, revert without saving
5. Update confidence badge to "Edited"

---

## Proposed Changes

### [MODIFY] [index.html](file:///c:/Users/USER/vehicle_exit_tracker/index.html)

**CSS** (add after line ~463):
```css
/* Edit Icon Styles */
.edit-icon-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0.25rem;
    margin-left: 0.5rem;
    color: var(--text-secondary);
    opacity: 0.6;
    transition: opacity 0.2s, color 0.2s;
    vertical-align: middle;
}

.edit-icon-btn:hover,
.edit-icon-btn:focus {
    opacity: 1;
    color: var(--primary);
}

.edit-icon-btn svg {
    width: 16px;
    height: 16px;
}

.data-value.editing { display: none; }

.data-value-input {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
    background: var(--surface);
    border: 1px solid var(--primary);
    border-radius: 4px;
    padding: 0.25rem 0.5rem;
    width: 100%;
    max-width: 250px;
}

.data-value-input:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
}
```

**HTML** (replace lines 892-901):
```html
<div class="data-item">
    <span class="data-label">Vehicle Number:</span>
    <span id="extractedVehicleNumber" class="data-value">--</span>
    <input type="text" id="vehicleNumberInput" class="data-value-input hidden" aria-label="Edit vehicle number">
    <button class="edit-icon-btn" id="editVehicleBtn" aria-label="Edit vehicle number">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
    </button>
    <span id="vehicleConfidence" class="confidence-badge">--%</span>
</div>
<div class="data-item">
    <span class="data-label">Invoice Numbers:</span>
    <span id="extractedInvoiceNumbers" class="data-value">--</span>
    <input type="text" id="invoiceNumbersInput" class="data-value-input hidden" aria-label="Edit invoice numbers">
    <button class="edit-icon-btn" id="editInvoiceBtn" aria-label="Edit invoice numbers">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
    </button>
    <span id="invoiceConfidence" class="confidence-badge">--%</span>
</div>
```

**JavaScript** (add to `elements` object ~line 1028):
```javascript
vehicleNumberInput: document.getElementById('vehicleNumberInput'),
invoiceNumbersInput: document.getElementById('invoiceNumbersInput'),
editVehicleBtn: document.getElementById('editVehicleBtn'),
editInvoiceBtn: document.getElementById('editInvoiceBtn'),
```

**JavaScript** (add after line ~1553):
```javascript
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
```

**Initialize** (add after line 1706 in DOMContentLoaded):
```javascript
initEditableFields();
```

---

## Verification

1. Capture plate + invoice → Parse
2. Click ✏️ next to "Vehicle Number" → input appears, text selected
3. Type new value → press Enter → span updates, shows "Edited"
4. Click ✏️ next to "Invoice Numbers" → repeat
5. Press Escape while editing → reverts without saving
6. Submit → edited values appear in success message

---

## Questions

> [!IMPORTANT]
> **Q1**: Edited confidence display:
> - (A) "Edited" ← *Proposed*
> - (B) "100%"
> - (C) Hide badge

> [!IMPORTANT]
> **Q2**: Edit availability:
> - (A) Always after parse ← *Proposed*
> - (B) Only when confidence < 80%

---

**Awaiting approval to implement.**
