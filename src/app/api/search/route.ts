/**
 * Advanced Search API Route
 */

import { NextRequest, NextResponse } from 'next/server';
import { AdvancedSearchService } from '@/services/advanced-search-service';
import { InvoiceStatus, PriorityLevel } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const filters = {
      query: searchParams.get('q') || undefined,
      invoiceDateFrom: searchParams.get('invoiceDateFrom')
        ? new Date(searchParams.get('invoiceDateFrom')!)
        : undefined,
      invoiceDateTo: searchParams.get('invoiceDateTo')
        ? new Date(searchParams.get('invoiceDateTo')!)
        : undefined,
      dueDateFrom: searchParams.get('dueDateFrom')
        ? new Date(searchParams.get('dueDateFrom')!)
        : undefined,
      dueDateTo: searchParams.get('dueDateTo')
        ? new Date(searchParams.get('dueDateTo')!)
        : undefined,
      minAmount: searchParams.get('minAmount')
        ? parseFloat(searchParams.get('minAmount')!)
        : undefined,
      maxAmount: searchParams.get('maxAmount')
        ? parseFloat(searchParams.get('maxAmount')!)
        : undefined,
      status: searchParams.get('status')
        ? (searchParams.get('status')!.split(',') as InvoiceStatus[])
        : undefined,
      priority: searchParams.get('priority')
        ? (searchParams.get('priority')!.split(',') as PriorityLevel[])
        : undefined,
      supplierId: searchParams.get('supplierId')
        ? searchParams.get('supplierId')!.split(',')
        : undefined,
      isOverdue: searchParams.get('isOverdue') === 'true' ? true : undefined,
      isDuplicate:
        searchParams.get('isDuplicate') === 'true' ? true : undefined,
      requiresAttention:
        searchParams.get('requiresAttention') === 'true' ? true : undefined,
      hasSLABreach:
        searchParams.get('hasSLABreach') === 'true' ? true : undefined,
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
    };

    const result = await AdvancedSearchService.search(filters);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { success: false, error: 'Search failed' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const filters = await req.json();
    const result = await AdvancedSearchService.search(filters);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { success: false, error: 'Search failed' },
      { status: 500 }
    );
  }
}
