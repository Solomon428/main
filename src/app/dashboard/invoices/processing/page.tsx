'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  RefreshCw, 
  Eye, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  FileText,
  BarChart3
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';

interface ProcessingInvoice {
  id: string;
  invoiceNumber: string;
  supplierName: string;
  totalAmount: number;
  currency: string;
  status: string;
  extractionConfidence?: number;
  riskLevel?: string;
  fraudScore?: number;
  createdAt: string;
  pdfUrl?: string;
}

export default function InvoiceProcessingPage() {
  const [invoices, setInvoices] = useState<ProcessingInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProcessingInvoices = async () => {
    setRefreshing(true);
    try {
      const response = await fetch('/api/invoices?status=PROCESSING,PENDING_EXTRACTION,SUBMITTED');
      const data = await response.json();
      if (data.success) {
        setInvoices(data.data.invoices || []);
      }
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProcessingInvoices();
    const interval = setInterval(fetchProcessingInvoices, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING_EXTRACTION: 'bg-yellow-100 text-yellow-800',
      SUBMITTED: 'bg-blue-100 text-blue-800',
      PROCESSING: 'bg-purple-100 text-purple-800',
    };
    
    const icons: Record<string, React.ReactNode> = {
      PENDING_EXTRACTION: <Clock className="w-3 h-3 mr-1" />,
      SUBMITTED: <AlertTriangle className="w-3 h-3 mr-1" />,
      PROCESSING: <Loader2 className="w-3 h-3 mr-1 animate-spin" />,
    };
    
    return (
      <Badge className={styles[status] || 'bg-gray-100'}>
        {icons[status]}
        {status.replace(/_/g, ' ')}
      </Badge>
    );
  };

  const getRiskBadge = (riskLevel?: string) => {
    if (!riskLevel) return null;
    
    const styles: Record<string, string> = {
      LOW: 'bg-green-100 text-green-800',
      MEDIUM: 'bg-yellow-100 text-yellow-800',
      HIGH: 'bg-orange-100 text-orange-800',
      CRITICAL: 'bg-red-100 text-red-800',
    };
    
    return (
      <Badge className={styles[riskLevel] || 'bg-gray-100'}>
        {riskLevel}
      </Badge>
    );
  };

  const stats = {
    total: invoices.length,
    pending: invoices.filter(i => i.status === 'PENDING_EXTRACTION').length,
    submitted: invoices.filter(i => i.status === 'SUBMITTED').length,
    processing: invoices.filter(i => i.status === 'PROCESSING').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Processing Queue</h1>
          <p className="text-gray-600">Invoices currently being processed</p>
        </div>
        <Button variant="outline" onClick={fetchProcessingInvoices} disabled={refreshing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Submitted</p>
                <p className="text-2xl font-bold text-blue-600">{stats.submitted}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Processing</p>
                <p className="text-2xl font-bold text-purple-600">{stats.processing}</p>
              </div>
              <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Processing Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Active Processing
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 mx-auto animate-spin mb-2" />
              <p className="text-gray-500">Loading processing queue...</p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 mx-auto text-green-400 mb-4" />
              <p className="text-lg font-medium text-gray-900">All caught up!</p>
              <p className="text-gray-500">No invoices in processing queue</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      {invoice.invoiceNumber}
                    </TableCell>
                    <TableCell>{invoice.supplierName}</TableCell>
                    <TableCell>
                      {formatCurrency(invoice.totalAmount, invoice.currency)}
                    </TableCell>
                    <TableCell>
                      {invoice.extractionConfidence !== undefined ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${
                                invoice.extractionConfidence >= 80 ? 'bg-green-500' :
                                invoice.extractionConfidence >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${invoice.extractionConfidence}%` }}
                            />
                          </div>
                          <span className="text-sm">{invoice.extractionConfidence}%</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>{getRiskBadge(invoice.riskLevel)}</TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell>{formatDate(invoice.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {invoice.pdfUrl && (
                          <Button variant="ghost" size="sm" asChild>
                            <a 
                              href={`/api/invoices/upload?path=${invoice.pdfUrl}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Eye className="w-4 h-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
