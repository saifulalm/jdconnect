"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Zap,
  Smartphone,
  Wifi,
  Gamepad2,
  Wallet,
  Hash,
  X,
  type LucideIcon,
} from "lucide-react"
import {
  getProducts,
  getPaymentConfig,
  getCategories,
  getOperatorPrefixes,
  createGuestOrder,
  mockPay,
  formatIDR,
  detectOperator,
  normalizeMsisdn,
  type Product,
  type PaymentConfig,
  type Category,
  type OperatorPrefix,
} from "@/lib/api"
import { cn } from "@/lib/utils"
import {
  getRecentNumbers,
  rememberNumber,
  forgetNumber,
  type RecentNumber,
} from "@/lib/recent-numbers"

// Icon names come from the backend category config.
const ICONS: Record<string, LucideIcon> = {
  Smartphone,
  Wifi,
  Zap,
  Gamepad2,
  Wallet,
  Hash,
}

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
  const [categories, setCategories] = useState<Category[]>([])
  const [prefixes, setPrefixes] = useState<OperatorPrefix[]>([])
  const [categoryKey, setCategoryKey] = useState<string>("")
  const [customerNo, setCustomerNo] = useState("")
  const [serverId, setServerId] = useState("")
  const [email, setEmail] = useState("")
  const [products, setProducts] = useState<Product[]>([])
  const [selected, setSelected] = useState<Product | null>(null)
  const [config, setConfig] = useState<PaymentConfig | null>(null)
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recent, setRecent] = useState<RecentNumber[]>([])

  // Storefront config is backend-driven (categories, field rules, prefixes).
  useEffect(() => {
    getPaymentConfig().then(setConfig).catch(() => undefined)
    getOperatorPrefixes().then(setPrefixes).catch(() => setPrefixes([]))
    getCategories()
      .then((c) => {
        setCategories(c)
        if (c.length) setCategoryKey((k) => k || c[0].key)
      })
      .catch(() => setCategories([]))
  }, [])

  const category = useMemo(
    () => categories.find((c) => c.key === categoryKey) ?? null,
    [categories, categoryKey],
  )

  useEffect(() => {
    if (!categoryKey) return
    let active = true
    setLoadingProducts(true)
    setSelected(null)
    getProducts(categoryKey)
      .then((p) => {
        if (active) setProducts(p.filter((x) => x.isActive).sort((a, b) => a.price - b.price))
      })
      .catch(() => active && setProducts([]))
      .finally(() => active && setLoadingProducts(false))
    return () => {
      active = false
    }
  }, [categoryKey])

  // Reset the destination fields when switching to a differently-shaped input.
  useEffect(() => {
    setServerId("")
    setRecent(getRecentNumbers(categoryKey))
  }, [categoryKey])

  const operator = useMemo(
    () => (category?.detectOperator ? detectOperator(customerNo, prefixes) : null),
    [customerNo, prefixes, category],
  )

  const digits = customerNo.replace(/\D/g, "")
  const minLen = category?.minLength ?? 4
  const maxLen = category?.maxLength ?? 16
  const numberValid = digits.length >= minLen && digits.length <= maxLen
  const serverValid = !category?.requiresServerId || /^[0-9]{1,12}$/.test(serverId)
  const canSubmit = Boolean(selected) && numberValid && serverValid && !submitting

  // When the operator is known, narrow to its products.
  const shown = useMemo(() => {
    if (operator) {
      const f = products.filter((p) => p.provider.toLowerCase().includes(operator.toLowerCase()))
      return f.length ? f : products
    }
    return products
  }, [products, operator])

  // Group by provider so long lists stay scannable.
  const groups = useMemo(() => {
    const map = new Map<string, Product[]>()
    for (const p of shown) {
      const list = map.get(p.provider)
      if (list) list.push(p)
      else map.set(p.provider, [p])
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [shown])

  async function handleBuy() {
    setError(null)
    if (!numberValid) {
      return setError(`${category?.inputLabel ?? "Nomor tujuan"} harus ${minLen}-${maxLen} digit`)
    }
    if (!serverValid) return setError(`${category?.serverIdLabel ?? "Server ID"} tidak valid`)
    if (!selected) return setError("Pilih nominal terlebih dahulu")

    setSubmitting(true)
    try {
      // Phone-shaped inputs are normalised to local format; ids are kept as-is.
      const cleaned = category?.detectOperator ? normalizeMsisdn(customerNo) : digits
      rememberNumber({
        number: cleaned,
        category: categoryKey,
        label: operator || selected?.provider,
      })
      const order = await createGuestOrder({
        productId: selected.id,
        phoneNumber: cleaned,
        serverId: category?.requiresServerId ? serverId : undefined,
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
      } else if (order.payment.gateway === "qris") {
        // Open-source QRIS: the track page renders the QR + payment status.
        router.push(trackUrl)
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

  const CategoryIcon = category ? ICONS[category.icon] ?? Zap : Zap

  return (
    <div className="rounded-3xl border border-border bg-card shadow-glow p-6 sm:p-7 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Isi Ulang Cepat</h3>
          <p className="text-sm text-muted-foreground">
            {category?.description || "Tanpa daftar — bayar & terima instan"}
          </p>
        </div>
        <span className="grid place-items-center size-10 rounded-xl bg-primary/10 text-primary shrink-0">
          <CategoryIcon className="h-5 w-5" />
        </span>
      </div>

      {/* Category tabs (backend-managed) */}
      <div className="flex gap-1.5 rounded-2xl bg-muted p-1.5 overflow-x-auto">
        {categories.length === 0 ? (
          <div className="h-9 flex-1 grid place-items-center text-xs text-muted-foreground">
            Memuat kategori...
          </div>
        ) : (
          categories.map((c) => {
            const Icon = ICONS[c.icon] ?? Zap
            return (
              <button
                key={c.key}
                onClick={() => setCategoryKey(c.key)}
                className={cn(
                  "flex-1 min-w-fit h-9 px-3 rounded-xl text-xs font-medium transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap",
                  categoryKey === c.key
                    ? "bg-card text-foreground shadow-soft"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {c.label}
              </button>
            )
          })
        )}
      </div>

      {/* Destination number — label/placeholder/rules come from the category */}
      <div className="space-y-2">
        <label className="text-sm font-medium">{category?.inputLabel ?? "Nomor Tujuan"}</label>
        <div className="relative">
          <CategoryIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            inputMode="numeric"
            value={customerNo}
            onChange={(e) => setCustomerNo(e.target.value)}
            placeholder={category?.inputPlaceholder ?? "0812 3456 7890"}
            className="w-full h-12 pl-10 pr-24 rounded-2xl border border-input bg-background text-base outline-none focus:ring-2 focus:ring-ring/50"
          />
          {operator && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
              {operator}
            </span>
          )}
        </div>
        {category?.inputHelp && (
          <p className="text-xs text-muted-foreground">{category.inputHelp}</p>
        )}

        {/* One-tap re-fill from this device's history */}
        {recent.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {recent.map((r) => (
              <span
                key={r.number}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-background pl-2.5 pr-1 h-8 text-xs"
              >
                <button
                  onClick={() => setCustomerNo(r.number)}
                  className="font-mono hover:text-primary transition-colors"
                  title={r.label ? `${r.label} · dipakai sebelumnya` : "Dipakai sebelumnya"}
                >
                  {r.number}
                </button>
                <button
                  onClick={() => {
                    forgetNumber(r.number, categoryKey)
                    setRecent(getRecentNumbers(categoryKey))
                  }}
                  className="grid place-items-center size-5 rounded text-muted-foreground hover:text-destructive"
                  aria-label={`Hapus ${r.number}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Server / zone id (game categories) */}
      {category?.requiresServerId && (
        <div className="space-y-2">
          <label className="text-sm font-medium">{category.serverIdLabel || "Server ID"}</label>
          <div className="relative">
            <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              inputMode="numeric"
              value={serverId}
              onChange={(e) => setServerId(e.target.value)}
              placeholder="1234"
              className="w-full h-12 pl-10 pr-3.5 rounded-2xl border border-input bg-background text-base outline-none focus:ring-2 focus:ring-ring/50"
            />
          </div>
        </div>
      )}

      {/* Denominations grouped by provider */}
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
          <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
            {groups.map(([provider, items]) => (
              <div key={provider} className="space-y-2">
                <div className="flex items-center gap-2 sticky top-0 bg-card py-0.5">
                  <span className="text-xs font-semibold tracking-wide text-foreground">{provider}</span>
                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                    {items.length}
                  </span>
                  <span className="flex-1 h-px bg-border" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {items.map((p) => {
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
              </div>
            ))}
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
        disabled={!canSubmit}
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
        Pembayaran aman via{" "}
        {config?.gateway === "midtrans" ? "Midtrans" : config?.gateway === "qris" ? "QRIS" : "gateway"}{" "}
        · QRIS, VA, e-wallet
      </p>
    </div>
  )
}
