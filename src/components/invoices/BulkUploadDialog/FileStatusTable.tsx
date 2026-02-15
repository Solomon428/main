"use client";

import { FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileWithStatus } from "./types";
import { getStatusIcon, getStatusBadge } from "./utils";

interface FileStatusTableProps {
  files: FileWithStatus[];
  isProcessing: boolean;
  onRemove: (id: string) => void;
}

export function FileStatusTable({ files, isProcessing, onRemove }: FileStatusTableProps) {
  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8">Status</TableHead>
            <TableHead>File</TableHead>
            <TableHead className="w-24 text-right">Size</TableHead>
            <TableHead className="w-28">Status</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {files.map((fileStatus) => (
            <TableRow key={fileStatus.id}>
              <TableCell>
                {getStatusIcon(fileStatus.status)}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate max-w-[200px]" title={fileStatus.file.name}>
                    {fileStatus.file.name}
                  </span>
                </div>
                {fileStatus.result?.confidence !== undefined && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Confidence: {fileStatus.result.confidence.toFixed(1)}%
                  </p>
                )}
                {fileStatus.error && (
                  <p className="text-xs text-red-500 mt-1">
                    {fileStatus.error}
                  </p>
                )}
              </TableCell>
              <TableCell className="text-right text-sm text-muted-foreground">
                {(fileStatus.file.size / 1024).toFixed(1)} KB
              </TableCell>
              <TableCell>{getStatusBadge(fileStatus.status)}</TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemove(fileStatus.id)}
                  disabled={isProcessing}
                >
                  <X className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
