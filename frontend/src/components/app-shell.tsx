"use client"

import { useMemo, useState } from "react"
import { usePathname } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Sidebar } from "@/components/sidebar"

// Only authenticated-area routes get the navbar+sidebar shell.
// NOTE: "/transaction" (guest checkout) is public and shell-less;
// "/transactions" (history) IS shelled — match exact segments, not prefixes.
function shouldShowShell(pathname: string) {
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) return true
  if (pathname === "/transactions") return true
  return false
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const showShell = useMemo(() => shouldShowShell(pathname), [pathname])
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (!showShell) {
    return <>{children}</>
  }

  return (
    <>
      <Navbar onMenuClick={() => setSidebarOpen(true)} />
      <Sidebar isMobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-72">
        <main className="min-h-[calc(100vh-4rem)]">{children}</main>
      </div>
    </>
  )
}
