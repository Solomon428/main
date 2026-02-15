'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { Textarea } from '@/components/ui/textarea';
import {
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  FileText,
  User,
  Clock,
  MessageSquare,
  Send,
} from 'lucide-react';

interface InvoiceDetailDialogProps {
  invoiceId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoiceDetailDialog({
  invoiceId,
  open,
  onOpenChange,
}: InvoiceDetailDialogProps) {
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    if (open && invoiceId) {
      fetchInvoice();
      fetchComments();
    }
  }, [open, invoiceId]);

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/comments`);
      const result = await response.json();
      if (result.success) {
        setComments(result.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !invoiceId) return;

    setSubmittingComment(true);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment }),
      });
      const result = await response.json();
      if (result.success) {
        setNewComment('');
        fetchComments();
      }
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const fetchInvoice = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`);
      const result = await response.json();
      if (result.success) {
        setInvoice(result.data);
      } else {
        setError(result.error || 'Failed to fetch invoice');
      }
    } catch (err) {
      setError('Failed to fetch invoice');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'PENDING_APPROVAL':
      case 'PENDING_EXTRACTION':
        return 'bg-yellow-100 text-yellow-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'ESCALATED':
        return 'bg-red-100 text-red-800';
      case 'PAID':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'LOW':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const pdfUrl = invoice?.pdfUrl
    ? `/api/invoices/upload?path=${encodeURIComponent(invoice.pdfUrl)}`
    : null;

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error || !invoice) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <div className="text-center py-8 text-red-500">
            {error || 'Invoice not found'}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <FileText className="h-6 w-6" />
                Invoice {invoice.invoiceNumber}
              </DialogTitle>
              <p className="text-muted-foreground mt-1">
                {invoice.supplierName} • Created {formatDate(invoice.createdAt)}
              </p>
            </div>
            <div className="flex gap-2">
              {pdfUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                    <Eye className="mr-2 h-4 w-4" />
                    View PDF
                  </a>
                </Button>
              )}
              {pdfUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a href={pdfUrl} download>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </a>
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Status Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge className={getStatusColor(invoice.status)}>
            {invoice.status?.replace(/_/g, ' ')}
          </Badge>
          <Badge variant="outline">{invoice.priority} Priority</Badge>
          <Badge className={getRiskColor(invoice.riskLevel)}>
            {invoice.riskLevel} Risk
          </Badge>
          {invoice.isDuplicate && (
            <Badge variant="destructive">Duplicate</Badge>
          )}
          {invoice.requiresAttention && (
            <Badge variant="destructive">Requires Attention</Badge>
          )}
        </div>

        <Tabs defaultValue="details" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="lineitems">Line Items</TabsTrigger>
            <TabsTrigger value="approvals">Approvals</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
            {pdfUrl && <TabsTrigger value="pdf">PDF</TabsTrigger>}
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Invoice Info */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Invoice Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Invoice Number</p>
                      <p className="font-medium">{invoice.invoiceNumber}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">
                        Supplier Invoice #
                      </p>
                      <p className="font-medium">
                        {invoice.supplierInvoiceNo || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Invoice Date</p>
                      <p className="font-medium">
                        {formatDate(invoice.invoiceDate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Due Date</p>
                      <p className="font-medium">
                        {formatDate(invoice.dueDate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Received Date</p>
                      <p className="font-medium">
                        {formatDate(invoice.receivedDate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Currency</p>
                      <p className="font-medium">{invoice.currency}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Supplier Info */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Supplier Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Supplier Name
                    </p>
                    <p className="font-medium">{invoice.supplierName}</p>
                  </div>
                  {invoice.supplierVAT && (
                    <div>
                      <p className="text-sm text-muted-foreground">
                        VAT Number
                      </p>
                      <p className="font-medium">{invoice.supplierVAT}</p>
                    </div>
                  )}
                  {invoice.supplier?.email && (
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{invoice.supplier.email}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Financial Summary */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Financial Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Subtotal (excl VAT)
                      </p>
                      <p className="font-medium">
                        {formatCurrency(
                          invoice.subtotalExclVAT || 0,
                          invoice.currency
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        VAT Amount
                      </p>
                      <p className="font-medium">
                        {formatCurrency(
                          invoice.vatAmount || 0,
                          invoice.currency
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Total Amount
                      </p>
                      <p className="font-medium text-lg text-primary">
                        {formatCurrency(
                          invoice.totalAmount || 0,
                          invoice.currency
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Amount Due
                      </p>
                      <p className="font-medium">
                        {formatCurrency(
                          invoice.amountDue || 0,
                          invoice.currency
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Approval Info */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Approval Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Current Approver
                      </p>
                      <p className="font-medium">
                        {invoice.currentApprover?.name || 'Unassigned'}
                      </p>
                      {invoice.currentApprover?.role && (
                        <p className="text-xs text-muted-foreground">
                          {invoice.currentApprover.role}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Approval Stage
                      </p>
                      <p className="font-medium">
                        {invoice.currentStage} of {invoice.totalStages || 1}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge className={getStatusColor(invoice.status)}>
                        {invoice.status?.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Risk Level
                      </p>
                      <Badge className={getRiskColor(invoice.riskLevel)}>
                        {invoice.riskLevel}
                      </Badge>
                    </div>
                  </div>

                  {/* Approval Chain */}
                  {invoice.approvals && invoice.approvals.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-muted-foreground mb-2">
                        Approval Chain
                      </p>
                      <div className="space-y-2">
                        {invoice.approvals.map((approval: any, idx: number) => (
                          <div
                            key={approval.id}
                            className="flex items-center gap-2 text-sm"
                          >
                            <div
                              className={`w-2 h-2 rounded-full ${
                                approval.status === 'APPROVED'
                                  ? 'bg-green-500'
                                  : approval.status === 'REJECTED'
                                    ? 'bg-red-500'
                                    : approval.status === 'PENDING'
                                      ? 'bg-yellow-500'
                                      : 'bg-gray-300'
                              }`}
                            />
                            <span className="font-medium">
                              Stage {approval.sequenceNumber || idx + 1}:
                            </span>
                            <span>{approval.approverRole || 'Unknown'}</span>
                            <Badge
                              variant={
                                approval.status === 'APPROVED'
                                  ? 'default'
                                  : approval.status === 'REJECTED'
                                    ? 'destructive'
                                    : 'outline'
                              }
                              className="ml-auto text-xs"
                            >
                              {approval.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* OCR Text */}
            {invoice.ocrText && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Extracted Text (OCR)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-64 whitespace-pre-wrap">
                    {invoice.ocrText}
                  </pre>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="lineitems">
            <Card>
              <CardHeader>
                <CardTitle>Line Items</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">VAT</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!invoice.lineItems || invoice.lineItems.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center text-muted-foreground"
                        >
                          No line items
                        </TableCell>
                      </TableRow>
                    ) : (
                      invoice.lineItems.map((item: any, idx: number) => (
                        <TableRow key={item.id || idx}>
                          <TableCell>{item.lineNumber || idx + 1}</TableCell>
                          <TableCell>{item.description}</TableCell>
                          <TableCell className="text-right">
                            {item.quantity}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(
                              item.unitPrice || 0,
                              invoice.currency
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(
                              item.vatAmount || 0,
                              invoice.currency
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(
                              item.lineTotalInclVAT || item.lineTotal || 0,
                              invoice.currency
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="approvals">
            <Card>
              <CardHeader>
                <CardTitle>Approval History</CardTitle>
              </CardHeader>
              <CardContent>
                {!invoice.approvals || invoice.approvals.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="mx-auto h-8 w-8 mb-2 text-gray-400" />
                    <p>No approvals yet</p>
                    <p className="text-sm">This invoice is awaiting approval</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {invoice.approvals.map((approval: any) => (
                      <div
                        key={approval.id}
                        className="flex items-start gap-3 p-3 border rounded-lg"
                      >
                        <div className="mt-0.5">
                          {approval.status === 'APPROVED' ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : approval.status === 'REJECTED' ? (
                            <XCircle className="h-5 w-5 text-red-500" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-yellow-500" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium">
                              Stage {approval.sequenceNumber || 1}:{' '}
                              {approval.approverRole || 'Unknown'}
                            </p>
                            <Badge
                              variant={
                                approval.status === 'APPROVED'
                                  ? 'default'
                                  : approval.status === 'REJECTED'
                                    ? 'destructive'
                                    : 'outline'
                              }
                            >
                              {approval.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Assigned {formatDate(approval.assignedDate)}
                          </p>
                          {approval.actionDate && (
                            <p className="text-sm text-muted-foreground">
                              Decided on {formatDate(approval.actionDate)}
                            </p>
                          )}
                          {approval.comments && (
                            <p className="mt-2 text-sm bg-muted p-2 rounded">
                              {approval.comments}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Comments Tab */}
          <TabsContent value="comments">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Comments & Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add Comment Form */}
                <div className="flex gap-2">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment or note..."
                    className="flex-1"
                    rows={2}
                  />
                  <Button
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || submittingComment}
                    className="self-end"
                  >
                    <Send className="h-4 w-4 mr-1" />
                    {submittingComment ? 'Sending...' : 'Send'}
                  </Button>
                </div>

                {/* Comments List */}
                <div className="space-y-3 mt-4">
                  {comments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="mx-auto h-8 w-8 mb-2 text-gray-400" />
                      <p>No comments yet</p>
                      <p className="text-sm">Be the first to add a comment</p>
                    </div>
                  ) : (
                    comments.map((comment: any) => (
                      <div
                        key={comment.id}
                        className="p-3 border rounded-lg bg-muted/30"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">
                              {comment.user || 'Unknown User'}
                            </span>
                            {comment.isInternalNote && (
                              <Badge variant="outline" className="text-xs">
                                Internal
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(comment.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">
                          {comment.content}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {pdfUrl && (
            <TabsContent value="pdf">
              <Card>
                <CardHeader>
                  <CardTitle>PDF Document</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="w-full h-[700px] border rounded-lg overflow-hidden bg-gray-100">
                    <iframe
                      src={pdfUrl}
                      className="w-full h-full"
                      title="Invoice PDF"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
