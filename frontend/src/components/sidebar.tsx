"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  CreditCard, 
  History, 
  BarChart3,
  Key, 
  Settings,
  LogOut,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BrandMark } from "@/components/brand-mark";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface NavItem {
  name: string;
  icon: any;
  href: string;
  roles?: string[];
}

const navItems: NavItem[] = [
  { name: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { name: "Transaksi", icon: CreditCard, href: "/transaction" },
  { name: "Riwayat", icon: History, href: "/transactions" },
  { name: "Analytics", icon: BarChart3, href: "/dashboard/analytics" },
  { name: "API H2H", icon: Key, href: "/dashboard/api" },
  { name: "Pengaturan", icon: Settings, href: "/dashboard/settings" },
  { name: "Admin", icon: Shield, href: "/admin", roles: ["ADMIN", "SUPERACCESS"] },
];

export function Sidebar({ isMobileOpen, onClose }: { isMobileOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  const filteredNavItems = navItems.filter(item => {
    if (!item.roles || !user?.role) return true;
    return item.roles.includes(user.role);
  });

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      <div 
        className={cn(
          "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden",
          isMobileOpen ? "block" : "hidden"
        )}
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 bottom-0 w-72 bg-gradient-to-b from-slate-900 to-slate-950 border-r border-slate-800 z-50 shadow-2xl transform transition-transform duration-300 ease-in-out lg:translate-x-0",
        isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Header */}
        <div className="p-6 border-b border-slate-800">
          <BrandMark href="/dashboard" className="text-white" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {filteredNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200 group hover:bg-slate-800/50 hover:shadow-lg hover:shadow-slate-900/50 border border-transparent hover:border-slate-700",
                pathname === item.href
                  ? "bg-gradient-to-r from-primary to-blue-600 text-white shadow-lg shadow-primary/25 border-primary/50"
                  : "text-slate-400 hover:text-white"
              )}
              onClick={() => onClose()}
            >
              <item.icon className={cn(
                "h-5 w-5 flex-shrink-0",
                pathname === item.href ? "text-white" : "group-hover:text-primary"
              )} />
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>

        {/* Footer - User Profile & Logout */}
        <div className="p-4 border-t border-slate-800 mt-auto">
          <Card className="glass-dark border-slate-800/50 bg-slate-900/50 backdrop-blur-sm hover:border-slate-700 transition-all">
            <div className="flex items-center gap-3 p-4">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">{user?.name?.[0] || "JD"}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white truncate">{user?.name || "User Name"}</p>
                <p className="text-xs text-slate-400 truncate">{user?.email || "user@jdconnect.com"}</p>
                {user?.role && <p className="text-[10px] uppercase tracking-widest text-primary/70 mt-0.5">{user.role}</p>}
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start h-12 rounded-xl border border-slate-700 bg-slate-800/50 hover:bg-rose-500/20 hover:border-rose-500/50 hover:text-rose-300 text-slate-400 transition-all group"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-3 group-hover:text-rose-300 transition-colors" />
              Keluar
            </Button>
          </Card>
        </div>
      </aside>
    </>
  );
}
