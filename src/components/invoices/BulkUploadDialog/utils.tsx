import { CheckCircle, Loader2, FileText, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FileWithStatus } from "./types";

export function getStatusIcon(status: FileWithStatus['status']) {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'failed':
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    case 'uploading':
    case 'processing':
      return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
    default:
      return <FileText className="h-5 w-5 text-muted-foreground" />;
  }
}

export function getStatusBadge(status: FileWithStatus['status']) {
  switch (status) {
    case 'completed':
      return <Badge variant="success">Completed</Badge>;
    case 'failed':
      return <Badge variant="destructive">Failed</Badge>;
    case 'uploading':
      return <Badge variant="outline">Uploading...</Badge>;
    case 'processing':
      return <Badge variant="outline">Processing...</Badge>;
    default:
      return <Badge variant="secondary">Pending</Badge>;
  }
}
