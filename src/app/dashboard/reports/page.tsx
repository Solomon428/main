"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";

export default function ReportsPage() {
  const reports = [
    {
      title: "Invoice Summary",
      description: "Overview of all invoices by status and period",
      icon: Icons.fileText,
    },
    {
      title: "Payment Analysis",
      description: "Track payments, outstanding amounts, and trends",
      icon: Icons.dollarSign,
    },
    {
      title: "Supplier Performance",
      description: "Analyze supplier metrics and payment history",
      icon: Icons.users,
    },
    {
      title: "Approval Workflow",
      description: "Review approval times and bottlenecks",
      icon: Icons.checkCircle,
    },
    {
      title: "Tax Report",
      description: "Generate tax reports for accounting",
      icon: Icons.barChart,
    },
    {
      title: "Audit Trail",
      description: "Complete activity log for compliance",
      icon: Icons.shield,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            Generate and download comprehensive reports
          </p>
        </div>
        <Button variant="outline">
          <Icons.download className="mr-2 h-4 w-4" />
          Export All
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <Card key={report.title} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium">{report.title}</CardTitle>
                <Icon className="h-5 w-5 text-gray-500" />
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4">
                  {report.description}
                </CardDescription>
                <Button variant="secondary" className="w-full">
                  Generate Report
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
