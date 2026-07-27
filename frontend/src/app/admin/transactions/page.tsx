"use client";

import { isAdminRole } from "@/lib/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandMark } from "@/components/brand-mark";
import { apiUrl, formatIDR } from "@/lib/api";
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  BadgeCheck,
  RotateCw,
} from "lucide-react";

type AdminTransaction = {
  id: string;
  invoice: string;
  invoiceNumber: string;
  user: string;
  product?: string;
  phoneNumber?: string;
  amount: number | string;
  status: string;
  paymentStatus?: string;
  paymentMethod?: string;
  serialNumber?: string;
  message?: string;
  createdAt?: string;
};

const STATUS_UI: Record<string, { tone: string; icon: typeof Clock; label: string }> = {
  success: { tone: "bg-success/10 text-success", icon: CheckCircle2, label: "Berhasil" },
  processing: { tone: "bg-info/10 text-info", icon: Loader2, label: "Diproses" },
  pending: { tone: "bg-warning/10 text-warning", icon: Clock, label: "Menunggu" },
  failed: { tone: "bg-destructive/10 text-destructive", icon: XCircle, label: "Gagal" },
  cancelled: { tone: "bg-muted text-muted-foreground", icon: XCircle, label: "Batal" },
};

export default function AdminTransactionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const authHeaders = useCallback((): HeadersInit => {
    const token = localStorage.getItem("token");
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/admin/transactions?limit=200"), {
        headers: authHeaders(),
      });
      if (res.status === 401 || res.status === 403) {
        router.push("/login");
        return;
      }
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTransactions(Array.isArray(data) ? data : data.transactions || []);
    } catch {
      setError("Gagal memuat transaksi.");
    } finally {
      setLoading(false);
    }
  }, [authHeaders, router]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    if (!token || !user) {
      router.push("/login");
      return;
    }
    try {
      if (!isAdminRole(JSON.parse(user).role)) {
        router.push("/dashboard");
        return;
      }
    } catch {
      router.push("/login");
      return;
    }
    load();
  }, [router, load]);

  /** Manual settlement for QRIS / offline payments. */
  async function confirmPayment(t: AdminTransaction) {
    setBusyId(t.id);
    setNotice(null);
    try {
      const res = await fetch(apiUrl(`/payment/confirm/${t.invoiceNumber || t.invoice}`), {
        method: "POST",
        headers: authHeaders(),
      });
      if (res.ok) {
        setNotice({ ok: true, text: `Pembayaran ${t.invoiceNumber} dikonfirmasi.` });
        await load();
      } else {
        setNotice({ ok: false, text: "Gagal mengonfirmasi pembayaran." });
      }
    } finally {
      setBusyId(null);
    }
  }

  /** Re-dispatch a paid order to the supplier. */
  async function retryTopup(t: AdminTransaction) {
    setBusyId(t.id);
    setNotice(null);
    try {
      const res = await fetch(apiUrl(`/admin/transactions/${t.id}/retry`), {
        method: "POST",
        headers: authHeaders(),
      });
      if (res.ok) {
        setNotice({ ok: true, text: `Top-up ${t.invoiceNumber} dikirim ulang.` });
        await load();
      } else {
        setNotice({ ok: false, text: "Retry gagal — cek status pembayaran." });
      }
    } finally {
      setBusyId(null);
    }
  }

  async function setStatus(t: AdminTransaction, status: string) {
    setBusyId(t.id);
    setNotice(null);
    try {
      const res = await fetch(apiUrl(`/admin/transactions/${t.id}/status`), {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setNotice({ ok: true, text: `Status ${t.invoiceNumber} diubah ke ${status}.` });
        await load();
      } else {
        setNotice({ ok: false, text: "Gagal mengubah status." });
      }
    } finally {
      setBusyId(null);
    }
  }

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return transactions.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (!q) return true;
      return (
        (t.invoiceNumber || t.invoice || "").toLowerCase().includes(q) ||
        (t.user || "").toLowerCase().includes(q) ||
        (t.product || "").toLowerCase().includes(q) ||
        (t.phoneNumber || "").includes(q)
      );
    });
  }, [transactions, query, statusFilter]);

  return (
    <div className="min-h-screen mesh-gradient">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <BrandMark href="/admin" />
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Dashboard Admin
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Kelola Transaksi</h1>
            <p className="text-sm text-muted-foreground">
              {transactions.length} transaksi · konfirmasi bayar, retry top-up, ubah status
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Muat Ulang
          </Button>
        </div>

        {notice && (
          <div
            className={`flex items-center gap-2 text-sm rounded-xl px-3 py-2.5 ${
              notice.ok ? "text-success bg-success/10" : "text-destructive bg-destructive/10"
            }`}
          >
            {notice.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {notice.text}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Cari invoice, pelanggan, produk, nomor..."
              className="!pl-10 h-11 rounded-xl"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-1 bg-muted p-1 rounded-xl overflow-x-auto">
            {["all", "pending", "processing", "success", "failed"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`h-9 px-3.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  statusFilter === s
                    ? "bg-card text-foreground shadow-soft"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s === "all" ? "Semua" : STATUS_UI[s]?.label || s}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-20 grid place-items-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : error ? (
          <div className="py-16 text-center space-y-3">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={load}>
              Coba Lagi
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center rounded-2xl border border-border bg-card">
            <p className="text-sm text-muted-foreground">Tidak ada transaksi cocok.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider border-b border-border">
                    <th className="px-4 py-3.5 font-medium">Invoice</th>
                    <th className="px-4 py-3.5 font-medium">Produk / Tujuan</th>
                    <th className="px-4 py-3.5 font-medium text-right">Total</th>
                    <th className="px-4 py-3.5 font-medium">Bayar</th>
                    <th className="px-4 py-3.5 font-medium">Status</th>
                    <th className="px-4 py-3.5 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((t) => {
                    const ui = STATUS_UI[t.status] || STATUS_UI.pending;
                    const paid = t.paymentStatus === "paid";
                    const busy = busyId === t.id;
                    return (
                      <tr key={t.id} className="hover:bg-muted/50 transition-colors align-top">
                        <td className="px-4 py-3.5">
                          <p className="font-mono text-xs">{t.invoiceNumber || t.invoice}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{t.user}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-medium">{t.product || "-"}</p>
                          <p className="text-xs text-muted-foreground font-mono">{t.phoneNumber}</p>
                          {t.serialNumber && (
                            <p className="text-xs text-success font-mono mt-0.5">
                              SN: {t.serialNumber}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right font-medium whitespace-nowrap">
                          {formatIDR(Number(t.amount))}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
                              paid ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                            }`}
                          >
                            {t.paymentStatus || "-"}
                          </span>
                          {t.paymentMethod && (
                            <p className="text-[10px] text-muted-foreground mt-1 uppercase">
                              {t.paymentMethod}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${ui.tone}`}
                          >
                            <ui.icon
                              className={`h-3.5 w-3.5 ${t.status === "processing" ? "animate-spin" : ""}`}
                            />
                            {ui.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-wrap justify-end gap-1.5">
                            {!paid && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                onClick={() => confirmPayment(t)}
                                title="Tandai sudah dibayar (QRIS / transfer manual)"
                              >
                                <BadgeCheck className="h-3.5 w-3.5" /> Konfirmasi
                              </Button>
                            )}
                            {paid && t.status !== "success" && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                onClick={() => retryTopup(t)}
                                title="Kirim ulang ke supplier"
                              >
                                <RotateCw className="h-3.5 w-3.5" /> Retry
                              </Button>
                            )}
                            {t.status !== "success" && t.status !== "failed" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={busy}
                                onClick={() => setStatus(t, "failed")}
                                title="Tandai gagal"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {busy && <Loader2 className="h-4 w-4 animate-spin self-center" />}
                          </div>
                          {t.message && (
                            <p className="text-[10px] text-muted-foreground text-right mt-1 max-w-[200px] ml-auto">
                              {t.message}
                            </p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
