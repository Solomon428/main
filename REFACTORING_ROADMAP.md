# CreditorFlow Nuclear Refactoring Roadmap
## State Vector Target: C* = (429, ∅, ∅, 36, 40, 15)

### Current Status
✅ **D₁ (UploadInvoiceDialog)**: Split complete - all files ≤ 350 lines  
✅ **D₂ (BulkUploadDialog)**: Split complete - all files ≤ 350 lines  
⏳ **SoftList S (22 files)**: Pending - all need to be ≤ 600 lines

---

## SoftList S Files Requiring Split

### Priority 1: Critical (>1200 lines) - Split First

#### 1. `src/lib/pdf-processor.ts` (2339 lines → target: 4 modules)
**Current Structure:**
- Static constants (lines 75-112)
- Main processInvoice() method (lines 122-392)
- analyzeDocumentQuality() (lines 393-471)
- determineExtractionMethod() (lines 472-512)
- performExtraction() (lines 513-583)
- extractWithNativePDF() (lines 584-681)
- structureExtractedData() (lines 682-803)
- performComprehensiveValidation() (lines 804-931)
- calculateQualityScores() (lines 932-1013)
- generateProcessingInsights() (lines 1014-1138)
- createFailureResult() (lines 1139-1343)
- Utility methods (lines 1344-1806)
- OCR extraction methods (lines 1807-1891)
- Validation methods (lines 1892-2339)

**Proposed Split:**
```
src/lib/pdf-processor/
├── types.ts              # ProcessingException, PDFProcessingOptions (local types)
├── constants.ts          # MAX_FILE_SIZE, SUPPORTED_MIME_TYPES, OCR_ENGINES, QUALITY_THRESHOLDS
├── utils.ts              # saveTempFile, cleanupTempFiles, readFile, normalizeText, cleanText, detectLanguage, generateRandomString, createAuditEntry
├── extraction.ts         # extractWithNativePDF, extractWithTesseractOCR, extractWithAzureOCR, extractWithGoogleOCR, extractWithAmazonOCR, extractWithOllamaOCR
├── quality.ts            # analyzeDocumentQuality, determineExtractionMethod
├── validation.ts         # validateDocumentStructure, validateSemanticContent, performComprehensiveValidation, calculateQualityScores
├── extractors.ts         # extractInvoiceNumber, extractInvoiceDate, extractSupplierVAT, extractTotalAmount, detectDocumentType
├── data-structuring.ts   # structureExtractedData, generateProcessingInsights
├── core.ts               # PDFProcessor class with processInvoice() main orchestrator
└── index.ts              # Re-exports
```

**Estimated Lines Per Module:**
- types.ts: ~50 lines
- constants.ts: ~60 lines
- utils.ts: ~150 lines
- extraction.ts: ~250 lines
- quality.ts: ~200 lines
- validation.ts: ~250 lines
- extractors.ts: ~200 lines
- data-structuring.ts: ~250 lines
- core.ts: ~300 lines
- index.ts: ~20 lines

---

#### 2. `src/logic-engine/risk/fraud-scorer.ts` (1805 lines → target: 3 modules)
**Proposed Split:**
```
src/logic-engine/risk/fraud-scorer/
├── types.ts              # FraudScore, RiskFactors, FraudIndicators
├── constants.ts          # Risk thresholds, weights, scoring matrices
├── analyzers.ts          # Individual risk analysis functions
├── scoring.ts            # Scoring algorithms and calculations
├── core.ts               # FraudScorer class
└── index.ts              # Re-exports
```

---

#### 3. `src/modules/files/ocr/ocr.service.impl.ts` (1580 lines → target: 3 modules)
**Proposed Split:**
```
src/modules/files/ocr/
├── types.ts              # OCR types and interfaces
├── constants.ts          # OCR configuration constants
├── engines/              # OCR engine implementations
│   ├── tesseract.ts
│   ├── azure.ts
│   ├── google.ts
│   └── base.ts
├── preprocessing.ts      # Image preprocessing logic
├── postprocessing.ts     # Text post-processing logic
├── core.ts               # OCRServiceImpl class
└── index.ts              # Re-exports
```

---

