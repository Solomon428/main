import { NextRequest, NextResponse } from "next/server";
import { authMiddleware } from "@/middleware/auth.middleware";

export async function GET(req: NextRequest) {
  const authResponse = await authMiddleware(req);
  if (authResponse.status !== 200) return authResponse;

  // Mock dashboard stats
  const stats = {
    totalInvoices: 1234,
    pendingApprovals: 42,
    overdueInvoices: 3,
    totalSpend: 456789,
    avgProcessingTime: 2.4,
    slaCompliance: 94.2,
    recentActivity: [
      { action: "Invoice approved", user: "John Doe", time: "10 min ago" },
      { action: "Invoice uploaded", user: "Jane Smith", time: "25 min ago" },
      { action: "Payment processed", user: "System", time: "1 hour ago" },
    ],
  };

  return NextResponse.json({ success: true, data: stats });
}
