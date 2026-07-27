"use client";

import { isAdminRole } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BrandMark } from "@/components/brand-mark";
import { BRAND } from "@/lib/brand";
import { apiUrl } from "@/lib/api";
import { Users, CreditCard, DollarSign, TrendingUp, Package, LogOut, RefreshCw, LayoutDashboard, Settings, FileText, ChevronRight, Layers } from "lucide-react";

interface Stats {
  totalUsers: number;
  totalTransactions: number;
  totalRevenue: number;
  pendingTransactions: number;
}

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalTransactions: 0,
    totalRevenue: 0,
    pendingTransactions: 0,
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    
    if (!token || !user) {
      router.push("/login");
      return;
    }

    const userData = JSON.parse(user);
    if (!isAdminRole(userData.role)) {
      router.push("/dashboard");
      return;
    }

    // Fetch admin stats
    fetchStats();
  }, [router]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }
      const response = await fetch(apiUrl("/admin/stats"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setStats({
        totalUsers: Number(data.totalUsers ?? 0),
        totalTransactions: Number(data.totalTransactions ?? 0),
        totalRevenue: Number(data.totalRevenue ?? 0),
        pendingTransactions: Number(data.pendingTransactions ?? 0),
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
  };

  const statCards = [
    {
      title: "Total Users",
      value: stats.totalUsers.toLocaleString(),
      change: "+12.5%",
      icon: Users,
      trend: "up"
    },
    {
      title: "Total Transaksi",
      value: stats.totalTransactions.toLocaleString(),
      change: "+8.2%",
      icon: CreditCard,
      trend: "up"
    },
    {
      title: "Total Pendapatan",
      value: formatCurrency(stats.totalRevenue),
      change: "+15.3%",
      icon: DollarSign,
      trend: "up"
    },
    {
      title: "Pending Transaksi",
      value: stats.pendingTransactions.toString(),
      change: "-5.1%",
      icon: Package,
      trend: "down"
    },
  ];

  return (
    <div className="min-h-screen mesh-gradient font-sans selection:bg-primary/20 selection:text-foreground flex flex-col md:flex-row">
      <aside className="hidden md:flex w-72 flex-col glass border-r border-border/60 min-h-screen sticky top-0">
        <div className="h-16 flex items-center px-6 border-b border-border/60">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <BrandMark href="/admin" />
              <span className="text-xs text-muted-foreground mt-0.5">Admin</span>
            </div>
          </div>
        </div>
        <div className="flex-1 py-6 px-4 space-y-1">
          <Link href="/admin" className="flex items-center px-3 py-2.5 bg-primary/10 text-foreground rounded-xl font-medium text-sm transition-colors border border-primary/20">
            <LayoutDashboard className="h-4 w-4 mr-3 text-primary" />
            Dashboard
          </Link>
          <Link href="/admin/products" className="flex items-center px-3 py-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-xl font-medium text-sm transition-colors">
            <Package className="h-4 w-4 mr-3" />
            Produk
          </Link>
          <Link href="/admin/users" className="flex items-center px-3 py-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-xl font-medium text-sm transition-colors">
            <Users className="h-4 w-4 mr-3" />
            Pengguna
          </Link>
          <Link href="/admin/transactions" className="flex items-center px-3 py-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-xl font-medium text-sm transition-colors">
            <CreditCard className="h-4 w-4 mr-3" />
            Transaksi
          </Link>
          <Link href="/admin/catalog" className="flex items-center px-3 py-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-xl font-medium text-sm transition-colors">
            <Layers className="h-4 w-4 mr-3" />
            Katalog
          </Link>
        </div>
        <div className="p-4 border-t border-border/60">
          <Button variant="ghost" onClick={handleLogout} className="w-full justify-start">
            <LogOut className="h-4 w-4 mr-3" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="md:hidden h-16 glass border-b border-border/60 flex items-center justify-between px-4 sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <BrandMark href="/admin" />
            <span className="text-xs text-muted-foreground">Admin</span>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </header>

        {/* Topbar Desktop */}
        <header className="hidden md:flex h-16 glass border-b border-border/60 items-center justify-between px-8 sticky top-0 z-40">
          <div>
            <h1 className="text-xl font-semibold">Overview</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{BRAND.name} Admin Workspace</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" onClick={fetchStats} className="h-9" disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>
            <div className="h-9 w-9 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-medium text-sm">
              A
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-auto">
          {/* Mobile Welcome */}
          <div className="md:hidden mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
              <p className="text-sm text-muted-foreground">Ringkasan performa hari ini</p>
            </div>
            <Button variant="outline" size="icon" onClick={fetchStats} className="h-9 w-9 rounded-2xl">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 mb-8">
            {statCards.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card key={index} className="glass border-border/60 rounded-2xl card-hover">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className={`flex items-center text-xs font-medium px-2 py-1 rounded-full border ${
                        stat.trend === 'up' ? 'bg-success/10 text-success border-success/20' : 'bg-warning/10 text-warning border-warning/20'
                      }`}>
                        <TrendingUp className={`h-3 w-3 mr-1 ${stat.trend === 'down' ? 'rotate-180' : ''}`} />
                        {stat.change}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">{stat.title}</p>
                      <h3 className="text-2xl font-semibold tracking-tight">{stat.value}</h3>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            {/* Recent Transactions */}
            <Card className="lg:col-span-2 glass border-border/60 rounded-2xl">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div>
                  <CardTitle className="text-lg">Transaksi Terbaru</CardTitle>
                  <CardDescription>5 transaksi terakhir hari ini</CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="text-primary hover:text-primary-hover" asChild>
                  <Link href="/admin/transactions">
                    Lihat Semua <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((item) => (
                    <div key={item} className="flex items-center justify-between p-4 rounded-2xl border border-border/60 bg-card/30 hover:bg-muted/50 transition-colors group">
                      <div className="flex items-center space-x-4">
                        <div className="h-10 w-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                          <Package className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">INV-2024-{1000 + item}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Telkomsel 25K • Budi Santoso</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">Rp 26.000</p>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-success/10 text-success border border-success/20 mt-1">
                          Berhasil
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="space-y-6">
              <Card className="glass border-border/60 rounded-2xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Aksi Cepat</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link href="/admin/products/create" className="flex items-start p-3 rounded-2xl hover:bg-muted/60 border border-transparent hover:border-border/60 transition-colors group">
                    <div className="h-10 w-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mr-4 group-hover:bg-primary/15">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Tambah Produk</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Buat produk pulsa/data baru</p>
                    </div>
                  </Link>
                  <Link href="/admin/reports" className="flex items-start p-3 rounded-2xl hover:bg-muted/60 border border-transparent hover:border-border/60 transition-colors group">
                    <div className="h-10 w-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mr-4 group-hover:bg-primary/15">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Laporan Penjualan</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Unduh rekap data bulanan</p>
                    </div>
                  </Link>
                  <Link href="/admin/settings" className="flex items-start p-3 rounded-2xl hover:bg-muted/60 border border-transparent hover:border-border/60 transition-colors group">
                    <div className="h-10 w-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mr-4 group-hover:bg-primary/15">
                      <Settings className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Pengaturan Sistem</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Konfigurasi fee & payment</p>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
