'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, ArrowUpCircle } from 'lucide-react';

interface ApprovalActionsProps {
  approvalId: string;
  invoiceId: string;
  onActionComplete?: () => void;
}

type ActionType = 'approve' | 'reject' | 'escalate' | null;

export function ApprovalActions({ approvalId, invoiceId, onActionComplete }: ApprovalActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [actionType, setActionType] = useState<ActionType>(null);
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAction = async () => {
    if (!actionType) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvalId,
          decision: actionType.toUpperCase(),
          comments,
        }),
      });

      if (response.ok) {
        setIsOpen(false);
        setComments('');
        setActionType(null);
        onActionComplete?.();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to process action');
      }
    } catch (error) {
      console.error('Error processing approval action:', error);
      alert('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (type: ActionType) => {
    setActionType(type);
    setIsOpen(true);
  };

  const getActionTitle = () => {
    switch (actionType) {
      case 'approve':
        return 'Approve Invoice';
      case 'reject':
        return 'Reject Invoice';
      case 'escalate':
        return 'Escalate Invoice';
      default:
        return '';
    }
  };

  const getActionButton = () => {
    switch (actionType) {
      case 'approve':
        return (
          <Button 
            onClick={handleAction} 
            disabled={loading}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Confirm Approval
          </Button>
        );
      case 'reject':
        return (
          <Button 
            onClick={handleAction} 
            disabled={loading}
            variant="destructive"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Confirm Rejection
          </Button>
        );
      case 'escalate':
        return (
          <Button 
            onClick={handleAction} 
            disabled={loading}
            variant="secondary"
          >
            <ArrowUpCircle className="h-4 w-4 mr-2" />
            Confirm Escalation
          </Button>
        );
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <Button
          onClick={() => openDialog('approve')}
          className="bg-green-600 hover:bg-green-700"
          size="sm"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Approve
        </Button>
        <Button
          onClick={() => openDialog('reject')}
          variant="destructive"
          size="sm"
        >
          <XCircle className="h-4 w-4 mr-2" />
          Reject
        </Button>
        <Button
          onClick={() => openDialog('escalate')}
          variant="outline"
          size="sm"
        >
          <ArrowUpCircle className="h-4 w-4 mr-2" />
          Escalate
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{getActionTitle()}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="comments">
                Comments {actionType === 'reject' && '(Required)'}
              </Label>
              <Textarea
                id="comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder={`Add your comments for ${actionType}...`}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            {getActionButton()}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ApprovalActions;
