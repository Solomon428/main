"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { UploadResult, UploadProgress } from "@/hooks/useFileUpload";
import {
  Supplier,
  ExtractedDataPreview,
  ManualFormState,
  UploadStage,
  UploadInvoiceDialogProps,
} from "./types";

export function useUploadInvoice(
  open: boolean,
  onOpenChange: (open: boolean) => void,
  onSuccess: () => void,
  uploadFile: (file: File, options: { autoProcess: boolean; extractionMethod: string }) => Promise<void>,
  isUploading: boolean,
  result: UploadResult | null,
  error: Error | null,
  reset: () => void
) {
  const [activeTab, setActiveTab] = useState("file");
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [uploadStage, setUploadStage] = useState<UploadStage>("idle");
  const [extractedData, setExtractedData] = useState<ExtractedDataPreview | null>(null);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [manualForm, setManualForm] = useState<ManualFormState>({
    invoiceNumber: "",
    supplierId: "",
    invoiceDate: "",
    dueDate: "",
    totalAmount: "",
    vatAmount: "",
    notes: "",
    currency: "ZAR",
  });

  useEffect(() => {
    if (open) {
      fetchSuppliers();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  useEffect(() => {
    if (result?.extractedData && result.status === "completed") {
      setExtractedData({
        invoiceNumber: result.extractedData.invoiceNumber,
        supplierName: result.extractedData.supplierName,
        issueDate: result.extractedData.issueDate,
        dueDate: result.extractedData.dueDate,
        totalAmount: result.extractedData.totalAmount,
        currency: result.extractedData.currency,
        confidence: result.extractedData.confidence,
        lineItems: result.extractedData.lineItems || [],
      });
      setUploadStage("preview");
    } else if (result?.status === "completed") {
      setUploadStage("success");
      setTimeout(() => {
        handleClose();
        onSuccess();
      }, 1500);
    }
  }, [result, onSuccess]);

  const fetchSuppliers = async () => {
    try {
      const response = await fetch("/api/suppliers?limit=100");
      const result = await response.json();
      if (result.success && result.data?.suppliers) {
        setSuppliers(result.data.suppliers);
      }
    } catch (err) {
      console.error("Failed to fetch suppliers:", err);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/tiff",
    ];
    const maxSize = 50 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) return;
    if (file.size > maxSize) return;

    setFile(file);
    reset();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploadStage("uploading");
    setProgress({ stage: "uploading", progress: 0, message: "Starting upload..." });

    try {
      await uploadFile(file, {
        autoProcess: true,
        extractionMethod: "ocr",
      });
    } catch (err) {
      console.error("Upload failed:", err);
      setUploadStage("idle");
    }
  };

  const handleManualSubmit = async () => {
    try {
      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceNumber: manualForm.invoiceNumber,
          supplierId: manualForm.supplierId,
          invoiceDate: manualForm.invoiceDate,
          dueDate: manualForm.dueDate,
          totalAmount: parseFloat(manualForm.totalAmount),
          vatAmount: manualForm.vatAmount ? parseFloat(manualForm.vatAmount) : undefined,
          notes: manualForm.notes,
          currency: manualForm.currency,
          source: "MANUAL",
        }),
      });

      const data = await response.json();

      if (data.success) {
        setUploadStage("success");
        setTimeout(() => {
          handleClose();
          onSuccess();
        }, 1500);
      }
    } catch (err) {
      console.error("Manual submission failed:", err);
    }
  };

  const handleConfirmExtractedData = async () => {
    if (result?.invoiceId) {
      setUploadStage("success");
      setTimeout(() => {
        handleClose();
        onSuccess();
      }, 1500);
    }
  };

  const handleRetry = () => {
    setUploadStage("idle");
    setProgress(null);
    reset();
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setFile(null);
    setUploadStage("idle");
    setExtractedData(null);
    setProgress(null);
    reset();
    setManualForm({
      invoiceNumber: "",
      supplierId: "",
      invoiceDate: "",
      dueDate: "",
      totalAmount: "",
      vatAmount: "",
      notes: "",
      currency: "ZAR",
    });
  };

  const formatCurrency = (amount?: number, currency: string = "ZAR") => {
    if (amount === undefined) return "-";
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency,
    }).format(amount);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "text-green-600";
    if (confidence >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const updateManualForm = (updates: Partial<ManualFormState>) => {
    setManualForm((prev) => ({ ...prev, ...updates }));
  };

  const isManualFormValid =
    manualForm.invoiceNumber &&
    manualForm.supplierId &&
    manualForm.invoiceDate &&
    manualForm.dueDate &&
    manualForm.totalAmount;

  return {
    activeTab,
    setActiveTab,
    file,
    setFile,
    dragActive,
    setDragActive,
    suppliers,
    uploadStage,
    setUploadStage,
    extractedData,
    setExtractedData,
    progress,
    setProgress,
    inputRef,
    manualForm,
    handleDrag,
    handleDrop,
    handleFileChange,
    handleUpload,
    handleManualSubmit,
    handleConfirmExtractedData,
    handleRetry,
    handleClose,
    resetForm,
    formatCurrency,
    getConfidenceColor,
    updateManualForm,
    isManualFormValid,
    validateAndSetFile,
  };
}
