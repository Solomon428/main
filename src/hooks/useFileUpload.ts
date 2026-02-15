// ============================================================================
// File Upload Hook with OCR Integration
// ============================================================================

import { useState, useCallback, useRef } from 'react';

export interface UploadProgress {
  stage: 'uploading' | 'ocr' | 'extracting' | 'validating' | 'creating' | 'completed' | 'failed';
  progress: number;
  message: string;
  details?: Record<string, any>;
}

export interface ExtractionResult {
  invoiceNumber?: string;
  supplierName?: string;
  supplierVatNumber?: string;
  issueDate?: string;
  dueDate?: string;
  totalAmount?: number;
  subtotalAmount?: number;
  taxAmount?: number;
  currency?: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    confidence: number;
  }>;
  confidence: number;
  extractionMethod: string;
  warnings: string[];
  errors: string[];
}

export interface UploadResult {
  fileAttachmentId: string;
  extractionId?: string;
  invoiceId?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  extractedData?: ExtractionResult;
  confidence?: number;
  message: string;
  warnings: string[];
  errors: string[];
}

interface UseFileUploadOptions {
  onProgress?: (progress: UploadProgress) => void;
  onSuccess?: (result: UploadResult) => void;
  onError?: (error: Error) => void;
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const uploadFile = useCallback(async (
    file: File,
    params: {
      supplierId?: string;
      autoProcess?: boolean;
      extractionMethod?: 'ocr' | 'manual' | 'hybrid';
    } = {}
  ): Promise<UploadResult> => {
    setIsUploading(true);
    setError(null);
    setResult(null);

    abortControllerRef.current = new AbortController();

    try {
      const formData = new FormData();
      formData.append('invoice', file);
      
      if (params.supplierId) {
        formData.append('supplierId', params.supplierId);
      }
      formData.append('autoProcess', String(params.autoProcess !== false));
      formData.append('extractionMethod', params.extractionMethod || 'ocr');

      const response = await fetch('/api/invoices/upload', {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current.signal,
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error?.message || 'Upload failed');
      }

      const uploadResult: UploadResult = data.data;
      setResult(uploadResult);
      options.onSuccess?.(uploadResult);
      
      return uploadResult;

    } catch (err) {
      const uploadError = err instanceof Error ? err : new Error('Unknown upload error');
      setError(uploadError);
      options.onError?.(uploadError);
      throw uploadError;
    } finally {
      setIsUploading(false);
      setProgress(null);
    }
  }, [options]);

  const uploadMultiple = useCallback(async (
    files: File[],
    params: {
      supplierId?: string;
      autoProcess?: boolean;
      extractionMethod?: 'ocr' | 'manual' | 'hybrid';
    } = {}
  ): Promise<UploadResult[]> => {
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      files.forEach(file => formData.append('invoices', file));
      
      if (params.supplierId) {
        formData.append('supplierId', params.supplierId);
      }
      formData.append('autoProcess', String(params.autoProcess !== false));
      formData.append('extractionMethod', params.extractionMethod || 'ocr');

      const response = await fetch('/api/files/invoices/bulk-upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Bulk upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error?.message || 'Bulk upload failed');
      }

      return data.data.results;

    } catch (err) {
      const uploadError = err instanceof Error ? err : new Error('Unknown upload error');
      setError(uploadError);
      options.onError?.(uploadError);
      throw uploadError;
    } finally {
      setIsUploading(false);
    }
  }, [options]);

  const cancelUpload = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsUploading(false);
    setProgress(null);
  }, []);

  const reset = useCallback(() => {
    setIsUploading(false);
    setProgress(null);
    setResult(null);
    setError(null);
  }, []);

  return {
    uploadFile,
    uploadMultiple,
    cancelUpload,
    reset,
    isUploading,
    progress,
    result,
    error,
  };
}

export default useFileUpload;
