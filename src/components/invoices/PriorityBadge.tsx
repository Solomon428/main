"use client";

import { Badge } from "@/components/ui/badge";

interface PriorityBadgeProps {
  priority: string;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const getVariant = () => {
    switch (priority) {
      case "CRITICAL":
        return "destructive";
      case "HIGH":
        return "warning";
      case "MEDIUM":
        return "info";
      case "LOW":
        return "secondary";
      default:
        return "secondary";
    }
  };

  return <Badge variant={getVariant()}>{priority}</Badge>;
}
