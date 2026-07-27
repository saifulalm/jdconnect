"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Search,
  Receipt,
  RefreshCw,
} from "lucide-react"
import { apiUrl, formatIDR } from "@/lib/api"

interface Transaction {
  id: string
  invoiceNumber: string
  type: string
  provider: string
  phoneNumber: string
  price: number
  status: string
  createdAt: string
  serialNumber?: string
  product?: { name?: string }
}

const STATUS_UI: Record<string, { tone: string; icon: typeof Clock; label: string }> = {
  success: { tone: "bg-success/10 text-success", icon: CheckCircle2, label: "Berhasil" },
  processing: { tone: "bg-info/10 text-info", icon: Loader2, label: "Diproses" },
  pending: { tone: "bg-warning/10 text-warning", icon: Clock, label: "Menunggu" },
  failed: { tone: "bg-destructive/10 text-destructive", icon: XCircle, label: "Gagal" },
  cancelled: { tone: "bg-muted text-muted-foreground", icon: XCircle, label: "Batal" },
}

export default function TransactionsPage() {
  const router = useRouter()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  async function fetchTransactions() {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(apiUrl("/transactions"), {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) {
        router.push("/login")
        return
      }
      const data = await res.json()
      setTransactions(Array.isArray(data) ? data : [])
    } catch {
      setError("Gagal memuat riwayat. Coba lagi.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return transactions.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false
      if (!q) return true
      return (
        t.invoiceNumber.toLowerCase().includes(q) ||
        t.provider?.toLowerCase().includes(q) ||
        t.phoneNumber?.includes(q) ||
        t.product?.name?.toLowerCase().includes(q)
      )
    })
  }, [transactions, query, statusFilter])

  return (
    <div className="p-6 sm:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Riwayat Transaksi</h1>
          <p className="text-sm text-muted-foreground">{transactions.length} transaksi tercatat</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchTransactions} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Muat Ulang
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Cari invoice, nomor, produk..."
            className="!pl-10 h-11 rounded-xl"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-1 bg-muted p-1 rounded-xl overflow-x-auto">
          {["all", "success", "processing", "pending", "failed"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`h-9 px-3.5 rounded-lg text-xs font-medium capitalize whitespace-nowrap transition-colors ${
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

      {/* List */}
      {loading ? (
        <div className="py-20 grid place-items-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : error ? (
        <div className="py-16 text-center space-y-3">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchTransactions}>Coba Lagi</Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center space-y-4 rounded-2xl border border-border bg-card">
          <span className="grid place-items-center size-14 rounded-2xl bg-muted text-muted-foreground mx-auto">
            <Receipt className="h-6 w-6" />
          </span>
          <div>
            <p className="font-medium text-sm">
              {transactions.length === 0 ? "Belum ada transaksi" : "Tidak ada hasil"}
            </p>
            <p className="text-xs text-muted-foreground">
              {transactions.length === 0 ? "Mulai transaksi pertama kamu." : "Coba kata kunci lain."}
            </p>
          </div>
          {transactions.length === 0 && (
            <Button size="sm" asChild>
              <Link href="/transaction">Beli Sekarang</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider border-b border-border">
                  <th className="px-5 py-3.5 font-medium">Invoice</th>
                  <th className="px-5 py-3.5 font-medium">Produk</th>
                  <th className="px-5 py-3.5 font-medium">Tujuan</th>
                  <th className="px-5 py-3.5 font-medium text-right">Total</th>
                  <th className="px-5 py-3.5 font-medium">Status</th>
                  <th className="px-5 py-3.5 font-medium">Tanggal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((t) => {
                  const ui = STATUS_UI[t.status] || STATUS_UI.pending
                  return (
                    <tr key={t.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs">{t.invoiceNumber}</td>
                      <td className="px-5 py-3.5">
                        <p className="font-medium">{t.product?.name || t.provider}</p>
                        <p className="text-xs text-muted-foreground capitalize">{t.type}</p>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs">{t.phoneNumber}</td>
                      <td className="px-5 py-3.5 text-right font-medium">{formatIDR(Number(t.price))}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${ui.tone}`}>
                          <ui.icon className={`h-3.5 w-3.5 ${t.status === "processing" ? "animate-spin" : ""}`} />
                          {ui.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(t.createdAt).toLocaleString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
