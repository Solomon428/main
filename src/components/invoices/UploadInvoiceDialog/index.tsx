"use client";

import { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useFileUpload } from "@/hooks/useFileUpload";
import {
  Upload,
  File,
  X,
  AlertCircle,
  CheckCircle,
  Loader2,
  FileText,
} from "lucide-react";
import { UploadInvoiceDialogProps } from "./types";
import { useUploadInvoice } from "./useUploadInvoice";
import { UploadProgressView } from "./UploadProgress";
import { ExtractedDataPreviewView } from "./ExtractedDataPreview";

export function UploadInvoiceDialog({
  open,
  onOpenChange,
  onSuccess,
}: UploadInvoiceDialogProps) {
  const { uploadFile, isUploading, result, error, reset } = useFileUpload({
    onProgress: (p) => upload.setProgress(p),
  });

  const upload = useUploadInvoice(
    open,
    onOpenChange,
    onSuccess,
    uploadFile as any,
    isUploading,
    result,
    error,
    reset
  );

  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {upload.uploadStage === "preview"
              ? "Review Extracted Data"
              : "Upload Invoice"}
          </DialogTitle>
          <DialogDescription>
            {upload.uploadStage === "preview"
              ? "Please review the extracted invoice data before confirming."
              : "Upload a PDF or image file to automatically extract invoice data using OCR."}
          </DialogDescription>
        </DialogHeader>

        {upload.uploadStage === "success" ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <h3 className="text-lg font-semibold">Invoice Created Successfully!</h3>
            <p className="text-sm text-muted-foreground">
              The invoice has been uploaded and is being processed.
            </p>
          </div>
        ) : upload.uploadStage === "preview" && upload.extractedData ? (
          <ExtractedDataPreviewView
            extractedData={upload.extractedData}
            result={result}
            onRetry={upload.handleRetry}
            onConfirm={upload.handleConfirmExtractedData}
          />
        ) : upload.uploadStage === "uploading" ? (
          <UploadProgressView progress={upload.progress} isUploading={isUploading} />
        ) : (
          <Tabs value={upload.activeTab} onValueChange={upload.setActiveTab} className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="file">Upload with OCR</TabsTrigger>
              <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            </TabsList>

            <TabsContent value="file" className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  upload.dragActive
                    ? "border-primary bg-primary/5"
                    : "border-gray-300 hover:border-gray-400"
                }`}
                onDragEnter={upload.handleDrag}
                onDragLeave={upload.handleDrag}
                onDragOver={upload.handleDrag}
                onDrop={upload.handleDrop}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.tiff"
                  onChange={upload.handleFileChange}
                  className="hidden"
                />

                {upload.file ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="h-8 w-8 text-primary" />
                    <div className="text-left">
                      <p className="font-medium">{upload.file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(upload.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => upload.setFile(null)}
                      className="ml-2"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    onClick={() => inputRef.current?.click()}
                    className="cursor-pointer"
                  >
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="font-medium">Click to upload or drag and drop</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      PDF, JPG, PNG, TIFF (max 50MB)
                    </p>
                  </div>
                )}
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error.message}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="supplier-select">Supplier (optional)</Label>
                <Select
                  value={upload.manualForm.supplierId || undefined}
                  onValueChange={(value) =>
                    upload.updateManualForm({ supplierId: value })
                  }
                >
                  <SelectTrigger id="supplier-select">
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto-detect">Auto-detect</SelectItem>
                    {upload.suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select a supplier to improve extraction accuracy
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={upload.handleUpload}
                  disabled={!upload.file || isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload & Process
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="manual" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="invoiceNumber">Invoice Number *</Label>
                  <Input
                    id="invoiceNumber"
                    value={upload.manualForm.invoiceNumber}
                    onChange={(e) =>
                      upload.updateManualForm({ invoiceNumber: e.target.value })
                    }
                    placeholder="INV-2024-001"
                  />
                </div>
                <div>
                  <Label htmlFor="supplierId">Supplier *</Label>
                  <Select
                    value={upload.manualForm.supplierId || undefined}
                    onValueChange={(value) =>
                      upload.updateManualForm({ supplierId: value })
                    }
                  >
                    <SelectTrigger id="supplierId">
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {upload.suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="invoiceDate">Invoice Date *</Label>
                  <Input
                    id="invoiceDate"
                    type="date"
                    value={upload.manualForm.invoiceDate}
                    onChange={(e) =>
                      upload.updateManualForm({ invoiceDate: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="dueDate">Due Date *</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={upload.manualForm.dueDate}
                    onChange={(e) =>
                      upload.updateManualForm({ dueDate: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="totalAmount">Total Amount *</Label>
                  <Input
                    id="totalAmount"
                    type="number"
                    step="0.01"
                    value={upload.manualForm.totalAmount}
                    onChange={(e) =>
                      upload.updateManualForm({ totalAmount: e.target.value })
                    }
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="vatAmount">VAT Amount</Label>
                  <Input
                    id="vatAmount"
                    type="number"
                    step="0.01"
                    value={upload.manualForm.vatAmount}
                    onChange={(e) =>
                      upload.updateManualForm({ vatAmount: e.target.value })
                    }
                    placeholder="Auto"
                  />
                </div>
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={upload.manualForm.currency || "ZAR"}
                    onValueChange={(value) =>
                      upload.updateManualForm({ currency: value })
                    }
                  >
                    <SelectTrigger id="currency">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ZAR">ZAR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={upload.manualForm.notes}
                  onChange={(e) =>
                    upload.updateManualForm({ notes: e.target.value })
                  }
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={upload.handleManualSubmit}
                  disabled={!upload.isManualFormValid}
                >
                  Create Invoice
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default UploadInvoiceDialog;
