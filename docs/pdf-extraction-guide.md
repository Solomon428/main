PDF Extraction Guide for CreditorFlow EMS

Overview
- This guide describes a robust pipeline for extracting text and structured data from invoices in CreditorFlow using a hybrid approach (native text extraction + OCR fallback) integrated with Next.js, Prisma, and PostgreSQL.

1. Invoice PDF Types
- Digital (text-based): extract with pdf-parse.
- Scanned (image-based): OCR with Tesseract.js after converting pages to images.
- Hybrid: mix of text and images; apply native extraction plus selective OCR.

2. Tooling Choices
- pdf-parse for native extraction.
- tesseract.js for OCR in Node.js.
- pdf-poppler to convert PDFs to images for OCR.
- sharp to preprocess images for OCR.
- date-fns and validator for parsing/validation.

3. Hybrid Extraction Service (code structure)
- src/modules/files/ocr/services/pdf-extractor.ts
- src/modules/files/ocr/services/ocr.service.ts
- src/modules/files/ocr/services/hybrid-extractor.ts

4. Parsing Text to Structured Data
- src/modules/invoices/services/invoice-parser.service.ts
- Converts raw text into ParsedInvoice with fields like invoiceNumber, invoiceDate, dueDate, supplierName, totalAmount, lineItems.

5. Prisma Integration
- Extend upload and API endpoints to populate Invoice and related tables using parsed data.
- Include an immutable audit trail for creations/updates.

6. Error Handling and Monitoring
- Use try/catch with clear error messages.
- Centralized logging (AuditLog) for operations on invoices.
- Optional retry/queue for long-running OCR tasks (BullMQ).

7. Performance Considerations
- Concurrency control for OCR tasks.
- Cache OCR results for already processed PDFs.
- Use a queue for asynchronous processing of large batches.

8. Testing
- Unit tests for InvoiceParser with representative samples.
- Integration tests for upload flow with both digital and scanned PDFs.
- End-to-end tests with mocked OCR to verify pipeline.

9. Operational Readiness
- Ensure pdf-poppler and sharp are installed in production.
- Provide toggle to disable OCR for environments without OCR support.
- Monitoring dashboards for extraction success rate and performance.

This guide mirrors the enterprise-ready approach already implemented in the codebase attachments and patches.
