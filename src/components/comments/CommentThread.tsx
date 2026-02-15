'use client';

import React, { useState } from 'react';
import {
  MessageSquare,
  Send,
  Paperclip,
  AtSign,
  MoreHorizontal,
  Reply,
  Trash2,
  Edit2,
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils/formatting';

interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  type: 'PUBLIC' | 'INTERNAL' | 'SYSTEM';
  createdAt: Date;
  isEdited: boolean;
  replyCount: number;
  replies?: Comment[];
}

interface CommentThreadProps {
  comments: Comment[];
  currentUserId: string;
  onAddComment: (content: string, parentId?: string) => void;
  onEditComment: (commentId: string, content: string) => void;
  onDeleteComment: (commentId: string) => void;
  isLoading?: boolean;
}

export function CommentThread({
  comments,
  currentUserId,
  onAddComment,
  onEditComment,
  onDeleteComment,
  isLoading,
}: CommentThreadProps) {
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const handleStartEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
  };

  const handleSaveEdit = () => {
    if (editingId && editContent.trim()) {
      onEditComment(editingId, editContent);
      setEditingId(null);
      setEditContent('');
    }
  };

  const renderComment = (comment: Comment, isReply: boolean = false) => (
    <div key={comment.id} className={`${isReply ? 'ml-10' : ''}`}>
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          {comment.userAvatar ? (
            <img
              src={comment.userAvatar}
              alt={comment.userName}
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <span className="text-sm font-medium text-primary">
              {comment.userName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{comment.userName}</span>
            {comment.type === 'INTERNAL' && (
              <span className="px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded">
                Internal
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(comment.createdAt)}
            </span>
            {comment.isEdited && (
              <span className="text-xs text-muted-foreground">(edited)</span>
            )}
          </div>

          {editingId === comment.id ? (
            <div className="mt-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full p-2 border rounded-lg text-sm resize-none"
                rows={2}
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="px-3 py-1 text-sm hover:bg-muted rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-1 text-sm text-foreground/90">{comment.content}</p>
          )}

          {/* Actions */}
          {editingId !== comment.id && (
            <div className="flex items-center gap-4 mt-2">
              <button
                onClick={() =>
                  setReplyingTo(replyingTo === comment.id ? null : comment.id)
                }
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <Reply className="h-3 w-3" />
                Reply
              </button>

              {comment.userId === currentUserId && (
                <>
                  <button
                    onClick={() => handleStartEdit(comment)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Edit2 className="h-3 w-3" />
                    Edit
                  </button>
                  <button
                    onClick={() => onDeleteComment(comment.id)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-600"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </button>
                </>
              )}
            </div>
          )}

          {/* Reply input */}
          {replyingTo === comment.id && (
            <div className="mt-3">
              <CommentInput
                placeholder={`Reply to ${comment.userName}...`}
                onSubmit={(content) => {
                  onAddComment(content, comment.id);
                  setReplyingTo(null);
                }}
                onCancel={() => setReplyingTo(null)}
                size="sm"
              />
            </div>
          )}
        </div>
      </div>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 space-y-3 border-l-2 border-muted pl-4">
          {comment.replies.map((reply) => renderComment(reply, true))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b">
        <MessageSquare className="h-5 w-5" />
        <h3 className="font-semibold">Comments</h3>
        <span className="text-sm text-muted-foreground">
          ({comments.length})
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {comments.map((comment) => renderComment(comment))}
          </div>

          {comments.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p>No comments yet</p>
            </div>
          )}

          {/* New comment input */}
          <div className="pt-4 border-t">
            <CommentInput
              placeholder="Add a comment..."
              onSubmit={(content) => onAddComment(content)}
            />
          </div>
        </>
      )}
    </div>
  );
}

interface CommentInputProps {
  placeholder?: string;
  onSubmit: (content: string) => void;
  onCancel?: () => void;
  size?: 'sm' | 'md';
}

export function CommentInput({
  placeholder = 'Write a comment...',
  onSubmit,
  onCancel,
  size = 'md',
}: CommentInputProps) {
  const [content, setContent] = useState('');
  const [isInternal, setIsInternal] = useState(false);

  const handleSubmit = () => {
    if (content.trim()) {
      onSubmit(content);
      setContent('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSubmit();
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={size === 'sm' ? 2 : 3}
          className="w-full p-3 pr-12 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <div className="absolute right-2 bottom-2 flex gap-1">
          <button
            type="button"
            className="p-1.5 text-muted-foreground hover:text-foreground rounded"
            title="Mention someone"
          >
            <AtSign className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="p-1.5 text-muted-foreground hover:text-foreground rounded"
            title="Attach file"
          >
            <Paperclip className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={isInternal}
            onChange={(e) => setIsInternal(e.target.checked)}
            className="rounded"
          />
          <span className="text-muted-foreground">Internal note</span>
        </label>

        <div className="flex gap-2">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-3 py-1.5 text-sm hover:bg-muted rounded"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={!content.trim()}
            className="px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
          >
            <Send className="h-3 w-3" />
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
