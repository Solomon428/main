import { prisma } from '../../lib/prisma';
import { hashPassword, verifyPassword } from '../../security/hashing';
import { generateId } from '../../utils/ids';
import { CreateUserInput, UpdateUserInput } from './iam.validators';
import { UserRole } from '../../domain/enums/UserRole';
import { logAuditEvent } from '../../observability/audit';
import { AuditAction } from '../../domain/enums/AuditAction';
import { EntityType } from '../../domain/enums/EntityType';

export async function createUser(data: CreateUserInput, createdBy?: string) {
  const passwordHash = await hashPassword(data.password);
  
  const user = await prisma.user.create({
    data: {
      id: generateId(),
      email: data.email,
      name: data.name,
      firstName: data.firstName,
      lastName: data.lastName,
      passwordHash,
      role: data.role,
      department: data.department,
      position: data.position,
      jobTitle: data.jobTitle,
      phoneNumber: data.phoneNumber,
      mobileNumber: data.mobileNumber,
      organizations: {
        connect: { id: data.organizationId },
      },
      primaryOrganizationId: data.organizationId,
    },
  });

  await logAuditEvent({
    userId: createdBy,
    action: AuditAction.CREATE,
    entityType: EntityType.USER,
    entityId: user.id,
    newValue: { email: user.email, name: user.name, role: user.role },
  });

  return user;
}

export async function updateUser(userId: string, data: UpdateUserInput, updatedBy?: string) {
  const oldUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...data,
      updatedAt: new Date(),
    },
  });

  await logAuditEvent({
    userId: updatedBy,
    action: AuditAction.UPDATE,
    entityType: EntityType.USER,
    entityId: user.id,
    oldValue: oldUser || undefined,
    newValue: user,
  });

  return user;
}

export async function deleteUser(userId: string, deletedBy?: string) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      isActive: false,
      deletedAt: new Date(),
    },
  });

  await logAuditEvent({
    userId: deletedBy,
    action: AuditAction.DELETE,
    entityType: EntityType.USER,
    entityId: user.id,
    oldValue: { email: user.email, name: user.name },
  });

  return user;
}

export async function findUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      organizations: true,
      primaryOrganization: true,
    },
  });
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
}

export async function listUsers(organizationId?: string, options?: {
  role?: UserRole;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const page = options?.page || 1;
  const limit = options?.limit || 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  
  if (organizationId) {
    where.organizations = { some: { id: organizationId } };
  }
  
  if (options?.role) {
    where.role = options.role;
  }
  
  if (options?.isActive !== undefined) {
    where.isActive = options.isActive;
  }
  
  if (options?.search) {
    where.OR = [
      { name: { contains: options.search, mode: 'insensitive' } },
      { email: { contains: options.search, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        primaryOrganization: {
          select: { id: true, name: true },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function updateLastLogin(userId: string, ipAddress?: string) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      lastLoginAt: new Date(),
      lastLoginIp: ipAddress,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });
}

export async function incrementFailedLogin(email: string) {
  const maxAttempts = 5;
  const lockoutMinutes = 30;
  
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, failedLoginAttempts: true },
  });
  
  if (!user) return;
  
  const newAttempts = user.failedLoginAttempts + 1;
  const shouldLock = newAttempts >= maxAttempts;
  
  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: newAttempts,
      lockedUntil: shouldLock 
        ? new Date(Date.now() + lockoutMinutes * 60 * 1000)
        : undefined,
    },
  });
}
