"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Upload, Plus, FileText, Building2 } from "lucide-react"

const actions = [
  {
    label: "Upload Invoice",
    href: "/dashboard/invoices/upload",
    icon: Upload,
    variant: "default" as const,
  },
  {
    label: "Add Supplier",
    href: "/dashboard/suppliers/new",
    icon: Building2,
    variant: "outline" as const,
  },
  {
    label: "Generate Report",
    href: "/dashboard/reports",
    icon: FileText,
    variant: "outline" as const,
  },
]

export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-3">
      {actions.map((action) => (
        <Button key={action.label} variant={action.variant} asChild>
          <Link href={action.href} className="flex items-center">
            <action.icon className="w-4 h-4 mr-2" />
            {action.label}
          </Link>
        </Button>
      ))}
    </div>
  )
}
