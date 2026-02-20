/**
 * Comments & Collaboration Types
 * CreditorFlow Enterprise Invoice Management System
 */

export type CommentEntityType = "INVOICE" | "SUPPLIER" | "APPROVAL" | "PAYMENT";
export type CommentType = "PUBLIC" | "INTERNAL" | "SYSTEM";

export interface CommentAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  uploadedAt: Date;
}

export interface CommentMention {
  userId: string;
  username: string;
  displayName: string;
  startIndex: number;
  endIndex: number;
}

export interface Comment {
  id: string;
  entityType: CommentEntityType;
  entityId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  htmlContent?: string;
  type: CommentType;
  parentId?: string;
  mentions: CommentMention[];
  attachments: CommentAttachment[];
  reactions: CommentReaction[];
  isEdited: boolean;
  editedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  replies?: Comment[];
  replyCount: number;
}

export interface CommentReaction {
  emoji: string;
  count: number;
  users: string[];
  hasReacted: boolean;
}

export interface CreateCommentInput {
  entityType: CommentEntityType;
  entityId: string;
  userId: string;
  content: string;
  type?: CommentType;
  parentId?: string;
  attachments?: File[];
}

export interface UpdateCommentInput {
  content: string;
}

export interface CommentFilter {
  entityType: CommentEntityType;
  entityId: string;
  includeReplies?: boolean;
  type?: CommentType;
  page?: number;
  limit?: number;
}

export interface CommentListResult {
  comments: Comment[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ActivityItem {
  id: string;
  type: "comment" | "mention" | "reply" | "reaction";
  entityType: CommentEntityType;
  entityId: string;
  entityLabel: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt: Date;
  isRead: boolean;
}

export interface ActivityFeed {
  activities: ActivityItem[];
  unreadCount: number;
  total: number;
  page: number;
  hasMore: boolean;
}
