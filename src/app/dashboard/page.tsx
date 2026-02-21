import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { AuthUtils } from "@/lib/auth-utils";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;

  if (!token) {
    redirect("/login");
  }

  const user = await AuthUtils.verifyToken(token);

  if (!user) {
    redirect("/login");
  }

  const orgId = "dev-org-001";

  // Simple stats
  const totalInvoices = await prisma.invoice.count({
    where: { organizationId: orgId },
  });

  const pendingInvoices = await prisma.invoice.count({
    where: { organizationId: orgId, status: "PENDING_APPROVAL" },
  });

  const paidInvoices = await prisma.invoice.count({
    where: { organizationId: orgId, status: "PAID" },
  });

  const suppliers = await prisma.supplier.count({
    where: { organizationId: orgId },
  });

  const recentInvoices = await prisma.invoice.findMany({
    where: { organizationId: orgId },
    include: { supplier: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-gray-600">
            Welcome back, {user.name || user.email}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-4 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">
                Total Invoices
              </dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">
                {totalInvoices}
              </dd>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">
                Pending Approval
              </dt>
              <dd className="mt-1 text-3xl font-semibold text-yellow-600">
                {pendingInvoices}
              </dd>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">
                Paid
              </dt>
              <dd className="mt-1 text-3xl font-semibold text-green-600">
                {paidInvoices}
              </dd>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">
                Suppliers
              </dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">
                {suppliers}
              </dd>
            </div>
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Recent Invoices
            </h3>
          </div>
          <div className="border-t border-gray-200">
            <ul className="divide-y divide-gray-200">
              {recentInvoices.map((invoice) => (
                <li key={invoice.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-blue-600 truncate">
                      {invoice.invoiceNumber}
                    </p>
                    <div className="ml-2 flex-shrink-0 flex">
                      <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                        {invoice.status}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <p className="flex items-center text-sm text-gray-500">
                        {invoice.supplier?.name || "Unknown Supplier"}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                      <p>R{Number(invoice.totalAmount).toFixed(2)}</p>
                    </div>
                  </div>
                </li>
              ))}
              {recentInvoices.length === 0 && (
                <li className="px-4 py-8 text-center text-gray-500">
                  No invoices found. Create your first invoice to get started.
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
