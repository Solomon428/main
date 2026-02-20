import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

/**
 * GET /api/invoices/[id]/comments - Fetch all comments for an invoice
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const invoiceId = params.id;

    // Verify invoice exists
    const invoice = await prisma.invoices.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: "Invoice not found" },
        { status: 404 },
      );
    }

    // Fetch comments
    const comments = await prisma.comment.findMany({
      where: { invoiceId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: comments,
    });
  } catch (error) {
    console.error("[Comments API] GET Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch comments" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/invoices/[id]/comments - Add a new comment to an invoice
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const invoiceId = params.id;
    const body = await request.json();
    const { content, isInternalNote } = body;

    // Get user from headers (simplified auth)
    const userId = request.headers.get("x-user-id") || "system";
    const userName = request.headers.get("x-user-name") || "System User";

    if (!content || content.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Comment content is required" },
        { status: 400 },
      );
    }

    // Verify invoice exists
    const invoice = await prisma.invoices.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: "Invoice not found" },
        { status: 404 },
      );
    }

    // Create comment
    const comment = await prisma.comment.create({
      data: {
        invoiceId,
        user: userName,
        content: content.trim(),
        isInternalNote: isInternalNote || false,
        attachments: "[]", // Empty JSON array as string for SQLite
      },
    });

    return NextResponse.json({
      success: true,
      data: comment,
      message: "Comment added successfully",
    });
  } catch (error) {
    console.error("[Comments API] POST Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to add comment" },
      { status: 500 },
    );
  }
}
