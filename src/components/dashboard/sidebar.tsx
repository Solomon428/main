"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Building2, 
  BarChart3, 
  Settings, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Upload,
  Receipt,
  CreditCard,
  ChevronDown,
  Building
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { signOut } from "next-auth/react"

interface SidebarProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
    role?: string
    organizationId?: string
  }
}

interface NavItem {
  name: string
  href: string
  icon: React.ElementType
  badge?: string | null
  submenu?: { name: string; href: string; icon?: React.ElementType }[]
}

const navigation: NavItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    badge: null
  },
  {
    name: "Invoices",
    href: "/dashboard/invoices",
    icon: FileText,
    badge: null,
    submenu: [
      { name: "All Invoices", href: "/dashboard/invoices" },
      { name: "Upload", href: "/dashboard/invoices/upload", icon: Upload },
      { name: "Processing Queue", href: "/dashboard/invoices/processing" },
      { name: "Pending Approval", href: "/dashboard/invoices/pending" },
      { name: "Paid", href: "/dashboard/invoices/paid" }
    ]
  },
  {
    name: "Suppliers",
    href: "/dashboard/suppliers",
    icon: Building2,
    submenu: [
      { name: "Directory", href: "/dashboard/suppliers" },
      { name: "Add Supplier", href: "/dashboard/suppliers/new" },
      { name: "Performance", href: "/dashboard/suppliers/performance" },
      { name: "Contracts", href: "/dashboard/suppliers/contracts" }
    ]
  },
  {
    name: "Reports",
    href: "/dashboard/reports",
    icon: BarChart3,
    submenu: [
      { name: "Overview", href: "/dashboard/reports" },
      { name: "Aging Report", href: "/dashboard/reports/aging" },
      { name: "Cash Flow", href: "/dashboard/reports/cash-flow" },
      { name: "Tax Summary", href: "/dashboard/reports/tax" },
      { name: "Custom Reports", href: "/dashboard/reports/custom" }
    ]
  },
  {
    name: "Teams",
    href: "/dashboard/teams",
    icon: Users,
    submenu: [
      { name: "Members", href: "/dashboard/teams" },
      { name: "Roles & Permissions", href: "/dashboard/teams/roles" },
      { name: "Activity Log", href: "/dashboard/teams/activity" },
      { name: "Departments", href: "/dashboard/teams/departments" }
    ]
  },
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    submenu: [
      { name: "General", href: "/dashboard/settings" },
      { name: "Organization", href: "/dashboard/settings/organization" },
      { name: "Integrations", href: "/dashboard/settings/integrations" },
      { name: "Security", href: "/dashboard/settings/security" }
    ]
  }
]

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [expandedItems, setExpandedItems] = useState<string[]>(["/dashboard/invoices"])

  const toggleExpand = (href: string) => {
    setExpandedItems(prev => 
      prev.includes(href) 
        ? prev.filter(item => item !== href)
        : [...prev, href]
    )
  }

  return (
    <aside 
      className={cn(
        "bg-slate-900 text-white transition-all duration-300 flex flex-col h-screen sticky top-0",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 flex-shrink-0">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg">CreditorFlow</span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mx-auto">
            <CreditCard className="w-5 h-5 text-white" />
          </div>
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setCollapsed(!collapsed)}
          className="text-slate-400 hover:text-white hover:bg-slate-800"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          const isExpanded = expandedItems.includes(item.href)
          
          return (
            <div key={item.name}>
              <Link
                href={item.submenu ? "#" : item.href}
                onClick={(e) => {
                  if (item.submenu) {
                    e.preventDefault()
                    toggleExpand(item.href)
                  }
                }}
                className={cn(
                  "flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative group",
                  isActive 
                    ? "bg-blue-600 text-white" 
                    : "text-slate-300 hover:bg-slate-800 hover:text-white",
                  collapsed && "justify-center px-2"
                )}
              >
                <item.icon className={cn("w-5 h-5 flex-shrink-0", collapsed ? "mx-auto" : "mr-3")} />
                {!collapsed && (
                  <>
                    <span className="flex-1 truncate">{item.name}</span>
                    {item.badge && (
                      <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full flex-shrink-0">
                        {item.badge}
                      </span>
                    )}
                    {item.submenu && (
                      <ChevronDown 
                        className={cn(
                          "w-4 h-4 flex-shrink-0 transition-transform", 
                          isExpanded && "rotate-180"
                        )} 
                      />
                    )}
                  </>
                )}
                {/* Tooltip for collapsed mode */}
                {collapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 pointer-events-none">
                    {item.name}
                  </div>
                )}
              </Link>
              
              {/* Submenu */}
              {!collapsed && item.submenu && isExpanded && (
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-slate-700 pl-2">
                  {item.submenu.map((sub) => (
                    <Link
                      key={sub.name}
                      href={sub.href}
                      className={cn(
                        "flex items-center px-3 py-2 rounded-lg text-sm transition-colors",
                        pathname === sub.href
                          ? "bg-slate-800 text-white"
                          : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                      )}
                    >
                      {sub.icon && <sub.icon className="w-4 h-4 mr-2" />}
                      {sub.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-slate-800 flex-shrink-0">
        {!collapsed ? (
          <div className="flex items-center space-x-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-slate-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.name || user.email}</p>
              <p className="text-xs text-slate-400 truncate capitalize">{user.role?.toLowerCase()}</p>
            </div>
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center mx-auto mb-4">
            <Users className="w-5 h-5 text-slate-300" />
          </div>
        )}
        <Button 
          variant="ghost" 
          className={cn(
            "w-full text-slate-400 hover:text-white hover:bg-slate-800",
            collapsed && "px-2"
          )}
          onClick={() => signOut({ callbackUrl: '/auth/signin' })}
        >
          <LogOut className="w-5 h-5 mr-2" />
          {!collapsed && "Sign Out"}
        </Button>
      </div>
    </aside>
  )
}