#### 4. `src/logic-engine/compliance/vat-validator.impl.ts` (1271 lines → target: 3 modules)
**Proposed Split:**
```
src/logic-engine/compliance/vat-validator/
├── types.ts              # VAT validation types
├── constants.ts          # Country codes, VAT patterns
├── validators/           # Country-specific validators
│   ├── eu.ts
│   ├── uk.ts
│   └── generic.ts
├── core.ts               # VATValidator class
└── index.ts              # Re-exports
```

---

#### 5. `src/logic-engine/duplicates/advanced-duplicate-detector.impl.ts` (1224 lines → target: 3 modules)
**Proposed Split:**
```
src/logic-engine/duplicates/
├── types.ts              # Duplicate detection types
├── constants.ts          # Similarity thresholds
├── algorithms.ts         # Fuzzy matching algorithms
├── hash.ts               # Hash-based detection
├── scoring.ts            # Duplicate scoring
├── core.ts               # AdvancedDuplicateDetector class
└── index.ts              # Re-exports
```

---

### Priority 2: High (1000-1200 lines)

#### 6. `src/modules/files/ocr/extraction.service.impl.ts` (1188 lines)
Split into: types, constants, extractors/, core.ts, index.ts

#### 7. `src/modules/files/file-attachments.service.impl.ts` (1099 lines)
Split into: types, constants, storage/, processing/, core.ts, index.ts

#### 8. `src/services/reporting-service.impl.ts` (1072 lines)
Split into: types, constants, generators/, exporters/, core.ts, index.ts

---

### Priority 3: Medium (800-1000 lines)

#### 9. `src/logic-engine/approval-engine/approver-router.impl.ts` (991 lines)
#### 10. `src/services/compliance-service.impl.ts` (952 lines)
#### 11. `src/services/approver-router.impl.ts` (875 lines)
#### 12. `src/services/approval-service.impl.ts` (872 lines)
#### 13. `src/modules/files/files.routes.impl.ts` (812 lines)
#### 14. `src/services/invoice-service.impl.ts` (801 lines)

---

### Priority 4: Lower (600-800 lines)

#### 15. `src/services/invoice-parser.ts` (744 lines)
#### 16. `src/services/advanced-duplicate-detector.impl.ts` (716 lines)
#### 17. `src/app/invoices/InvoiceDetailDialog.impl.tsx` (707 lines)
#### 18. `src/lib/utils/pdf-extractor.ts` (693 lines)
#### 19. `src/services/enhanced-notification-service.ts` (659 lines)
#### 20. `src/modules/invoices/compliance_checks.service.ts` (656 lines)
#### 21. `src/modules/invoices/risk-assessment.service.ts` (653 lines)
#### 22. `src/services/advanced-search-service.ts` (602 lines)

---

## Implementation Patterns

### Pattern A: Service/Class Split
For classes with many methods:
1. Extract types to `types.ts`
2. Extract constants to `constants.ts`
3. Group related methods into logical modules
4. Keep main orchestrator in `core.ts`
5. Re-export from `index.ts`

### Pattern B: Component Split (React)
For large React components:
1. Extract types/interfaces to `types.ts`
2. Extract hooks to `useXXX.ts`
3. Extract sub-components to separate files
4. Extract utilities to `utils.ts`
5. Keep main component slim in `index.tsx`

### Pattern C: Route Handler Split
For large API routes:
1. Extract validation schemas
2. Extract business logic to service modules
3. Keep route handler as thin controller
4. Group related endpoints

---

## Verification Checklist

For each file split:
- [ ] All modules ≤ 600 lines (350 for D₁/D₂)
- [ ] No circular dependencies
- [ ] All imports preserved
- [ ] TypeScript compiles without errors
- [ ] Exported API unchanged
- [ ] Tests pass (if applicable)

---

## Current Progress

| Directory | Files | Status | Max Lines |
|-----------|-------|--------|-----------|
| D₁ (UploadInvoiceDialog) | 5 | ✅ Complete | 331 |
| D₂ (BulkUploadDialog) | 5 | ✅ Complete | 153 |
| SoftList S | 22 | ⏳ In Progress | TBD |

**Next Actions:**
1. Split pdf-processor.ts (2339 lines)
2. Split fraud-scorer.ts (1805 lines)
3. Split ocr.service.impl.ts (1580 lines)
4. Continue with remaining 19 files...
