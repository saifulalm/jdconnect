"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Search } from "lucide-react"
import { BrandMark } from "@/components/brand-mark"

export default function TrackLookup() {
  const router = useRouter()
  const [invoice, setInvoice] = useState("")
  const [phone, setPhone] = useState("")

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const last4 = phone.replace(/\D/g, "").slice(-4)
    if (!invoice.trim()) return
    router.push(`/track/${invoice.trim()}?phone=${last4}`)
  }

  return (
    <div className="min-h-screen mesh-gradient">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <BrandMark />
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Beranda
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-md">
        <div className="rounded-3xl border border-border bg-card shadow-soft p-8 space-y-6">
          <div className="space-y-1 text-center">
            <span className="grid place-items-center size-12 rounded-2xl bg-primary/10 text-primary mx-auto">
              <Search className="h-6 w-6" />
            </span>
            <h1 className="text-xl font-semibold tracking-tight">Lacak Pesanan</h1>
            <p className="text-sm text-muted-foreground">Masukkan invoice & 4 digit terakhir nomor tujuan</p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nomor Invoice</label>
              <input
                value={invoice}
                onChange={(e) => setInvoice(e.target.value)}
                placeholder="INV..."
                className="w-full h-12 px-3.5 rounded-2xl border border-input bg-background outline-none focus:ring-2 focus:ring-ring/50 font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">4 Digit Terakhir Nomor</label>
              <input
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="7890"
                className="w-full h-12 px-3.5 rounded-2xl border border-input bg-background outline-none focus:ring-2 focus:ring-ring/50"
              />
            </div>
            <button
              type="submit"
              className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold shadow-glow active:scale-[0.99] transition-all"
            >
              Lacak
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
