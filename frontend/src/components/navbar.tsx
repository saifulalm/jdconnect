"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Search, Bell, Moon, Sun, Menu } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BrandMark } from "@/components/brand-mark"

export function Navbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const [user, setUser] = useState<{ name?: string; role?: string } | null>(null)
  const [mounted, setMounted] = useState(false)
  const { resolvedTheme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
    const userData = localStorage.getItem("user")
    if (userData) {
      try {
        setUser(JSON.parse(userData))
      } catch {
        setUser(null)
      }
    }
  }, [])

  const toggleTheme = () => setTheme(resolvedTheme === "dark" ? "light" : "dark")

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Opens the sidebar drawer on mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-10 w-10 rounded-xl"
            onClick={onMenuClick}
            aria-label="Buka menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <BrandMark href="/dashboard" />
        </div>

        <div className="flex items-center gap-2">
          <div className="relative hidden md:block w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input placeholder="Cari produk, transaksi..." className="h-10 !pl-10 rounded-xl" />
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-xl"
            onClick={toggleTheme}
            aria-label="Ganti tema"
          >
            {mounted && resolvedTheme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>

          {user ? (
            <>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl relative" aria-label="Notifikasi">
                <Bell className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2 pl-1">
                <span className="grid place-items-center h-9 w-9 rounded-xl bg-primary text-primary-foreground font-semibold text-sm">
                  {user.name?.[0]?.toUpperCase() || "?"}
                </span>
                <div className="hidden md:block">
                  <p className="text-sm font-medium leading-tight">{user.name}</p>
                  <p className="text-[10px] text-muted-foreground capitalize leading-tight">{user.role}</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="hidden sm:flex" asChild>
                <Link href="/track">Lacak Pesanan</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/transaction">Beli Sekarang</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
