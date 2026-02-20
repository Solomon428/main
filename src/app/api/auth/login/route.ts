import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { SignJWT } from "jose";
import { prisma } from "@/db/prisma";
import { z } from "zod";
import { rateLimiters } from "@/lib/utils/rate-limiter";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error(
    "[Login API] CRITICAL: JWT_SECRET environment variable is not set!",
  );
  console.error(
    "[Login API] Please check your .env file has JWT_SECRET configured",
  );
}

const FALLBACK_SECRET =
  "creditorflow-secure-jwt-secret-key-for-production-environment-min-32-chars";
const SECRET = new TextEncoder().encode(JWT_SECRET || FALLBACK_SECRET);

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

// Simple GET for debugging
export async function GET(): Promise<NextResponse> {
  const jwtConfigured = !!process.env.JWT_SECRET;
  return NextResponse.json(
    {
      status: "Login API is running",
      jwtConfigured,
      timestamp: new Date().toISOString(),
    },
    { status: 200 },
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log("[Login API] Received login request");

    // Apply rate limiting
    const clientIp =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const rateLimitResult = rateLimiters.auth(clientIp);
    if (!rateLimitResult.allowed) {
      console.log(`[Login API] Rate limit exceeded for IP: ${clientIp}`);
      return NextResponse.json(
        {
          success: false,
          error: "Too many login attempts. Please try again later.",
          retryAfter: Math.ceil(
            (rateLimitResult.resetTime - Date.now()) / 1000,
          ),
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
            ),
          },
        },
      );
    }

    let body;
    try {
      body = await request.json();
      console.log("[Login API] Request body parsed:", { email: body.email });
    } catch {
      console.error("[Login API] Failed to parse JSON body");
      return NextResponse.json(
        { success: false, error: "Invalid JSON in request body" },
        { status: 400 },
      );
    }

    // Validate input with Zod
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      console.error(
        "[Login API] Validation failed:",
        validation.error.format(),
      );
      return NextResponse.json(
        { success: false, error: "Invalid email or password format" },
        { status: 400 },
      );
    }

    const { email, password } = validation.data;
    const sanitizedEmail = email.toLowerCase().trim();

    console.log("[Login API] Looking up user:", sanitizedEmail);

    // Find user in database
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { email: sanitizedEmail },
      });
    } catch (dbError) {
      console.error("[Login API] Database error:", dbError);
      return NextResponse.json(
        {
          success: false,
          error: "Database connection error. Please try again later.",
        },
        { status: 500 },
      );
    }

    if (!user) {
      console.log("[Login API] User not found:", sanitizedEmail);
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401 },
      );
    }

    console.log("[Login API] User found:", user.id);

    if (!user.isActive) {
      console.log("[Login API] User account is disabled:", user.id);
      return NextResponse.json(
        {
          success: false,
          error: "Account is disabled. Please contact administrator.",
        },
        { status: 401 },
      );
    }

    // Check for account lockout
    const MAX_FAILED_ATTEMPTS = 5;
    const LOCKOUT_DURATION_MINUTES = 30;

    if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      const lockedUntil = user.lockedUntil;
      if (lockedUntil && new Date() < lockedUntil) {
        const minutesRemaining = Math.ceil(
          (lockedUntil.getTime() - Date.now()) / (1000 * 60),
        );
        console.log("[Login API] Account locked for user:", user.id);
        return NextResponse.json(
          {
            success: false,
            error: `Account temporarily locked due to too many failed attempts. Try again in ${minutesRemaining} minutes.`,
          },
          { status: 401 },
        );
      }
      // Lock has expired, reset counter
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
    }

    // Verify password
    console.log("[Login API] Verifying password...");
    const isValidPassword = await compare(password, user.passwordHash);

    if (!isValidPassword) {
      console.log("[Login API] Invalid password for user:", user.id);

      // Increment failed login attempts
      const newFailedAttempts = user.failedLoginAttempts + 1;
      const shouldLock = newFailedAttempts >= MAX_FAILED_ATTEMPTS;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: newFailedAttempts,
          lockedUntil: shouldLock
            ? new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000)
            : user.lockedUntil,
        },
      });

      const attemptsRemaining = MAX_FAILED_ATTEMPTS - newFailedAttempts;
      const errorMessage = shouldLock
        ? `Account locked for ${LOCKOUT_DURATION_MINUTES} minutes due to too many failed attempts.`
        : `Invalid credentials. ${attemptsRemaining} attempts remaining.`;

      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 401 },
      );
    }

    console.log("[Login API] Password verified, generating token...");

    // Check JWT_SECRET is configured
    if (!JWT_SECRET) {
      console.error(
        "[Login API] Cannot generate token: JWT_SECRET not configured",
      );
      return NextResponse.json(
        {
          success: false,
          error: "Server configuration error. Please contact administrator.",
        },
        { status: 500 },
      );
    }

    // Update last login (fire and forget)
    prisma.user
      .update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      })
      .catch((err) =>
        console.error("[Login API] Failed to update lastLoginAt:", err),
      );

    // Generate JWT token using jose (Edge Runtime compatible)
    const token = await new SignJWT({
      id: user.id,
      email: user.email,
      role: user.role,
      department: user.department,
      name: user.name,
      approvalLimit: Number(user.approvalLimit),
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(SECRET);

    console.log("[Login API] Login successful for user:", user.id);

    // Reset failed login attempts and update last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    // Create response
    const response = NextResponse.json(
      {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            department: user.department,
            approvalLimit: Number(user.approvalLimit),
          },
        },
      },
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    // Set secure cookie
    const isProduction = process.env.NODE_ENV === "production";
    response.cookies.set({
      name: "auth-token",
      value: token,
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: isProduction,
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (error) {
    console.error("[Login API] Unhandled error:", error);
    return NextResponse.json(
      { success: false, error: "Authentication service unavailable" },
      { status: 500 },
    );
  }
}
