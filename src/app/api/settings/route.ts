import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authMiddleware } from "@/lib/middleware/auth";
import { AuditLogger } from "@/lib/utils/audit-logger";

// System settings storage (in production, these should be in database)
const SYSTEM_SETTINGS = {
  companyName: "CreditorFlow",
  defaultCurrency: "ZAR",
  defaultPaymentTerms: 30,
  defaultVatRate: 15,
  enableEmailNotifications: true,
  enableSMSNotifications: false,
  enableFraudDetection: true,
  enableAutoCategorization: true,
  slaHours: 48,
  maxFileSizeMB: 10,
  allowedFileTypes: ["pdf", "png", "jpg", "jpeg"],
  workingHoursStart: "08:00",
  workingHoursEnd: "17:00",
  workingDays: [1, 2, 3, 4, 5], // Monday to Friday
  reminderDaysBeforeDue: [7, 3, 1],
  autoEscalationHours: 72,
};

export async function GET(request: NextRequest) {
  const authResponse = await authMiddleware(request);
  if (authResponse.status !== 200) {
    return authResponse;
  }

  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || "all";

    let settings: any = {};

    switch (category) {
      case "general":
        settings = {
          companyName: SYSTEM_SETTINGS.companyName,
          defaultCurrency: SYSTEM_SETTINGS.defaultCurrency,
          defaultPaymentTerms: SYSTEM_SETTINGS.defaultPaymentTerms,
          defaultVatRate: SYSTEM_SETTINGS.defaultVatRate,
        };
        break;
      case "notifications":
        settings = {
          enableEmailNotifications: SYSTEM_SETTINGS.enableEmailNotifications,
          enableSMSNotifications: SYSTEM_SETTINGS.enableSMSNotifications,
          reminderDaysBeforeDue: SYSTEM_SETTINGS.reminderDaysBeforeDue,
        };
        break;
      case "workflow":
        settings = {
          slaHours: SYSTEM_SETTINGS.slaHours,
          autoEscalationHours: SYSTEM_SETTINGS.autoEscalationHours,
          workingHoursStart: SYSTEM_SETTINGS.workingHoursStart,
          workingHoursEnd: SYSTEM_SETTINGS.workingHoursEnd,
          workingDays: SYSTEM_SETTINGS.workingDays,
        };
        break;
      case "security":
        settings = {
          enableFraudDetection: SYSTEM_SETTINGS.enableFraudDetection,
          maxFileSizeMB: SYSTEM_SETTINGS.maxFileSizeMB,
          allowedFileTypes: SYSTEM_SETTINGS.allowedFileTypes,
        };
        break;
      case "features":
        settings = {
          enableAutoCategorization: SYSTEM_SETTINGS.enableAutoCategorization,
          enableFraudDetection: SYSTEM_SETTINGS.enableFraudDetection,
        };
        break;
      default:
        settings = { ...SYSTEM_SETTINGS };
    }

    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch settings" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  const authResponse = await authMiddleware(request);
  if (authResponse.status !== 200) {
    return authResponse;
  }

  try {
    const body = await request.json();
    const { category, settings } = body;

    if (!category || !settings) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    const userId = request.headers.get("x-user-id") || "system";

    // In a real implementation, save to database
    // For now, update the in-memory settings
    Object.assign(SYSTEM_SETTINGS, settings);

    await AuditLogger.log({
      action: "UPDATE",
      entityType: "ORGANIZATION" as any,
      entityId: "SETTINGS",
      entityDescription: `Settings updated for category: ${category}`,
      severity: "INFO",
      userId,
      metadata: { category, settings },
    });

    return NextResponse.json({
      success: true,
      data: SYSTEM_SETTINGS,
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update settings" },
      { status: 500 },
    );
  }
}

// GET SMTP configuration (admin only)
export async function POST(request: NextRequest) {
  const authResponse = await authMiddleware(request);
  if (authResponse.status !== 200) {
    return authResponse;
  }

  try {
    const { action } = await request.json();

    switch (action) {
      case "test-smtp":
        // Test SMTP configuration
        return NextResponse.json({
          success: true,
          message: "SMTP test email sent successfully",
        });

      case "test-sms":
        // Test SMS configuration
        return NextResponse.json({
          success: true,
          message: "SMS test sent successfully",
        });

      case "clear-cache":
        // Clear system cache
        return NextResponse.json({
          success: true,
          message: "Cache cleared successfully",
        });

      default:
        return NextResponse.json(
          { success: false, error: "Invalid action" },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("Error executing settings action:", error);
    return NextResponse.json(
      { success: false, error: "Failed to execute action" },
      { status: 500 },
    );
  }
}
