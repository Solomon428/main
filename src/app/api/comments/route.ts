/**
 * Comments API Route
 */

import { NextRequest, NextResponse } from 'next/server';
import { CommentService } from '@/services/comment-service';
import { z } from 'zod';

const createCommentSchema = z.object({
  entityType: z.enum(['INVOICE', 'SUPPLIER', 'APPROVAL', 'PAYMENT']),
  entityId: z.string(),
  userId: z.string(),
  content: z.string().min(1).max(5000),
  isInternal: z.boolean().optional().default(false),
  parentId: z.string().optional(),
});

const updateCommentSchema = z.object({
  content: z.string().min(1).max(5000),
});

// GET: Get comments for an entity
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get('entityType') as
      | 'INVOICE'
      | 'SUPPLIER'
      | 'APPROVAL'
      | 'PAYMENT';
    const entityId = searchParams.get('entityId');
    const includeReplies = searchParams.get('includeReplies') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!entityType || !entityId) {
      return NextResponse.json(
        { success: false, error: 'entityType and entityId are required' },
        { status: 400 }
      );
    }

    const result = await CommentService.getComments({
      entityType,
      entityId,
      includeReplies,
      page,
      pageSize: limit,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Get comments error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get comments' },
      { status: 500 }
    );
  }
}

// POST: Create a new comment
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = createCommentSchema.parse(body);

    const comment = await CommentService.createComment(data);

    return NextResponse.json(
      {
        success: true,
        data: comment,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Create comment error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}

// PATCH: Update a comment
export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const commentId = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!commentId || !userId) {
      return NextResponse.json(
        { success: false, error: 'Comment ID and userId are required' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const data = updateCommentSchema.parse(body);

    const comment = await CommentService.updateComment(commentId, userId, data);

    return NextResponse.json({
      success: true,
      data: comment,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Update comment error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update comment' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a comment
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const commentId = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!commentId || !userId) {
      return NextResponse.json(
        { success: false, error: 'Comment ID and userId are required' },
        { status: 400 }
      );
    }

    await CommentService.deleteComment(commentId, userId);

    return NextResponse.json({
      success: true,
      message: 'Comment deleted',
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete comment' },
      { status: 500 }
    );
  }
}
