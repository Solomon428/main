"use client";

import { AlertCircle, CheckCircle, RefreshCw, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ExtractedDataPreview } from "./types";
import { UploadResult } from "@/hooks/useFileUpload";

interface ExtractedDataPreviewProps {
  extractedData: ExtractedDataPreview;
  result: UploadResult | null;
  onRetry: () => void;
  onConfirm: () => void;
}

export function ExtractedDataPreviewView({
  extractedData,
  result,
  onRetry,
  onConfirm,
}: ExtractedDataPreviewProps) {
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

  return (
    <div className="space-y-4">
      <Alert className={extractedData.confidence >= 60 ? "bg-green-50" : "bg-yellow-50"}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Data extracted with{" "}
          <span className={getConfidenceColor(extractedData.confidence)}>
            {extractedData.confidence.toFixed(1)}% confidence
          </span>
          {extractedData.confidence < 60 && (
            <span className="block mt-1 text-xs">
              Please review and correct the extracted data before confirming.
            </span>
          )}
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <Label className="text-muted-foreground">Invoice Number</Label>
          <p className="font-medium">{extractedData.invoiceNumber || "-"}</p>
        </div>
        <div>
          <Label className="text-muted-foreground">Supplier</Label>
          <p className="font-medium">{extractedData.supplierName || "-"}</p>
        </div>
        <div>
          <Label className="text-muted-foreground">Issue Date</Label>
          <p className="font-medium">
            {extractedData.issueDate
              ? new Date(extractedData.issueDate).toLocaleDateString()
              : "-"}
          </p>
        </div>
        <div>
          <Label className="text-muted-foreground">Due Date</Label>
          <p className="font-medium">
            {extractedData.dueDate
              ? new Date(extractedData.dueDate).toLocaleDateString()
              : "-"}
          </p>
        </div>
        <div>
          <Label className="text-muted-foreground">Total Amount</Label>
          <p className="font-medium">
            {formatCurrency(extractedData.totalAmount, extractedData.currency)}
          </p>
        </div>
        <div>
          <Label className="text-muted-foreground">Currency</Label>
          <p className="font-medium">{extractedData.currency || "ZAR"}</p>
        </div>
      </div>

      {extractedData.lineItems.length > 0 && (
        <div className="space-y-2">
          <Label className="text-muted-foreground">
            Line Items ({extractedData.lineItems.length})
          </Label>
          <div className="max-h-40 overflow-y-auto border rounded-md">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-3 py-2 text-left">Description</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-right">Price</th>
                  <th className="px-3 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {extractedData.lineItems.slice(0, 5).map((item, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="px-3 py-2 truncate max-w-[150px]">
                      {item.description}
                    </td>
                    <td className="px-3 py-2 text-right">{item.quantity}</td>
                    <td className="px-3 py-2 text-right">
                      {formatCurrency(item.unitPrice, extractedData.currency)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatCurrency(item.totalAmount, extractedData.currency)}
                    </td>
                  </tr>
                ))}
                {extractedData.lineItems.length > 5 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-2 text-center text-muted-foreground"
                    >
                      +{extractedData.lineItems.length - 5} more items
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {result?.warnings && result.warnings.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-yellow-600">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">Warnings</span>
          </div>
          <ul className="text-xs text-muted-foreground space-y-1 pl-6">
            {result.warnings.slice(0, 5).map((warning, idx) => (
              <li key={idx}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
        <Button onClick={onConfirm}>
          <CheckCircle className="h-4 w-4 mr-2" />
          Confirm & Create Invoice
        </Button>
      </div>
    </div>
  );
}
