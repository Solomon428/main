"use client";

import { Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { UploadProgress } from "@/hooks/useFileUpload";

interface UploadProgressProps {
  progress: UploadProgress | null;
  isUploading: boolean;
}

const stageLabels: Record<string, string> = {
  uploading: "Uploading file...",
  ocr: "Extracting text with OCR...",
  extracting: "Parsing invoice data...",
  validating: "Validating extracted data...",
  creating: "Creating invoice...",
  completed: "Completed!",
  failed: "Processing failed",
};

export function UploadProgressView({ progress, isUploading }: UploadProgressProps) {
  if (!progress && isUploading) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Processing...</p>
      </div>
    );
  }

  if (!progress) return null;

  return (
    <div className="space-y-4 py-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{stageLabels[progress.stage]}</span>
        <span className="text-sm text-muted-foreground">{progress.progress}%</span>
      </div>
      <Progress value={progress.progress} className="h-2" />
      {progress.message && (
        <p className="text-xs text-muted-foreground">{progress.message}</p>
      )}
      {progress.details && (
        <div className="text-xs text-muted-foreground space-y-1">
          {progress.details.invoiceNumber && (
            <p>Invoice: {progress.details.invoiceNumber}</p>
          )}
          {progress.details.lineItems !== undefined && (
            <p>Line items: {progress.details.lineItems}</p>
          )}
        </div>
      )}
    </div>
  );
}
