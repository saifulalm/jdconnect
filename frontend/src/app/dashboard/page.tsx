"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  apiUrl,
  getProducts,
  getCategories,
  formatIDR,
  type Product,
  type Category,
} from "@/lib/api"
import {
  Smartphone,
  Wifi,
  Zap,
  Gamepad2,
  Wallet,
  Clock,
  ChevronRight,
  Key,
  Plus,
  TrendingUp,
  ShieldCheck,
  Loader2,
} from "lucide-react"

interface User {
  id: string
  name: string
  email: string
  role: string
  balance: number
}

interface Trx {
  id: string
  invoiceNumber: string
  status: string
  price: number
  createdAt: string
  product?: { name?: string }
  provider?: string
}

// Icon names are supplied by the backend category config.
const ICONS: Record<string, typeof Wallet> = {
  Smartphone,
  Wifi,
  Zap,
  Gamepad2,
  Wallet,
}

const STATUS_TONE: Record<string, string> = {
  success: "bg-success/10 text-success",
  processing: "bg-info/10 text-info",
  pending: "bg-warning/10 text-warning",
  failed: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [transactions, setTransactions] = useState<Trx[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [category, setCategory] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [productsLoading, setProductsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }

    const auth = { Authorization: `Bearer ${token}` }

    fetch(apiUrl("/users/profile"), { headers: auth })
      .then((r) => r.json())
      .then((data) => {
        const u = data?.data ?? data
        if (u?.id) {
          setUser(u)
          localStorage.setItem("user", JSON.stringify(u))
        } else {
          router.push("/login")
        }
      })
      .catch(() => router.push("/login"))
      .finally(() => setIsLoading(false))

    fetch(apiUrl("/transactions"), { headers: auth })
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => setTransactions(Array.isArray(list) ? list : []))
      .catch(() => setTransactions([]))
  }, [router])

  useEffect(() => {
    getCategories()
      .then((c) => {
        setCategories(c)
        if (c.length) setCategory((k) => k || c[0].key)
      })
      .catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    if (!category) return
    setProductsLoading(true)
    getProducts(category)
      .then((p) => setProducts(p.filter((x) => x.isActive)))
      .catch(() => setProducts([]))
      .finally(() => setProductsLoading(false))
  }, [category])

  const stats = useMemo(() => {
    const now = new Date()
    const thisMonth = transactions.filter((t) => {
      const d = new Date(t.createdAt)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    const spent = transactions
      .filter((t) => t.status === "success")
      .reduce((sum, t) => sum + Number(t.price || 0), 0)
    return { total: transactions.length, month: thisMonth.length, spent }
  }, [transactions])

  const recent = transactions.slice(0, 5)

  if (isLoading || !user) {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6 sm:p-8 space-y-8">
      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard
          icon={Wallet}
          label="Saldo Akun"
          value={formatIDR(Number(user.balance) || 0)}
          foot={
            <Button size="sm" variant="outline" className="mt-1" asChild>
              <Link href="/dashboard/settings"><Plus className="h-4 w-4" /> Top Up</Link>
            </Button>
          }
        />
        <StatCard
          icon={TrendingUp}
          label="Total Transaksi"
          value={String(stats.total)}
          foot={<p className="text-xs text-muted-foreground">Bulan ini: {stats.month} · Total belanja: {formatIDR(stats.spent)}</p>}
        />
        <StatCard
          icon={ShieldCheck}
          label="Status Akun"
          value="Aktif"
          foot={
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success bg-success/10 px-2.5 py-1 rounded-full">
              <span className="size-1.5 rounded-full bg-success animate-pulse" /> Terverifikasi
            </span>
          }
        />
      </div>

      {/* Products */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight">Layanan Digital</h2>
          <div className="flex gap-1 bg-muted p-1 rounded-2xl overflow-x-auto">
            {categories.map((c) => {
              const Icon = ICONS[c.icon] ?? Zap
              return (
                <button
                  key={c.key}
                  onClick={() => setCategory(c.key)}
                  className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                    category === c.key
                      ? "bg-card text-foreground shadow-soft"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" /> {c.label}
                </button>
              )
            })}
          </div>
        </div>

        {productsLoading ? (
          <div className="py-16 grid place-items-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Tidak ada produk untuk kategori ini.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((p) => (
              <div
                key={p.id}
                className="card-hover rounded-2xl border border-border bg-card p-5 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold tracking-widest uppercase text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                    {p.provider}
                  </span>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold">{p.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Proses instan</p>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <p className="font-semibold text-primary">{formatIDR(Number(p.price))}</p>
                  <Button size="icon-sm" className="rounded-xl" onClick={() => router.push("/transaction")}
                    aria-label={`Beli ${p.name}`}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Bottom */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Transaksi Terakhir</h3>
            <Link href="/transactions" className="text-sm text-primary inline-flex items-center hover:underline">
              Lihat Semua <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <span className="grid place-items-center size-14 rounded-2xl bg-muted text-muted-foreground mx-auto">
                <Clock className="h-6 w-6" />
              </span>
              <div>
                <p className="font-medium text-sm">Belum ada transaksi</p>
                <p className="text-xs text-muted-foreground">Mulai transaksi pertama kamu.</p>
              </div>
              <Button size="sm" asChild>
                <Link href="/transaction">Beli Sekarang</Link>
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((t) => (
                <li key={t.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{t.product?.name || t.provider}</p>
                    <p className="text-xs text-muted-foreground font-mono">{t.invoiceNumber}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium">{formatIDR(Number(t.price))}</p>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_TONE[t.status] || STATUS_TONE.pending}`}>
                      {t.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">API H2H</h3>
            <Link href="/dashboard/api" className="text-sm text-primary inline-flex items-center hover:underline">
              Kelola API <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="rounded-xl border border-border bg-background p-4 flex items-start gap-3">
            <span className="grid place-items-center size-10 rounded-xl bg-primary/10 text-primary shrink-0">
              <Key className="h-5 w-5" />
            </span>
            <div className="space-y-1">
              <p className="text-sm font-medium">Integrasi untuk reseller</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Buat API key, atur IP whitelist, dan akses endpoint H2H untuk
                integrasi bisnis kamu.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  foot,
}: {
  icon: typeof Wallet
  label: string
  value: string
  foot?: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
        <span className="grid place-items-center size-10 rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      {foot}
    </div>
  )
}
