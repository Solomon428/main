"use client";

import { useState, useRef, useCallback } from "react";
import { useFileUpload } from "@/hooks/useFileUpload";
import { FileWithStatus, BulkUploadDialogProps } from "./types";

export function useBulkUpload(
  onSuccess: () => void,
  onOpenChange: (open: boolean) => void
) {
  const [files, setFiles] = useState<FileWithStatus[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { uploadMultiple, isUploading } = useFileUpload();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles: FileWithStatus[] = Array.from(e.target.files).map((file) => ({
        file,
        id: Math.random().toString(36).substring(7),
        status: 'pending',
        progress: 0,
      }));
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const validFiles = Array.from(e.dataTransfer.files).filter((file) => {
        const allowedTypes = [
          'application/pdf',
          'image/jpeg',
          'image/png',
          'image/tiff',
        ];
        return allowedTypes.includes(file.type);
      });

      const newFiles: FileWithStatus[] = validFiles.map((file) => ({
        file,
        id: Math.random().toString(36).substring(7),
        status: 'pending',
        progress: 0,
      }));
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const clearAll = () => {
    setFiles([]);
    setOverallProgress(0);
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);

    try {
      const fileList = files.map((f) => f.file);
      const results = await uploadMultiple(fileList, {
        autoProcess: true,
        extractionMethod: 'ocr',
      });

      setFiles((prev) =>
        prev.map((fileStatus, index) => {
          const result = results[index];
          if (!result) return fileStatus;

          return {
            ...fileStatus,
            status: result.status === 'completed' ? 'completed' : 'failed',
            progress: 100,
            result: {
              invoiceId: result.invoiceId,
              extractionId: result.extractionId,
              confidence: result.confidence,
              message: result.message,
            },
            error: result.errors?.[0],
          };
        })
      );

      setOverallProgress(100);

      const successCount = results.filter((r) => r.status === 'completed').length;
      if (successCount > 0) {
        setTimeout(() => {
          onSuccess();
          onOpenChange(false);
          clearAll();
        }, 2000);
      }
    } catch (error) {
      console.error('Bulk upload failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const completedCount = files.filter((f) => f.status === 'completed').length;
  const failedCount = files.filter((f) => f.status === 'failed').length;
  const pendingCount = files.filter((f) => f.status === 'pending').length;

  return {
    files,
    isProcessing,
    isUploading,
    overallProgress,
    inputRef,
    completedCount,
    failedCount,
    pendingCount,
    handleFileSelect,
    handleDrop,
    removeFile,
    clearAll,
    handleUpload,
  };
}
