"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDateTime } from "@/lib/utils/formatters";
import { MessageSquare, Send, Lock } from "lucide-react";

interface Comment {
  id: string;
  user: string;
  content: string;
  isInternalNote: boolean;
  createdAt: string;
}

interface CommentsSectionProps {
  invoiceId: string;
}

export function CommentsSection({ invoiceId }: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [invoiceId]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/invoices?comment=true&invoiceId=${invoiceId}`);
      const result = await response.json();
      if (result.success) {
        setComments(result.data);
      }
    } catch (err) {
      console.error("Failed to fetch comments:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/invoices?comment=true", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId,
          content: newComment,
          isInternalNote: isInternal,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setComments([result.data, ...comments]);
        setNewComment("");
        setIsInternal(false);
      }
    } catch (err) {
      console.error("Failed to add comment:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Comments & Notes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="flex items-center gap-1 text-muted-foreground">
                <Lock className="h-3 w-3" />
                Internal note only
              </span>
            </label>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!newComment.trim() || submitting}
            >
              <Send className="h-4 w-4 mr-1" />
              {submitting ? "Sending..." : "Add Comment"}
            </Button>
          </div>
        </div>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {loading ? (
            <p className="text-center text-muted-foreground">Loading comments...</p>
          ) : comments.length === 0 ? (
            <p className="text-center text-muted-foreground">No comments yet</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{getInitials(comment.user)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{comment.user}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(comment.createdAt)}
                    </span>
                    {comment.isInternalNote && (
                      <span className="text-xs flex items-center gap-1 text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                        <Lock className="h-3 w-3" />
                        Internal
                      </span>
                    )}
                  </div>
                  <p className="text-sm mt-1">{comment.content}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
