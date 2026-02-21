import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AuthUtils } from "@/lib/auth-utils";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;

  if (!token) {
    redirect("/login");
  }

  const user = await AuthUtils.verifyToken(token);

  if (!user) {
    redirect("/login");
  }

  return (
    <DashboardShell>
      <Sidebar user={user as any} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={user as any} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          {children}
        </main>
      </div>
    </DashboardShell>
  );
}
