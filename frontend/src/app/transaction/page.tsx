"use client"

import Link from "next/link"
import { ArrowLeft, Search, ShieldCheck, Clock, Zap } from "lucide-react"
import { BrandMark } from "@/components/brand-mark"
import { QuickRecharge } from "@/components/quick-recharge"

// Public loginless checkout — no account needed.
export default function TransactionPage() {
  return (
    <div className="min-h-screen mesh-gradient">
      <header className="sticky top-0 z-50 border-b border-border glass">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <BrandMark />
          <div className="flex items-center gap-2">
            <Link
              href="/track"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <Search className="h-4 w-4" /> Lacak Pesanan
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Beranda
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-5xl">
        <div className="grid lg:grid-cols-[1fr_minmax(0,26rem)] gap-10 items-start">
          {/* Left: context */}
          <div className="space-y-6 order-2 lg:order-1">
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight">
                Beli pulsa & tagihan, <span className="gradient-text">tanpa login.</span>
              </h1>
              <p className="text-muted-foreground leading-relaxed max-w-md">
                Pilih produk, masukkan nomor tujuan, bayar — selesai dalam
                hitungan detik. Tidak perlu daftar akun.
              </p>
            </div>

            <ul className="space-y-3">
              {[
                { icon: Zap, text: "Proses otomatis, rata-rata di bawah 5 detik" },
                { icon: ShieldCheck, text: "Pembayaran aman via QRIS, VA, dan e-wallet" },
                { icon: Clock, text: "Lacak status kapan saja dengan nomor invoice" },
              ].map((f) => (
                <li key={f.text} className="flex items-center gap-3 text-sm">
                  <span className="grid place-items-center size-9 rounded-xl bg-primary/10 text-primary shrink-0">
                    <f.icon className="h-4 w-4" />
                  </span>
                  {f.text}
                </li>
              ))}
            </ul>

            <div className="rounded-2xl border border-border bg-card p-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Sudah pernah pesan?</p>
                <p className="text-xs text-muted-foreground">Cek status dengan nomor invoice.</p>
              </div>
              <Link
                href="/track"
                className="shrink-0 inline-flex items-center gap-1.5 h-10 px-4 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
              >
                <Search className="h-4 w-4" /> Lacak
              </Link>
            </div>

            <p className="text-xs text-muted-foreground">
              Ingin simpan riwayat & saldo?{" "}
              <Link href="/register" className="text-primary hover:underline">Daftar akun</Link>{" "}
              — opsional.
            </p>
          </div>

          {/* Right: the actual checkout */}
          <div className="order-1 lg:order-2">
            <QuickRecharge />
          </div>
        </div>
      </main>
    </div>
  )
}
