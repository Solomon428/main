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
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Upload, Trash2, CheckCircle, Loader2 } from "lucide-react";
import { BulkUploadDialogProps } from "./types";
import { useBulkUpload } from "./useBulkUpload";
import { FileStatusTable } from "./FileStatusTable";

export function BulkUploadDialog({
  open,
  onOpenChange,
  onSuccess,
}: BulkUploadDialogProps) {
  const {
    files,
    isProcessing,
    isUploading,
    overallProgress,
    completedCount,
    failedCount,
    pendingCount,
    handleFileSelect,
    handleDrop,
    removeFile,
    clearAll,
    handleUpload,
  } = useBulkUpload(onSuccess, onOpenChange);

  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Upload Invoices</DialogTitle>
          <DialogDescription>
            Upload multiple invoice files for automatic OCR processing.
          </DialogDescription>
        </DialogHeader>

        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            files.length === 0 ? 'border-gray-300 hover:border-gray-400' : ''
          }`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.tiff"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          <div
            onClick={() => inputRef.current?.click()}
            className="cursor-pointer"
          >
            <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium">
              Click to select files or drag and drop
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              PDF, JPG, PNG, TIFF files (max 50MB each, max 20 files)
            </p>
          </div>
        </div>

        {files.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {files.length} file(s) selected
                </span>
                {completedCount > 0 && (
                  <Badge variant="success" className="text-xs">
                    {completedCount} completed
                  </Badge>
                )}
                {failedCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {failedCount} failed
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                disabled={isProcessing}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            </div>

            {(isProcessing || isUploading) && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Overall Progress</span>
                  <span>{overallProgress}%</span>
                </div>
                <Progress value={overallProgress} className="h-2" />
              </div>
            )}

            <FileStatusTable
              files={files}
              isProcessing={isProcessing || isUploading}
              onRemove={removeFile}
            />
          </div>
        )}

        {completedCount === files.length && files.length > 0 && (
          <Alert className="bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription>
              Successfully processed {completedCount} invoice(s).
              {failedCount > 0 && ` ${failedCount} failed.`}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={files.length === 0 || isProcessing || pendingCount === 0}
          >
            {isProcessing || isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing {files.length} files...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload {files.length} File(s)
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default BulkUploadDialog;
