"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Phone, Loader2, CheckCircle2, AlertCircle, Zap } from "lucide-react"
import {
  getProducts,
  getPaymentConfig,
  createGuestOrder,
  mockPay,
  formatIDR,
  detectOperator,
  type Product,
  type PaymentConfig,
} from "@/lib/api"
import { cn } from "@/lib/utils"

const CATEGORIES = [
  { key: "pulsa", label: "Pulsa" },
  { key: "data", label: "Paket Data" },
  { key: "pln", label: "Token PLN" },
  { key: "game", label: "Game" },
] as const

declare global {
  interface Window {
    snap?: { pay: (token: string, opts: Record<string, (r: unknown) => void>) => void }
  }
}

function loadSnap(clientKey: string, isProduction: boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject()
    if (window.snap) return resolve()
    const s = document.createElement("script")
    s.src = isProduction
      ? "https://app.midtrans.com/snap/snap.js"
      : "https://app.sandbox.midtrans.com/snap/snap.js"
    s.setAttribute("data-client-key", clientKey)
    s.onload = () => resolve()
    s.onerror = () => reject(new Error("Gagal memuat Midtrans"))
    document.body.appendChild(s)
  })
}

export function QuickRecharge() {
  const router = useRouter()
  const [category, setCategory] = useState<string>("pulsa")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [products, setProducts] = useState<Product[]>([])
  const [selected, setSelected] = useState<Product | null>(null)
  const [config, setConfig] = useState<PaymentConfig | null>(null)
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getPaymentConfig().then(setConfig).catch(() => undefined)
  }, [])

  useEffect(() => {
    let active = true
    setLoadingProducts(true)
    setSelected(null)
    getProducts(category)
      .then((p) => {
        if (active) setProducts(p.filter((x) => x.isActive).sort((a, b) => a.price - b.price))
      })
      .catch(() => active && setProducts([]))
      .finally(() => active && setLoadingProducts(false))
    return () => {
      active = false
    }
  }, [category])

  const operator = useMemo(() => detectOperator(phone), [phone])
  const phoneValid = /^[0-9]{4,16}$/.test(phone.replace(/\D/g, ""))

  // For pulsa/data, narrow to the detected operator when known.
  const shown = useMemo(() => {
    if ((category === "pulsa" || category === "data") && operator) {
      const f = products.filter((p) => p.provider.toLowerCase().includes(operator.toLowerCase()))
      return f.length ? f : products
    }
    return products
  }, [products, operator, category])

  async function handleBuy() {
    setError(null)
    if (!phoneValid) return setError("Masukkan nomor tujuan yang valid")
    if (!selected) return setError("Pilih nominal terlebih dahulu")

    setSubmitting(true)
    try {
      const cleaned = phone.replace(/\D/g, "")
      const order = await createGuestOrder({
        productId: selected.id,
        phoneNumber: cleaned,
        customerEmail: email || undefined,
      })
      const last4 = cleaned.slice(-4)
      const trackUrl = `/track/${order.invoiceNumber}?phone=${last4}`

      if (order.payment.gateway === "midtrans" && order.payment.token && config) {
        await loadSnap(config.clientKey, config.isProduction)
        window.snap?.pay(order.payment.token, {
          onSuccess: () => router.push(trackUrl),
          onPending: () => router.push(trackUrl),
          onError: () => router.push(trackUrl),
          onClose: () => router.push(trackUrl),
        })
      } else {
        // Mock gateway: settle immediately for a complete local demo.
        await mockPay(order.invoiceNumber)
        router.push(trackUrl)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-3xl border border-border bg-card shadow-glow p-6 sm:p-7 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Isi Ulang Cepat</h3>
          <p className="text-sm text-muted-foreground">Tanpa daftar — bayar & terima instan</p>
        </div>
        <span className="grid place-items-center size-10 rounded-xl bg-primary/10 text-primary">
          <Zap className="h-5 w-5" />
        </span>
      </div>

      {/* Category tabs */}
      <div className="grid grid-cols-4 gap-1.5 rounded-2xl bg-muted p-1.5">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setCategory(c.key)}
            className={cn(
              "h-9 rounded-xl text-xs font-medium transition-colors",
              category === c.key
                ? "bg-card text-foreground shadow-soft"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Destination number */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          {category === "pln" ? "ID Pelanggan / Meter" : "Nomor Tujuan"}
        </label>
        <div className="relative">
          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            inputMode="numeric"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={category === "pln" ? "1234567890" : "0812 3456 7890"}
            className="w-full h-12 pl-10 pr-24 rounded-2xl border border-input bg-background text-base outline-none focus:ring-2 focus:ring-ring/50"
          />
          {operator && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
              {operator}
            </span>
          )}
        </div>
      </div>

      {/* Denominations */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Pilih Nominal</label>
        {loadingProducts ? (
          <div className="h-28 grid place-items-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : shown.length === 0 ? (
          <div className="h-28 grid place-items-center text-sm text-muted-foreground text-center px-4">
            Belum ada produk untuk kategori ini. Admin dapat sinkron dari supplier.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
            {shown.map((p) => {
              const active = selected?.id === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-2xl border p-3 text-left transition-all",
                    active
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-primary/40 hover:bg-muted",
                  )}
                >
                  <span className="text-sm font-semibold leading-tight">{p.name}</span>
                  <span className="text-xs text-muted-foreground">{formatIDR(p.price)}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Optional email for receipt */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Email <span className="text-muted-foreground font-normal">(opsional, untuk struk)</span>
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="kamu@email.com"
          className="w-full h-12 px-3.5 rounded-2xl border border-input bg-background text-base outline-none focus:ring-2 focus:ring-ring/50"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2.5">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <button
        onClick={handleBuy}
        disabled={submitting || !phoneValid || !selected}
        className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-semibold text-base shadow-glow disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.99] flex items-center justify-center gap-2"
      >
        {submitting ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            {selected ? `Bayar ${formatIDR(selected.price)}` : "Beli Sekarang"}
            <CheckCircle2 className="h-5 w-5" />
          </>
        )}
      </button>

      <p className="text-center text-xs text-muted-foreground">
        Pembayaran aman via {config?.gateway === "midtrans" ? "Midtrans" : "gateway"} · QRIS, VA, e-wallet
      </p>
    </div>
  )
}
