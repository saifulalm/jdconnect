"use client"

export const dynamic = "force-dynamic"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Button } from "@/components/ui/button"
import { Wallet, TrendingUp, CheckCircle2, RefreshCw, Loader2, BarChart3 } from "lucide-react"
import { apiUrl, formatIDR } from "@/lib/api"

interface Trx {
  id: string
  type: string
  price: number
  status: string
  createdAt: string
}

// Tokens are hex — read resolved values from CSS at mount (theme-aware).
function useChartColors() {
  const [colors, setColors] = useState({
    primary: "#4f46e5",
    accent: "#8b5cf6",
    border: "#e6e6ea",
    muted: "#6b7280",
    card: "#ffffff",
  })
  useEffect(() => {
    const read = () => {
      const s = getComputedStyle(document.documentElement)
      const v = (name: string, fallback: string) => s.getPropertyValue(name).trim() || fallback
      setColors({
        primary: v("--primary", "#4f46e5"),
        accent: v("--accent", "#8b5cf6"),
        border: v("--border", "#e6e6ea"),
        muted: v("--muted-foreground", "#6b7280"),
        card: v("--card", "#ffffff"),
      })
    }
    read()
    // Re-read when the theme class flips.
    const obs = new MutationObserver(read)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => obs.disconnect()
  }, [])
  return colors
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]

export default function AnalyticsPage() {
  const router = useRouter()
  const colors = useChartColors()
  const [transactions, setTransactions] = useState<Trx[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }
    setLoading(true)
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
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Derive real per-user analytics from the transaction list.
  const { monthly, byCategory, totals } = useMemo(() => {
    const now = new Date()
    const months: { name: string; belanja: number; trx: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({ name: MONTH_LABELS[d.getMonth()], belanja: 0, trx: 0 })
    }
    const monthIndex = (dt: Date) => {
      const diff =
        (now.getFullYear() - dt.getFullYear()) * 12 + (now.getMonth() - dt.getMonth())
      return diff >= 0 && diff <= 5 ? 5 - diff : -1
    }

    const cat: Record<string, number> = {}
    let spent = 0
    let success = 0
    for (const t of transactions) {
      const d = new Date(t.createdAt)
      const idx = monthIndex(d)
      if (idx >= 0) {
        months[idx].trx += 1
        if (t.status === "success") months[idx].belanja += Number(t.price || 0)
      }
      if (t.status === "success") {
        spent += Number(t.price || 0)
        success += 1
        cat[t.type] = (cat[t.type] || 0) + Number(t.price || 0)
      }
    }
    const byCategory = Object.entries(cat)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
    return {
      monthly: months,
      byCategory,
      totals: {
        spent,
        count: transactions.length,
        successRate: transactions.length ? Math.round((success / transactions.length) * 100) : 0,
      },
    }
  }, [transactions])

  if (loading) {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6 sm:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">Ringkasan transaksi kamu, 6 bulan terakhir</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="h-4 w-4" /> Muat Ulang
        </Button>
      </div>

      {/* Stat tiles */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Tile icon={Wallet} label="Total Belanja" value={formatIDR(totals.spent)} />
        <Tile icon={TrendingUp} label="Jumlah Transaksi" value={String(totals.count)} />
        <Tile icon={CheckCircle2} label="Tingkat Sukses" value={`${totals.successRate}%`} />
      </div>

      {transactions.length === 0 ? (
        <div className="py-16 text-center space-y-4 rounded-2xl border border-border bg-card">
          <span className="grid place-items-center size-14 rounded-2xl bg-muted text-muted-foreground mx-auto">
            <BarChart3 className="h-6 w-6" />
          </span>
          <div>
            <p className="font-medium text-sm">Belum ada data</p>
            <p className="text-xs text-muted-foreground">Grafik muncul setelah transaksi pertama.</p>
          </div>
          <Button size="sm" asChild>
            <Link href="/transaction">Mulai Transaksi</Link>
          </Button>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Spend per month */}
          <ChartCard title="Belanja per Bulan">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={monthly} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                <XAxis dataKey="name" stroke={colors.muted} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis
                  stroke={colors.muted}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}rb` : String(v))}
                />
                <Tooltip
                  formatter={(v) => formatIDR(Number(v))}
                  contentStyle={{
                    background: colors.card,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="belanja"
                  stroke={colors.primary}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: colors.primary }}
                  name="Belanja"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Spend per category */}
          <ChartCard title="Belanja per Kategori">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byCategory} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} />
                <XAxis dataKey="name" stroke={colors.muted} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis
                  stroke={colors.muted}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}rb` : String(v))}
                />
                <Tooltip
                  formatter={(v) => formatIDR(Number(v))}
                  contentStyle={{
                    background: colors.card,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="value" fill={colors.accent} radius={[8, 8, 0, 0]} name="Belanja" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}
    </div>
  )
}

function Tile({ icon: Icon, label, value }: { icon: typeof Wallet; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 flex items-center justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold tracking-tight mt-1">{value}</p>
      </div>
      <span className="grid place-items-center size-11 rounded-xl bg-primary/10 text-primary shrink-0">
        <Icon className="h-5 w-5" />
      </span>
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <h3 className="font-semibold text-sm">{title}</h3>
      {children}
    </div>
  )
}
