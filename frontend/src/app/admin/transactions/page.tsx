"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiUrl } from "@/lib/api";
import { ArrowLeft, CreditCard, Loader2 } from "lucide-react";

type AdminTransaction = {
  id: string | number;
  invoice: string;
  user: string;
  amount: number | string;
  status: string;
};

export default function AdminTransactionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);

  const formatCurrency = (value: number | string) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(Number(value));
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    if (!token || !user) {
      router.push("/login");
      return;
    }
    const userData = JSON.parse(user);
    if (userData.role !== "admin") {
      router.push("/dashboard");
      return;
    }

    const fetchTransactions = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(apiUrl("/admin/transactions"), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setTransactions(Array.isArray(data) ? data : data.transactions || []);
      } catch {
        setError("Gagal memuat data transaksi.");
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [router]);

  const badgeClass = (status: string) => {
    const s = status.toLowerCase();
    if (s === "success") return "bg-success/10 text-success border-success/20";
    if (s === "pending" || s === "processing") return "bg-warning/10 text-warning border-warning/20";
    if (s === "failed") return "bg-destructive/10 text-destructive border-destructive/20";
    return "bg-muted/30 text-muted-foreground border-border/60";
  };

  return (
    <div className="min-h-screen mesh-gradient font-sans selection:bg-primary/20 selection:text-foreground pb-12">
      <header className="sticky top-0 z-40 glass border-b border-border/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild className="-ml-2">
              <Link href="/admin">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-2xl bg-primary/10 border border-primary/20 grid place-items-center">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold leading-tight">Transaksi</h1>
                <p className="text-xs text-muted-foreground">Ringkasan transaksi (admin)</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground font-medium">Memuat data transaksi...</p>
          </div>
        ) : error ? (
          <Card className="glass border-border/60 rounded-2xl">
            <CardContent className="p-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : (
          <Card className="glass border-border/60 rounded-2xl overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Daftar Transaksi</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b border-border/60">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Invoice</th>
                      <th className="px-6 py-4 font-semibold">User</th>
                      <th className="px-6 py-4 font-semibold">Jumlah</th>
                      <th className="px-6 py-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-10 text-center text-muted-foreground">
                          Tidak ada data transaksi.
                        </td>
                      </tr>
                    ) : (
                      transactions.map((t) => (
                        <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-4 font-medium">{t.invoice}</td>
                          <td className="px-6 py-4 text-muted-foreground">{t.user}</td>
                          <td className="px-6 py-4 text-muted-foreground">{formatCurrency(t.amount)}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide uppercase border ${badgeClass(t.status)}`}>
                              {t.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

