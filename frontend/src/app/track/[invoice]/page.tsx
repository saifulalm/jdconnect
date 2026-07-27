"use client"

import { use, useEffect, useState, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  ArrowLeft,
  Receipt,
  Copy,
  Share2,
  RefreshCw,
} from "lucide-react"
import QRCode from "qrcode"
import { trackOrder, formatIDR, type OrderStatus } from "@/lib/api"
import { BrandMark } from "@/components/brand-mark"
import { ClaimAccount } from "@/components/claim-account"
import { getLastNumber } from "@/lib/recent-numbers"

const STATUS_UI: Record<string, { icon: typeof Clock; tone: string; label: string }> = {
  success: { icon: CheckCircle2, tone: "text-success", label: "Berhasil" },
  processing: { icon: Loader2, tone: "text-info", label: "Diproses" },
  pending: { icon: Clock, tone: "text-warning", label: "Menunggu Pembayaran" },
  failed: { icon: XCircle, tone: "text-destructive", label: "Gagal" },
  cancelled: { icon: XCircle, tone: "text-muted-foreground", label: "Dibatalkan" },
}

export default function TrackPage({ params }: { params: Promise<{ invoice: string }> }) {
  const { invoice } = use(params)
  const search = useSearchParams()
  const phone = search.get("phone") || ""
  const [order, setOrder] = useState<OrderStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [loggedIn, setLoggedIn] = useState(true) // assume yes until checked
  // The API masks the number, so prefill the claim form from this device's
  // checkout history instead.
  const [fullPhone, setFullPhone] = useState("")
  const [shared, setShared] = useState(false)

  useEffect(() => {
    setLoggedIn(Boolean(localStorage.getItem("token")))
    setFullPhone(getLastNumber())
  }, [])

  const refresh = useCallback(async () => {
    try {
      const o = await trackOrder(invoice, phone)
      setOrder(o)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Order tidak ditemukan")
    } finally {
      setLoading(false)
    }
  }, [invoice, phone])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Poll while not in a terminal state.
  useEffect(() => {
    if (!order) return
    if (["success", "failed", "cancelled"].includes(order.status)) return
    const t = setInterval(refresh, 4000)
    return () => clearInterval(t)
  }, [order, refresh])

  /** Share the receipt via the native sheet, falling back to the clipboard. */
  async function shareReceipt() {
    if (!order) return
    const text = [
      `Struk JDConnect`,
      `Invoice: ${order.invoiceNumber}`,
      `Produk: ${order.product ?? order.provider}`,
      `Tujuan: ${order.phoneNumber}`,
      `Total: ${formatIDR(order.amount)}`,
      `Status: ${order.status}`,
      order.serialNumber ? `SN/Token: ${order.serialNumber}` : "",
      typeof window !== "undefined" ? window.location.href : "",
    ]
      .filter(Boolean)
      .join("\n")

    try {
      if (navigator.share) {
        await navigator.share({ title: "Struk JDConnect", text })
        return
      }
    } catch {
      // User dismissed the sheet, or sharing is unavailable — fall through.
    }
    try {
      await navigator.clipboard.writeText(text)
      setShared(true)
      setTimeout(() => setShared(false), 2000)
    } catch {
      // Clipboard blocked — nothing else to do.
    }
  }

  // Render the dynamic QRIS locally while payment is outstanding.
  useEffect(() => {
    if (order?.qrString) {
      QRCode.toDataURL(order.qrString, { width: 260, margin: 1 })
        .then(setQrDataUrl)
        .catch(() => setQrDataUrl(null))
    } else {
      setQrDataUrl(null)
    }
  }, [order?.qrString])

  const ui = order ? STATUS_UI[order.status] ?? STATUS_UI.pending : STATUS_UI.pending
  const Icon = ui.icon

  return (
    <div className="min-h-screen mesh-gradient">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <BrandMark />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Beranda
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-md">
        {loading ? (
          <div className="h-64 grid place-items-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-border bg-card p-8 text-center space-y-3">
            <XCircle className="h-10 w-10 text-destructive mx-auto" />
            <h2 className="text-lg font-semibold">Order tidak ditemukan</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Link href="/" className="inline-block text-sm text-primary hover:underline">
              Kembali ke beranda
            </Link>
          </div>
        ) : order ? (
          <div className="rounded-3xl border border-border bg-card shadow-soft overflow-hidden">
            <div className="p-8 text-center space-y-3 border-b border-border">
              <span className={`grid place-items-center size-16 rounded-2xl bg-muted mx-auto ${ui.tone}`}>
                <Icon className={`h-8 w-8 ${order.status === "processing" ? "animate-spin" : ""}`} />
              </span>
              <h2 className="text-xl font-semibold tracking-tight">{ui.label}</h2>
              <p className="text-sm text-muted-foreground">
                {order.product} · {order.provider}
              </p>
            </div>

            {qrDataUrl && (
              <div className="p-6 pb-0 text-center space-y-3">
                <p className="text-sm font-medium">Scan QRIS untuk membayar</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrDataUrl}
                  alt="QRIS pembayaran"
                  className="mx-auto rounded-2xl border border-border bg-white p-2"
                  width={260}
                  height={260}
                />
                <p className="text-xs text-muted-foreground">
                  Bayar {order ? formatIDR(order.amount) : ""} lewat aplikasi bank / e-wallet apa pun.
                  Status diperbarui setelah dikonfirmasi.
                </p>
              </div>
            )}

            <dl className="p-6 space-y-3 text-sm">
              <Row label="Invoice" value={order.invoiceNumber} mono copyable />
              <Row label="Nomor Tujuan" value={order.phoneNumber} />
              <Row label="Total" value={formatIDR(order.amount)} />
              <Row label="Status Bayar" value={order.paymentStatus} />
              {order.serialNumber && <Row label="SN / Token" value={order.serialNumber} mono copyable />}
              {order.message && <Row label="Catatan" value={order.message} />}
            </dl>

            <div className="p-6 pt-0 grid grid-cols-2 gap-2 print:hidden">
              <button
                onClick={refresh}
                className="h-11 rounded-xl border border-border hover:bg-muted text-sm font-medium inline-flex items-center justify-center gap-2"
              >
                <RefreshCw className="h-4 w-4" /> Perbarui
              </button>
              <button
                onClick={shareReceipt}
                className="h-11 rounded-xl border border-border hover:bg-muted text-sm font-medium inline-flex items-center justify-center gap-2"
              >
                {shared ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-success" /> Tersalin
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4" /> Bagikan
                  </>
                )}
              </button>
              <button
                onClick={() => window.print()}
                className="col-span-2 h-11 rounded-xl border border-border hover:bg-muted text-sm font-medium inline-flex items-center justify-center gap-2"
              >
                <Receipt className="h-4 w-4" /> Cetak / Simpan PDF
              </button>
            </div>
          </div>
        ) : null}

        {/* Guests can attach this order (and past ones) to an account. */}
        {order && !loggedIn && (
          <div className="mt-4">
            <ClaimAccount phoneNumber={fullPhone} />
          </div>
        )}
      </main>
    </div>
  )
}

function Row({
  label,
  value,
  mono,
  copyable,
}: {
  label: string
  value: string
  mono?: boolean
  copyable?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`font-medium text-right inline-flex items-center gap-1.5 ${mono ? "font-mono text-xs" : ""}`}>
        {value}
        {copyable && (
          <button
            onClick={() => navigator.clipboard?.writeText(value)}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Salin"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        )}
      </dd>
    </div>
  )
}
