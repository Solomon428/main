// src/app/api/reconciliations/[id]/items/route.ts
// Reconciliation Items Management - Bank Transaction Matching

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { Decimal } from '@prisma/client/runtime/library';

interface RouteContext {
  params: { id: string };
}

const MatchItemSchema = z.object({
  itemId: z.string().cuid(),
  paymentId: z.string().cuid(),
  matchType: z.enum(['EXACT', 'FUZZY', 'MANUAL']),
  confidence: z.number().min(0).max(100).optional(),
  notes: z.string().max(500).optional(),
});

const BulkMatchSchema = z.object({
  matches: z.array(z.object({
    itemId: z.string().cuid(),
    paymentId: z.string().cuid(),
    matchType: z.enum(['EXACT', 'FUZZY', 'MANUAL']),
  })),
});

// GET /api/reconciliations/[id]/items
export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { code: 'AUTH_001', message: 'Authentication required' } }, { status: 401 });
    }

    const { id: reconciliationId } = context.params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // MATCHED, UNMATCHED, DISPUTED, EXCLUDED

    // Verify reconciliation exists
    const reconciliation = await prisma.reconciliation.findUnique({
      where: { id: reconciliationId },
      select: {
        id: true,
        referenceNumber: true,
        status: true,
        bankAccountId: true,
        organizationId: true,
        bankAccount: { select: { accountName: true, accountNumber: true } },
      },
    });

    if (!reconciliation) {
      return NextResponse.json({
        success: false,
        error: { code: 'REC_001', message: 'Reconciliation not found' },
      }, { status: 404 });
    }

    // Build where clause
    let where: any = { reconciliationId, deletedAt: null };
    if (status) {
      where.status = status;
    }

    // Fetch items
    const items = await prisma.reconciliationItem.findMany({
      where,
      include: {
        payment: {
          select: {
            id: true,
            referenceNumber: true,
            amount: true,
            paymentDate: true,
            paymentMethod: true,
            invoice: {
              select: {
                invoiceNumber: true,
                supplier: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { transactionDate: 'desc' },
    });

    // Calculate statistics
    const stats = {
      total: items.length,
      matched: items.filter(i => i.status === 'MATCHED').length,
      unmatched: items.filter(i => i.status === 'UNMATCHED').length,
      disputed: items.filter(i => i.status === 'DISPUTED').length,
      excluded: items.filter(i => i.status === 'EXCLUDED').length,
      totalDebit: items.reduce((sum, i) => sum + (i.transactionType === 'DEBIT' ? Number(i.amount) : 0), 0),
      totalCredit: items.reduce((sum, i) => sum + (i.transactionType === 'CREDIT' ? Number(i.amount) : 0), 0),
      netAmount: items.reduce((sum, i) => sum + (i.transactionType === 'DEBIT' ? Number(i.amount) : -Number(i.amount)), 0),
    };

    // Find potential matches for unmatched items
    const unmatchedItems = items.filter(i => i.status === 'UNMATCHED');
    const itemsWithSuggestions = await Promise.all(
      unmatchedItems.map(async item => {
        // Find payments with similar amounts and dates (±7 days)
        const dateRange = {
          gte: new Date(item.transactionDate.getTime() - 7 * 24 * 60 * 60 * 1000),
          lte: new Date(item.transactionDate.getTime() + 7 * 24 * 60 * 60 * 1000),
        };

        const suggestions = await prisma.payment.findMany({
          where: {
            organizationId: reconciliation.organizationId,
            status: 'PAID',
            paymentDate: dateRange,
            amount: {
              gte: new Decimal(Number(item.amount) * 0.95), // ±5% tolerance
              lte: new Decimal(Number(item.amount) * 1.05),
            },
            reconciliationItems: { none: {} }, // Not already reconciled
          },
          select: {
            id: true,
            referenceNumber: true,
            amount: true,
            paymentDate: true,
            invoice: {
              select: {
                invoiceNumber: true,
                supplier: { select: { name: true } },
              },
            },
          },
          take: 5,
        });

        // Calculate match confidence
        const suggestionsWithConfidence = suggestions.map(payment => {
          let confidence = 0;

          // Exact amount match
          if (Math.abs(Number(payment.amount) - Number(item.amount)) < 0.01) {
            confidence += 50;
          } else {
            // Fuzzy amount match
            const amountDiff = Math.abs(Number(payment.amount) - Number(item.amount)) / Number(item.amount);
            confidence += Math.max(0, 30 - (amountDiff * 100));
          }

          // Date proximity
          const daysDiff = Math.abs(
            (payment.paymentDate!.getTime() - item.transactionDate.getTime()) / (24 * 60 * 60 * 1000)
          );
          confidence += Math.max(0, 30 - (daysDiff * 5));

          // Reference match
          if (item.reference && payment.referenceNumber) {
            const refSimilarity = calculateStringSimilarity(
              item.reference.toLowerCase(),
              payment.referenceNumber.toLowerCase()
            );
            confidence += refSimilarity * 20;
          }

          return { ...payment, confidence: Math.round(confidence) };
        });

        return {
          ...item,
          suggestedMatches: suggestionsWithConfidence.sort((a, b) => b.confidence - a.confidence),
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        reconciliation: {
          id: reconciliation.id,
          referenceNumber: reconciliation.referenceNumber,
          status: reconciliation.status,
          bankAccount: reconciliation.bankAccount,
        },
        items: status === 'UNMATCHED' ? itemsWithSuggestions : items,
        stats,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[GET /api/reconciliations/[id]/items] Error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'SYS_001', message: 'Internal server error' },
    }, { status: 500 });
  }
}

// POST /api/reconciliations/[id]/items/match
export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { code: 'AUTH_001', message: 'Authentication required' } }, { status: 401 });
    }

    const { id: reconciliationId } = context.params;
    const body = await request.json();
    
    // Check if bulk match or single match
    const isBulk = Array.isArray(body.matches);
    
    if (isBulk) {
      const { matches } = BulkMatchSchema.parse(body);
      
      // Process all matches in transaction
      const results = await prisma.$transaction(async tx => {
        return Promise.all(matches.map(async match => {
          const item = await tx.reconciliationItem.findUnique({
            where: { id: match.itemId },
          });

          if (!item) {
            return { itemId: match.itemId, success: false, error: 'Item not found' };
          }

          const updated = await tx.reconciliationItem.update({
            where: { id: match.itemId },
            data: {
              paymentId: match.paymentId,
              status: 'MATCHED',
              matchType: match.matchType,
              matchedAt: new Date(),
              matchedBy: session.user.id,
            },
          });

          return { itemId: match.itemId, success: true, data: updated };
        }));
      });

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      return NextResponse.json({
        success: true,
        data: {
          matched: successful,
          failed,
          results,
        },
        timestamp: new Date().toISOString(),
      });

    } else {
      // Single match
      const data = MatchItemSchema.parse(body);

      const item = await prisma.reconciliationItem.findUnique({
        where: { id: data.itemId },
      });

      if (!item) {
        return NextResponse.json({
          success: false,
          error: { code: 'REC_002', message: 'Reconciliation item not found' },
        }, { status: 404 });
      }

      const payment = await prisma.payment.findUnique({
        where: { id: data.paymentId },
      });

      if (!payment) {
        return NextResponse.json({
          success: false,
          error: { code: 'PAY_001', message: 'Payment not found' },
        }, { status: 404 });
      }

      // Update item
      const updated = await prisma.reconciliationItem.update({
        where: { id: data.itemId },
        data: {
          paymentId: data.paymentId,
          status: 'MATCHED',
          matchType: data.matchType,
          matchedAt: new Date(),
          matchedBy: session.user.id,
          notes: data.notes,
        },
        include: {
          payment: {
            select: {
              id: true,
              referenceNumber: true,
              amount: true,
              invoice: {
                select: { invoiceNumber: true, supplier: { select: { name: true } } },
              },
            },
          },
        },
      });

      return NextResponse.json({
        success: true,
        data: { item: updated },
        timestamp: new Date().toISOString(),
      });
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: { code: 'VAL_001', message: 'Validation error', details: error.errors },
      }, { status: 400 });
    }
    console.error('[POST /api/reconciliations/[id]/items/match] Error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'SYS_001', message: 'Internal server error' },
    }, { status: 500 });
  }
}

// Helper function: Calculate string similarity (Levenshtein distance)
function calculateStringSimilarity(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0]![j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      const val1 = matrix[i - 1]?.[j] ?? 0;
      const val2 = matrix[i]?.[j - 1] ?? 0;
      const val3 = matrix[i - 1]?.[j - 1] ?? 0;
      matrix[i]![j] = Math.min(val1 + 1, val2 + 1, val3 + cost);
    }
  }

  const distance = matrix[len1]?.[len2] ?? 0;
  const maxLen = Math.max(len1, len2);
  return maxLen === 0 ? 1 : 1 - distance / maxLen;
}
