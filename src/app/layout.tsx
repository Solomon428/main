import React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ui/theme-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CREDITORFLOW - Enterprise Invoice Management",
  description: "AI-powered invoice processing and approval system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="min-h-screen bg-background">
            <header className="border-b">
              <div className="container mx-auto px-4 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="h-8 w-8 rounded-lg bg-primary"></div>
                    <h1 className="text-2xl font-bold">CREDITORFLOW</h1>
                  </div>
                  <nav className="flex items-center space-x-6">
                    <a
                      href="/dashboard"
                      className="text-sm font-medium hover:text-primary"
                    >
                      Dashboard
                    </a>
                    <a
                      href="/dashboard/invoices"
                      className="text-sm font-medium hover:text-primary"
                    >
                      Invoices
                    </a>
                    <a
                      href="/dashboard/suppliers"
                      className="text-sm font-medium hover:text-primary"
                    >
                      Suppliers
                    </a>
                    <a
                      href="/approvals"
                      className="text-sm font-medium hover:text-primary"
                    >
                      Approvals
                    </a>
                    <a
                      href="/team"
                      className="text-sm font-medium hover:text-primary"
                    >
                      Team
                    </a>
                    <a
                      href="/dashboard/reports"
                      className="text-sm font-medium hover:text-primary"
                    >
                      Reports
                    </a>
                  </nav>
                </div>
              </div>
            </header>
            <main>{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
