"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { BrandMark } from "@/components/brand-mark"
import { QuickRecharge } from "@/components/quick-recharge"
import { BRAND } from "@/lib/brand"
import {
  ArrowRight,
  Zap,
  ShieldCheck,
  Clock,
  Wallet,
  Smartphone,
  Wifi,
  Zap as Bolt,
  Gamepad2,
  Code2,
  CheckCircle2,
  Search,
} from "lucide-react"

const CATEGORIES = [
  { icon: Smartphone, label: "Pulsa", desc: "Semua operator" },
  { icon: Wifi, label: "Paket Data", desc: "Internet murah" },
  { icon: Bolt, label: "Token PLN", desc: "Listrik prabayar" },
  { icon: Gamepad2, label: "Top Up Game", desc: "Voucher & diamond" },
  { icon: Wallet, label: "E-Wallet", desc: "OVO, DANA, GoPay" },
]

const FEATURES = [
  { icon: Zap, title: "Tanpa Login", desc: "Beli langsung — cukup nomor tujuan & bayar. Tidak perlu daftar." },
  { icon: ShieldCheck, title: "Pembayaran Aman", desc: "Midtrans: QRIS, Virtual Account, kartu, dan e-wallet." },
  { icon: Clock, title: "Proses Instan", desc: "Top-up otomatis ke supplier H2H, rata-rata di bawah 5 detik." },
  { icon: Code2, title: "API H2H", desc: "Integrasi reseller dengan API key & signature untuk bisnis." },
]

export default function Home() {
  return (
    <div className="min-h-screen mesh-gradient font-sans">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border glass">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <BrandMark />
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <Link href="#produk" className="hover:text-foreground transition-colors">Produk</Link>
            <Link href="#fitur" className="hover:text-foreground transition-colors">Fitur</Link>
            <Link href="#h2h" className="hover:text-foreground transition-colors">API H2H</Link>
            <Link href="/track" className="hover:text-foreground transition-colors">Lacak Pesanan</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="hidden sm:flex" asChild>
              <Link href="/login">Masuk</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/register">Daftar</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative">
          <div className="absolute inset-0 grid-bg -z-10" />
          <div className="container mx-auto px-4 pt-16 pb-20 lg:pt-24">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div className="space-y-7 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-success animate-pulse" />
                  Loginless · proses otomatis 24/7
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.08]">
                  Isi pulsa & tagihan,
                  <br />
                  <span className="gradient-text">tanpa ribet daftar.</span>
                </h1>
                <p className="text-lg text-muted-foreground leading-relaxed max-w-md mx-auto lg:mx-0">
                  Pulsa, paket data, token PLN, dan top-up game. Bayar lewat
                  QRIS atau VA, langsung masuk dalam hitungan detik.
                </p>
                <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                  <Button size="lg" asChild>
                    <Link href="#beli">Mulai Isi Ulang <ArrowRight className="h-4 w-4" /></Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link href="#h2h">Untuk Reseller</Link>
                  </Button>
                </div>
                <div className="flex items-center gap-6 justify-center lg:justify-start pt-2 text-sm">
                  <Stat value="99.9%" label="Uptime" />
                  <div className="h-8 w-px bg-border" />
                  <Stat value="~5 dtk" label="Proses" />
                  <div className="h-8 w-px bg-border" />
                  <Stat value="5+" label="Operator" />
                </div>
              </div>

              <div id="beli" className="lg:pl-6">
                <QuickRecharge />
              </div>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section id="produk" className="py-16 border-t border-border">
          <div className="container mx-auto px-4">
            <SectionHead eyebrow="Produk" title="Satu tempat untuk semua kebutuhan digital" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-10">
              {CATEGORIES.map((c) => (
                <div
                  key={c.label}
                  className="card-hover rounded-2xl border border-border bg-card p-5 space-y-3"
                >
                  <span className="grid place-items-center size-11 rounded-xl bg-primary/10 text-primary">
                    <c.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="font-medium">{c.label}</div>
                    <div className="text-xs text-muted-foreground">{c.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="fitur" className="py-16 border-t border-border">
          <div className="container mx-auto px-4">
            <SectionHead eyebrow="Kenapa kami" title="Dibangun untuk cepat, aman, dan mudah" />
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
              {FEATURES.map((f) => (
                <div key={f.title} className="rounded-2xl border border-border bg-card p-6 space-y-3">
                  <span className="grid place-items-center size-11 rounded-xl bg-muted text-foreground">
                    <f.icon className="h-5 w-5" />
                  </span>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Track CTA */}
        <section className="py-16 border-t border-border">
          <div className="container mx-auto px-4">
            <div className="rounded-3xl border border-border bg-card p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-1 text-center sm:text-left">
                <h3 className="text-xl font-semibold">Sudah pernah pesan?</h3>
                <p className="text-sm text-muted-foreground">
                  Lacak status pesanan dengan nomor invoice — tanpa login.
                </p>
              </div>
              <Button variant="outline" asChild>
                <Link href="/track"><Search className="h-4 w-4" /> Lacak Pesanan</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* H2H */}
        <section id="h2h" className="py-16 border-t border-border">
          <div className="container mx-auto px-4 grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <SectionHead eyebrow="Untuk bisnis" title="API H2H untuk reseller" align="left" />
              <ul className="space-y-3">
                {[
                  "Autentikasi API key + signature",
                  "IP whitelist & rate limiting",
                  "Webhook callback real-time",
                  "Saldo deposit & riwayat transaksi",
                ].map((i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" /> {i}
                  </li>
                ))}
              </ul>
              <Button asChild>
                <Link href="/register">Daftar Reseller <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </div>
            <div className="rounded-2xl border border-border bg-[#0b0b0f] overflow-hidden shadow-soft">
              <div className="flex items-center gap-2 px-4 h-10 border-b border-white/10">
                <span className="size-2.5 rounded-full bg-rose-500" />
                <span className="size-2.5 rounded-full bg-amber-500" />
                <span className="size-2.5 rounded-full bg-emerald-500" />
              </div>
              <pre className="p-5 text-xs leading-relaxed text-emerald-300 font-mono overflow-x-auto">
{`POST /api/h2h/transaction
x-api-key: pk_live_••••
Content-Type: application/json

{
  "productId": "TELKOMSEL_10K",
  "phoneNumber": "081234567890",
  "metadata": { "client_ref": "TX-001" }
}`}
              </pre>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-10">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <BrandMark />
          <p>© {new Date().getFullYear()} {BRAND.name}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-xl font-semibold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

function SectionHead({
  eyebrow,
  title,
  align = "center",
}: {
  eyebrow: string
  title: string
  align?: "center" | "left"
}) {
  return (
    <div className={align === "center" ? "text-center max-w-2xl mx-auto space-y-2" : "space-y-2"}>
      <div className="text-xs font-semibold tracking-widest uppercase text-primary">{eyebrow}</div>
      <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">{title}</h2>
    </div>
  )
}
