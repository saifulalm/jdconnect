"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";

function shouldShowShell(pathname: string) {
  if (pathname.startsWith("/dashboard")) return true;
  if (pathname.startsWith("/transaction")) return true;
  if (pathname.startsWith("/transactions")) return true;
  return false;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showShell = useMemo(() => shouldShowShell(pathname), [pathname]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!showShell) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar onMenuClick={() => setSidebarOpen(true)} />
      <Sidebar isMobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-72">
        <main className="min-h-[calc(100vh-4rem)]">{children}</main>
      </div>
    </>
  );
}

