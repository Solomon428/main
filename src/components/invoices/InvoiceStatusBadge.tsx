"use client";

import { Badge } from "@/components/ui/badge";

interface InvoiceStatusBadgeProps {
  status: string;
}

export function InvoiceStatusBadge({ status }: InvoiceStatusBadgeProps) {
  const getVariant = () => {
    switch (status) {
      case "APPROVED":
      case "PAID":
        return "success";
      case "PENDING_APPROVAL":
      case "PENDING_EXTRACTION":
      case "PENDING_VALIDATION":
        return "warning";
      case "REJECTED":
      case "CANCELLED":
        return "destructive";
      case "ESCALATED":
      case "DISPUTED":
        return "destructive";
      case "UNDER_REVIEW":
        return "info";
      case "OVERDUE":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getLabel = () => {
    return status.replace(/_/g, " ");
  };

  return <Badge variant={getVariant()}>{getLabel()}</Badge>;
}
