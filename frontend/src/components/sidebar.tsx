"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { LogOut } from "lucide-react"
import { cn, isAdminRole } from "@/lib/utils"
import { NAV_ITEMS } from "@/lib/nav"

export function Sidebar({
  isMobileOpen,
  onClose,
}: {
  isMobileOpen: boolean
  onClose: () => void
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<{ name?: string; email?: string; role?: string } | null>(null)

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) {
      try {
        setUser(JSON.parse(userData))
      } catch {
        setUser(null)
      }
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    router.push("/login")
  }

  // Hide admin-only items unless the logged-in user is admin/superaccess.
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || isAdminRole(user?.role))

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden",
          isMobileOpen ? "block" : "hidden",
        )}
        onClick={onClose}
      />

      {/* Sidebar: sits below the sticky h-16 navbar on desktop */}
      <aside
        className={cn(
          "fixed left-0 top-0 bottom-0 lg:top-16 z-50 lg:z-40 w-72 flex flex-col",
          "bg-card border-r border-border shadow-soft",
          "transform transition-transform duration-300 ease-in-out",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {items.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer pinned to bottom */}
        <div className="p-4 border-t border-border">
          {user ? (
            <div className="rounded-2xl border border-border bg-background p-3 space-y-3">
              <div className="flex items-center gap-3">
                <span className="grid place-items-center size-10 rounded-xl bg-primary text-primary-foreground font-semibold">
                  {user.name?.[0]?.toUpperCase() || "?"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{user.name || "Pengguna"}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full h-10 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/5 transition-colors inline-flex items-center justify-center gap-2"
              >
                <LogOut className="h-4 w-4" /> Keluar
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              onClick={onClose}
              className="block w-full h-10 leading-10 text-center rounded-xl bg-primary text-primary-foreground text-sm font-medium"
            >
              Masuk
            </Link>
          )}
        </div>
      </aside>
    </>
  )
}
