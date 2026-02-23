import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authMiddleware } from "@/middleware/auth.middleware";
import { AuditLogger } from "@/lib/utils/audit-logger";
import bcrypt from "bcryptjs";

export async function GET(request: NextRequest) {
  const authResponse = await authMiddleware(request);
  if (authResponse.status !== 200) {
    return authResponse;
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const role = searchParams.get("role");
    const department = searchParams.get("department");
    const isActive = searchParams.get("isActive");
    const search = searchParams.get("search");

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (role) {
      where.role = role;
    }

    if (department) {
      where.department = department;
    }

    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === "true";
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { employeeId: { contains: search, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          employeeId: true,
          email: true,
          name: true,
          firstName: true,
          lastName: true,
          role: true,
          department: true,
          position: true,
          jobTitle: true,
          phoneNumber: true,
          mobileNumber: true,
          isActive: true,
          isLocked: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch users" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const authResponse = await authMiddleware(request);
  if (authResponse.status !== 200) {
    return authResponse;
  }

  try {
    const body = await request.json();
    const {
      employeeId,
      email,
      name,
      title,
      role,
      department,
      password,
      approvalLimit,
      dailyLimit,
      monthlyLimit,
      phone,
      extension,
      location,
      maxWorkload,
    } = body;

    // Validation
    if (!employeeId || !email || !name || !role || !department || !password) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { employeeId }],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: "User with this email or employee ID already exists",
        },
        { status: 409 },
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        employeeId,
        email,
        name,
        jobTitle: title || null,
        role: role as any,
        department: department as any,
        passwordHash,
        phoneNumber: phone || null,
        isActive: true,
      },
      select: {
        id: true,
        employeeId: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        role: true,
        department: true,
        position: true,
        jobTitle: true,
        phoneNumber: true,
        isActive: true,
        createdAt: true,
      },
    });

    const userId = request.headers.get("x-user-id") || "system";
    await AuditLogger.log({
      action: "CREATE",
      entityType: "USER",
      entityId: user.id,
      entityDescription: `User ${user.name} created`,
      severity: "INFO",
      userId,
    });

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create user" },
      { status: 500 },
    );
  }
}
