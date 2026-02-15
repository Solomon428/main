export interface BulkUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export interface FileWithStatus {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: {
    invoiceId?: string;
    extractionId?: string;
    confidence?: number;
    message?: string;
  };
  error?: string;
}
