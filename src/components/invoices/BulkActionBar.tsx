'use client';

import React, { useState } from 'react';
import {
  Check,
  X,
  FileDown,
  UserPlus,
  Trash2,
  MoreHorizontal,
  AlertCircle,
} from 'lucide-react';

interface BulkActionBarProps {
  selectedIds: string[];
  totalSelected: number;
  onApprove: () => void;
  onReject: () => void;
  onExport: (format: 'csv' | 'xlsx' | 'pdf') => void;
  onAssign: () => void;
  onClearSelection: () => void;
  isProcessing?: boolean;
}

export function BulkActionBar({
  selectedIds,
  totalSelected,
  onApprove,
  onReject,
  onExport,
  onAssign,
  onClearSelection,
  isProcessing = false,
}: BulkActionBarProps) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  if (totalSelected === 0) {
    return null;
  }

  const handleReject = () => {
    if (rejectReason.trim()) {
      onReject();
      setShowRejectDialog(false);
      setRejectReason('');
    }
  };

  return (
    <>
      {/* Fixed action bar at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Selection info */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
                  {totalSelected}
                </div>
                <span className="font-medium">invoices selected</span>
              </div>
              <button
                onClick={onClearSelection}
                className="text-sm text-muted-foreground hover:text-foreground underline"
              >
                Clear selection
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Approve */}
              <button
                onClick={onApprove}
                disabled={isProcessing}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                <Check className="h-4 w-4" />
                Approve All
              </button>

              {/* Reject */}
              <button
                onClick={() => setShowRejectDialog(true)}
                disabled={isProcessing}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                <X className="h-4 w-4" />
                Reject All
              </button>

              {/* Assign */}
              <button
                onClick={onAssign}
                disabled={isProcessing}
                className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-muted disabled:opacity-50 transition-colors"
              >
                <UserPlus className="h-4 w-4" />
                Assign
              </button>

              {/* Export dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-muted disabled:opacity-50 transition-colors"
                >
                  <FileDown className="h-4 w-4" />
                  Export
                </button>

                {showExportMenu && (
                  <div className="absolute bottom-full mb-2 right-0 w-40 bg-background border rounded-lg shadow-lg py-1">
                    <button
                      onClick={() => {
                        onExport('csv');
                        setShowExportMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-muted"
                    >
                      Export as CSV
                    </button>
                    <button
                      onClick={() => {
                        onExport('xlsx');
                        setShowExportMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-muted"
                    >
                      Export as Excel
                    </button>
                    <button
                      onClick={() => {
                        onExport('pdf');
                        setShowExportMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-muted"
                    >
                      Export as PDF
                    </button>
                  </div>
                )}
              </div>

              {/* Processing indicator */}
              {isProcessing && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                  <span className="text-sm">Processing...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reject dialog */}
      {showRejectDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-red-100">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold">
                Reject {totalSelected} Invoices
              </h3>
            </div>

            <p className="text-muted-foreground mb-4">
              Please provide a reason for rejecting these invoices. This will be
              recorded in the audit log.
            </p>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              rows={3}
              className="w-full p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectReason('');
                }}
                className="px-4 py-2 hover:bg-muted rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Reject Invoices
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
