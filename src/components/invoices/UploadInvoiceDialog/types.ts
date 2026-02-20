export interface UploadInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export interface Supplier {
  id: string;
  name: string;
}

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
}

export interface ExtractedDataPreview {
  invoiceNumber?: string;
  supplierName?: string;
  issueDate?: string;
  dueDate?: string;
  totalAmount?: number;
  currency?: string;
  confidence: number;
  lineItems: LineItem[];
}

export interface ManualFormState {
  invoiceNumber: string;
  supplierId: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: string;
  vatAmount: string;
  notes: string;
  currency: string;
}

export type UploadStage = "idle" | "uploading" | "preview" | "success";
