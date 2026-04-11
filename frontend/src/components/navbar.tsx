"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Zap,
  Bell,
  User,
  Moon,
  Sun,
  ChevronDown,
  LogOut,
  Menu,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes"; // Assuming next-themes installed
import { BrandMark } from "@/components/brand-mark";

export function Navbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { theme, setTheme } = useTheme();

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <header className="sticky top-0 z-50 border-b border-border/30 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-10 w-10 rounded-xl"
            onClick={onMenuClick}
            aria-label="Buka menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <BrandMark href="/dashboard" nameClassName="text-base font-semibold tracking-tight" />
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-2">
          {[
            { href: "/dashboard", label: "Dashboard" },
            { href: "/transaction", label: "Transaksi" },
            { href: "/transactions", label: "Riwayat" },
            { href: "/dashboard/analytics", label: "Analytics" },
            { href: "/dashboard/api", label: "API H2H" },
            { href: "/dashboard/settings", label: "Pengaturan" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-1",
                pathname === item.href
                  ? "bg-primary/10 text-primary shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative hidden md:block w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari produk, transaksi..."
              className="h-10 pl-10 w-full rounded-xl bg-muted/50 border-border focus-visible:ring-primary/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-xl"
            onClick={toggleTheme}
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full border-2 border-background" />
          </Button>

          {/* Profile Dropdown */}
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-bold text-white shadow-lg">
              JD
            </div>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl">
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-10 w-10 rounded-xl"
            onClick={toggleMobileMenu}
            aria-label="Buka menu navigasi"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/20 bg-background/95 backdrop-blur-xl">
          <div className="container mx-auto px-4 py-4 space-y-2">
            {[
              { href: "/dashboard", label: "Dashboard" },
              { href: "/transaction", label: "Transaksi" },
              { href: "/transactions", label: "Riwayat" },
              { href: "/dashboard/analytics", label: "Analytics" },
              { href: "/dashboard/api", label: "API H2H" },
              { href: "/dashboard/settings", label: "Pengaturan" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block px-4 py-3 rounded-xl text-sm font-medium transition-all w-full text-left",
                  pathname === item.href
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
