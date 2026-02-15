"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Home } from "lucide-react"
import { cn } from "@/lib/utils"

// Map of route segments to display names
const routeNames: Record<string, string> = {
  dashboard: "Dashboard",
  invoices: "Invoices",
  suppliers: "Suppliers",
  reports: "Reports",
  teams: "Teams",
  settings: "Settings",
  upload: "Upload",
  processing: "Processing Queue",
  pending: "Pending Approval",
  paid: "Paid",
  new: "New",
  performance: "Performance",
  contracts: "Contracts",
  aging: "Aging Report",
  "cash-flow": "Cash Flow",
  tax: "Tax Summary",
  custom: "Custom Reports",
  roles: "Roles & Permissions",
  activity: "Activity Log",
  departments: "Departments",
  organization: "Organization",
  integrations: "Integrations",
  security: "Security",
}

export function Breadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)

  // Build breadcrumb items
  const breadcrumbs = segments.map((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/")
    const name = routeNames[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)
    const isLast = index === segments.length - 1

    return { href, name, isLast }
  })

  if (breadcrumbs.length <= 1) return null

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-6">
      <Link 
        href="/dashboard" 
        className="flex items-center hover:text-gray-900 transition-colors"
      >
        <Home className="w-4 h-4" />
      </Link>
      
      {breadcrumbs.slice(1).map((crumb) => (
        <div key={crumb.href} className="flex items-center">
          <ChevronRight className="w-4 h-4 mx-2" />
          {crumb.isLast ? (
            <span className="font-medium text-gray-900">{crumb.name}</span>
          ) : (
            <Link
              href={crumb.href}
              className="hover:text-gray-900 transition-colors"
            >
              {crumb.name}
            </Link>
          )}
        </div>
      ))}
    </nav>
  )
}
