import {
  LayoutDashboard,
  Zap,
  History,
  BarChart3,
  Key,
  Settings,
  Shield,
  Search,
  type LucideIcon,
} from "lucide-react"

export interface NavItem {
  name: string
  icon: LucideIcon
  href: string
  adminOnly?: boolean
}

// Single source of truth for in-shell navigation (sidebar + navbar mobile menu).
export const NAV_ITEMS: NavItem[] = [
  { name: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { name: "Beli Cepat", icon: Zap, href: "/transaction" },
  { name: "Riwayat", icon: History, href: "/transactions" },
  { name: "Lacak Pesanan", icon: Search, href: "/track" },
  { name: "Analytics", icon: BarChart3, href: "/dashboard/analytics" },
  { name: "API H2H", icon: Key, href: "/dashboard/api" },
  { name: "Pengaturan", icon: Settings, href: "/dashboard/settings" },
  { name: "Admin", icon: Shield, href: "/admin", adminOnly: true },
]
