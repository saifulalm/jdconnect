"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Search, 
  Filter, 
  Receipt,
  LayoutDashboard,
  CreditCard,
  History,
  Key,
  Settings,
  LogOut,
  User as UserIcon,
  Bell,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Zap
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { BrandMark } from "@/components/brand-mark";
import { apiUrl } from "@/lib/api";

interface Transaction {
  id: string;
  invoiceNumber: string;
  type: string;
  provider: string;
  phoneNumber: string;
  amount: number;
  price: number;
  status: string;
  createdAt: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function TransactionsPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    if (!token || !userData) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(userData));
    fetchTransactions();
  }, [router]);

  const fetchTransactions = async () => {
    const token = localStorage.getItem("token");
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(apiUrl("/transactions"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setTransactions(Array.isArray(data) ? data : data.data || []);
    } catch {
      setError("Gagal memuat transaksi. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number | string) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(Number(value));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const getStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case "success":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "pending":
      case "processing":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "failed":
        return "bg-rose-500/10 text-rose-500 border-rose-500/20";
      default:
        return "bg-slate-500/10 text-slate-500 border-slate-500/20";
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
  };

  const filteredTransactions = transactions.filter(t => 
    t.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.phoneNumber.includes(searchQuery) ||
    t.provider.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) return null;

  return (
    <div className="p-6 sm:p-8 space-y-8">
          {/* Filters & Search */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-primary transition-colors" />
              <Input 
                placeholder="Cari invoice atau nomor..." 
                className="h-12 pl-12 bg-white/5 border-white/5 rounded-2xl focus:ring-primary/50 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <Button variant="outline" className="rounded-xl border-white/5 bg-white/5 h-12 flex-1 md:flex-none">
                <Filter className="mr-2 h-4 w-4" /> Filter
              </Button>
            </div>
          </div>

          {/* Transactions List */}
          <Card className="glass-dark border-white/5 rounded-[2.5rem] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-white/5">
                    <th className="p-6 text-xs font-bold uppercase tracking-widest text-slate-500">Invoice / Tanggal</th>
                    <th className="p-6 text-xs font-bold uppercase tracking-widest text-slate-500">Produk</th>
                    <th className="p-6 text-xs font-bold uppercase tracking-widest text-slate-500">Tujuan</th>
                    <th className="p-6 text-xs font-bold uppercase tracking-widest text-slate-500">Harga</th>
                    <th className="p-6 text-xs font-bold uppercase tracking-widest text-slate-500 text-center">Status</th>
                    <th className="p-6"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="p-20 text-center">
                        <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto mb-4" />
                        <p className="text-slate-500">Memuat data transaksi...</p>
                      </td>
                    </tr>
                  ) : filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-20 text-center">
                        <div className="h-20 w-20 rounded-3xl bg-white/5 flex items-center justify-center mx-auto mb-4 text-slate-600 border border-white/5">
                          <Receipt className="h-10 w-10" />
                        </div>
                        <h3 className="font-bold text-lg">Tidak ada transaksi</h3>
                        <p className="text-slate-500">Data transaksi tidak ditemukan atau belum ada.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-white/5 transition-colors group">
                        <td className="p-6">
                          <div className="font-bold text-sm mb-1 group-hover:text-primary transition-colors">{tx.invoiceNumber}</div>
                          <div className="text-xs text-slate-500">{formatDate(tx.createdAt)}</div>
                        </td>
                        <td className="p-6">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 group-hover:border-primary/30 transition-colors">
                              <Zap className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <div className="font-bold text-sm">{tx.provider}</div>
                              <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{tx.type}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="font-mono text-sm">{tx.phoneNumber}</div>
                        </td>
                        <td className="p-6">
                          <div className="font-bold text-primary">{formatCurrency(tx.price)}</div>
                        </td>
                        <td className="p-6">
                          <div className="flex justify-center">
                            <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase border ${getStatusStyle(tx.status)}`}>
                              {tx.status}
                            </div>
                          </div>
                        </td>
                        <td className="p-6 text-right">
                          <Button variant="ghost" size="icon" className="rounded-xl hover:bg-white/10">
                            <ChevronRight className="h-5 w-5 text-slate-500" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Transaction Summary Stats */}
          {!loading && filteredTransactions.length > 0 && (
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="glass-dark border-white/5 rounded-[2.5rem] p-8 flex items-center justify-between group">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Pengeluaran</p>
                  <h4 className="text-2xl font-bold tracking-tight">
                    {formatCurrency(filteredTransactions.reduce((acc, tx) => acc + (tx.status === 'success' ? Number(tx.price) : 0), 0))}
                  </h4>
                </div>
                <div className="h-14 w-14 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20 group-hover:scale-110 transition-transform duration-500">
                  <TrendingDown className="h-7 w-7" />
                </div>
              </Card>
              <Card className="glass-dark border-white/5 rounded-[2.5rem] p-8 flex items-center justify-between group">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Transaksi Berhasil</p>
                  <h4 className="text-2xl font-bold tracking-tight">
                    {filteredTransactions.filter(tx => tx.status === 'success').length} <span className="text-sm font-medium text-slate-500">dari {filteredTransactions.length}</span>
                  </h4>
                </div>
                <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20 group-hover:scale-110 transition-transform duration-500">
                  <TrendingUp className="h-7 w-7" />
                </div>
              </Card>
            </div>
          )}
    </div>
  );
}
