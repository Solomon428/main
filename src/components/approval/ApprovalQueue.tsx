'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock,
  ChevronRight 
} from 'lucide-react';
import Link from 'next/link';

interface ApprovalItem {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  supplierName: string;
  totalAmount: number;
  currency: string;
  assignedDate: string;
  slaDeadline: string;
  isUrgent: boolean;
  daysRemaining: number;
}

interface ApprovalQueueProps {
  limit?: number;
  showViewAll?: boolean;
}

export function ApprovalQueue({ limit = 5, showViewAll = true }: ApprovalQueueProps) {
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    try {
      const response = await fetch('/api/approvals/pending');
      if (response.ok) {
        const data = await response.json();
        setApprovals(data.data?.slice(0, limit) || []);
      }
    } catch (error) {
      console.error('Error fetching approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: currency || 'ZAR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
    });
  };

  const getUrgencyBadge = (daysRemaining: number, isUrgent: boolean) => {
    if (isUrgent || daysRemaining < 0) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {daysRemaining < 0 ? `${Math.abs(daysRemaining)} days overdue` : 'Urgent'}
        </Badge>
      );
    }
    if (daysRemaining <= 2) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1 bg-orange-100 text-orange-800">
          <Clock className="h-3 w-3" />
          {daysRemaining} days left
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {daysRemaining} days left
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (approvals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
            <p>No pending approvals</p>
            <p className="text-sm">All caught up!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Pending Approvals ({approvals.length})</CardTitle>
        {showViewAll && (
          <Link href="/approvals">
            <Button variant="ghost" size="sm">
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {approvals.map((approval) => (
            <div
              key={approval.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-blue-100 text-blue-800">
                    {approval.supplierName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">{approval.invoiceNumber}</p>
                  <p className="text-xs text-gray-500">{approval.supplierName}</p>
                  <p className="text-xs font-medium text-gray-700">
                    {formatCurrency(approval.totalAmount, approval.currency)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                {getUrgencyBadge(approval.daysRemaining, approval.isUrgent)}
                <p className="text-xs text-gray-500 mt-1">
                  Due {formatDate(approval.slaDeadline)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default ApprovalQueue;
