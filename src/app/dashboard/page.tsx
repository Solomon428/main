import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardStats } from "@/components/dashboard/dashboard-stats"
import { RecentInvoices } from "@/components/dashboard/recent-invoices"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { SpendingChart } from "@/components/dashboard/spending-chart"
import { SupplierDistribution } from "@/components/dashboard/supplier-distribution"
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/auth/signin")

  const orgId = session.user.organizationId

  // Fetch dashboard statistics
  const [
    totalPayables,
    overdueAmount,
    pendingApproval,
    paidThisMonth,
    recentInvoices,
    recentActivity
  ] = await Promise.all([
    // Total payables (unpaid invoices)
    prisma.invoices.aggregate({
      where: {
        organizationId: orgId,
        status: { in: ["PENDING_APPROVAL", "APPROVED", "PROCESSING"] },
      },
      _sum: { totalAmount: true },
    }),

    // Overdue amount
    prisma.invoices.aggregate({
      where: {
        organizationId: orgId,
        status: { not: "PAID" },
        dueDate: { lt: new Date() },
      },
      _sum: { totalAmount: true },
    }),

    // Pending approval count
    prisma.invoices.count({
      where: {
        organizationId: orgId,
        status: "PENDING_APPROVAL",
      },
    }),

    // Paid this month
    prisma.invoices.aggregate({
      where: {
        organizationId: orgId,
        status: "PAID",
        paidDate: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
      _sum: { totalAmount: true },
    }),

    // Recent invoices
    prisma.invoices.findMany({
      where: { organizationId: orgId },
      include: {
        supplier: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),

    // Recent activity
    prisma.auditLog.findMany({
      where: { organizationId: orgId },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ])

  // Monthly spending data for chart
  const spendingData = await prisma.$queryRaw`
    SELECT 
      DATE_TRUNC('month', "invoiceDate") as month,
      SUM("totalAmount") as total,
      COUNT(*) as count
    FROM "invoices"
    WHERE "organizationId" = ${orgId}
      AND "invoiceDate" >= DATE_TRUNC('year', CURRENT_DATE)
    GROUP BY DATE_TRUNC('month', "invoiceDate")
    ORDER BY month ASC
  `

  // Supplier distribution
  const supplierDistribution = await prisma.invoices.groupBy({
    by: ["supplierId"],
    where: {
      organizationId: orgId,
      invoiceDate: {
        gte: new Date(new Date().getFullYear(), 0, 1),
      },
    },
    _sum: { totalAmount: true },
    _count: { id: true },
  })

  const supplierData = await Promise.all(
    supplierDistribution.map(async (item) => {
      const supplier = await prisma.suppliers.findUnique({
        where: { id: item.supplierId },
        select: { name: true },
      })
      return {
        name: supplier?.name || "Unknown",
        amount: item._sum.totalAmount || 0,
        count: item._count.id,
      }
    })
  )

  return (
    <div className="space-y-6">
      <Breadcrumbs />
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Welcome back, {session.user.name || session.user.email}. Here's what's happening today.
        </p>
      </div>

      {/* Quick Actions */}
      <QuickActions />

      {/* Stats */}
      <DashboardStats
        totalPayables={totalPayables._sum.totalAmount || 0}
        overdueAmount={overdueAmount._sum.totalAmount || 0}
        pendingApproval={pendingApproval}
        paidThisMonth={paidThisMonth._sum.totalAmount || 0}
      />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SpendingChart data={spendingData as any[]} />
        <SupplierDistribution data={supplierData} />
      </div>

      {/* Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentInvoices invoices={recentInvoices} />
        <ActivityFeed activities={recentActivity} />
      </div>
    </div>
  )
}
