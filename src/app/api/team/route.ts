import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const role = searchParams.get('role');
    const department = searchParams.get('department');

    // Build where clause
    const where: any = { isActive: true };
    if (role) {
      where.role = role;
    }
    if (department) {
      where.department = department;
    }

    // Get total count
    const total = await prisma.user.count({ where });

    // Get paginated team members
    const team = await prisma.user.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        department: true,
        jobTitle: true,
        position: true,
        phoneNumber: true,
        mobileNumber: true,
        isActive: true,
        createdAt: true
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        team,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    console.error('Error fetching team:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch team' },
      { status: 500 }
    );
  }
}
