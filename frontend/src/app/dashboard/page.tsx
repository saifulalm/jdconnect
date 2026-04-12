"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandMark } from "@/components/brand-mark";
import { BRAND } from "@/lib/brand";
import { apiUrl } from "@/lib/api";
import { 
  LogOut, 
  Smartphone, 
  Wifi, 
  Zap, 
  Gamepad2, 
  Wallet, 
  Clock, 
  ChevronRight, 
  LayoutDashboard, 
  History, 
  Settings, 
  Key, 
  CreditCard,
  Plus,
  TrendingUp,
  Search,
  User as UserIcon,
  Bell
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  balance: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("pulsa");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isProductsLoading, setIsProductsLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    if (!token || !userData) {
      router.push("/login");
      return;
    }

    const fetchUserProfile = async () => {
      try {
        const response = await fetch(apiUrl("/users/profile"), {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        const data = await response.json();
        if (data.status === 'success') {
          setUser(data.data);
          localStorage.setItem("user", JSON.stringify(data.data));
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchProducts = async () => {
      setIsProductsLoading(true);
      try {
        const response = await fetch(apiUrl("/products"), {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        const data = await response.json();
        if (data.status === 'success' || Array.isArray(data)) {
          const prodData = Array.isArray(data) ? data : data.data || data;
          setProducts(prodData);
        }
      } catch (error) {
        console.error("Failed to fetch products:", error);
      } finally {
        setIsProductsLoading(false);
      }
    };

    fetchUserProfile();
    fetchProducts();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
  };

  const categories = [
    { id: "pulsa", name: "Pulsa", icon: Smartphone, description: "All operator" },
    { id: "data", name: "Paket Data", icon: Wifi, description: "Internet cepat" },
    { id: "pln", name: "Listrik PLN", icon: Zap, description: "Token listrik" },
    { id: "game", name: "Voucher Game", icon: Gamepad2, description: "Topup game" },
    { id: "ewallet", name: "E-Wallet", icon: Wallet, description: "Isi saldo" },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen mesh-gradient flex items-center justify-center">
        <Zap className="h-10 w-10 text-primary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 space-y-8">
          {/* Top Stats Cards */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="glass-dark border-white/5 rounded-[2.5rem] p-8 overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-8">
                <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20 group-hover:scale-110 transition-transform duration-500">
                  <TrendingUp className="h-7 w-7" />
                </div>
              </div>
              <div className="space-y-4">
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Saldo Akun</p>
                <h2 className="text-4xl font-bold tracking-tight">{formatCurrency(user.balance || 0)}</h2>
                <div className="flex items-center gap-2 pt-2">
                  <Button size="sm" className="rounded-xl shadow-glow">
                    <Plus className="mr-2 h-4 w-4" /> Top Up
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="glass-dark border-white/5 rounded-[2.5rem] p-8 overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-8">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 group-hover:scale-110 transition-transform duration-500">
                  <Zap className="h-7 w-7" />
                </div>
              </div>
              <div className="space-y-4">
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Total Transaksi</p>
                <h2 className="text-4xl font-bold tracking-tight">0</h2>
                <p className="text-xs text-slate-500">Bulan ini: 0 transaksi</p>
              </div>
            </Card>

            <Card className="glass-dark border-white/5 rounded-[2.5rem] p-8 overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-8">
                <div className="h-14 w-14 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-500 border border-violet-500/20 group-hover:scale-110 transition-transform duration-500">
                  <Smartphone className="h-7 w-7" />
                </div>
              </div>
              <div className="space-y-4">
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Status Akun</p>
                <h2 className="text-4xl font-bold tracking-tight">Aktif</h2>
                <div className="flex items-center gap-2 text-emerald-500 text-xs font-bold bg-emerald-500/10 px-3 py-1 rounded-full w-fit">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  TERVERIFIKASI
                </div>
              </div>
            </Card>
          </div>

          {/* Service Categories */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight">Layanan Digital</h2>
              <div className="flex gap-2 bg-white/5 p-1 rounded-2xl">
                {categories.map((cat) => (
                  <Button
                    key={cat.id}
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`rounded-xl px-4 h-10 transition-all duration-300 ${
                      selectedCategory === cat.id 
                        ? "bg-primary text-white shadow-glow" 
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <cat.icon className="mr-2 h-4 w-4" /> {cat.name}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {isProductsLoading ? (
                <div className="col-span-full flex justify-center py-12">
                  <div className="flex items-center gap-3 text-slate-400">
                    <Zap className="h-5 w-5 animate-spin" />
                    Memuat produk...
                  </div>
                </div>
              ) : products.length > 0 ? (
                products
                  .filter(p => !selectedCategory || p.category?.toLowerCase() === selectedCategory || p.category === selectedCategory)
                  .map((product: any) => (
                    <Card key={product.id} className="glass-dark border-white/5 rounded-[2rem] overflow-hidden group hover:border-primary/50 transition-all duration-500">
                      <div className="p-6 space-y-6">
                        <div className="flex justify-between items-start">
                          <div className="px-4 py-1.5 rounded-xl text-[10px] font-bold tracking-widest uppercase border border-primary/30 text-primary">
                            {product.provider}
                          </div>
                          <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                            <Zap className="h-5 w-5 text-slate-400 group-hover:text-primary transition-colors" />
                          </div>
                        </div>
                        
                        <div>
                          <h3 className="font-bold text-lg mb-1">{product.name}</h3>
                          <p className="text-xs text-slate-500 font-medium">Stok: {product.stock || 'Ready'} • Instan</p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-white/5">
                          <div className="space-y-0.5">
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Harga</p>
                            <p className="text-xl font-bold text-primary">{formatCurrency(product.price)}</p>
                          </div>
                          <Button className="h-12 w-12 rounded-2xl shadow-glow p-0" onClick={() => router.push(`/transaction?product=${product.id}`)}>
                            <Plus className="h-6 w-6" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))
              ) : (
                <div className="col-span-full py-12 text-center text-slate-400">
                  Tidak ada produk tersedia saat ini.
                </div>
              )}
            </div>
          </div>

          {/* Bottom Section */}
          <div className="grid lg:grid-cols-2 gap-8">
            <Card className="glass-dark border-white/5 rounded-[2.5rem] p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">Transaksi Terakhir</h3>
                <Button variant="link" className="text-primary p-0" asChild>
                  <Link href="/transactions">Lihat Semua <ChevronRight className="ml-1 h-4 w-4" /></Link>
                </Button>
              </div>
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                <div className="h-20 w-20 rounded-[2rem] bg-white/5 flex items-center justify-center border border-white/5 text-slate-600">
                  <Clock className="h-10 w-10" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold">Belum ada transaksi</p>
                  <p className="text-sm text-slate-500">Mulai transaksi pertama Anda sekarang.</p>
                </div>
              </div>
            </Card>

            <Card className="glass-dark border-white/5 rounded-[2.5rem] p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">Informasi H2H API</h3>
                <Button variant="link" className="text-primary p-0" asChild>
                  <Link href="/dashboard/api">Kelola API <ChevronRight className="ml-1 h-4 w-4" /></Link>
                </Button>
              </div>
              <div className="p-6 bg-black/40 rounded-3xl border border-white/5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500">
                    <Key className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Partner API</p>
                    <p className="text-xs text-slate-500">Gunakan API untuk integrasi bisnis.</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">API Key Status</p>
                  <div className="h-12 bg-white/5 rounded-xl flex items-center px-4 border border-white/5 justify-between">
                    <span className="text-sm font-mono text-slate-400">pk_live_****************</span>
                    <Button variant="ghost" size="sm" className="h-8 rounded-lg hover:bg-primary/20 hover:text-primary">Salin</Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
    </div>
  );
}
