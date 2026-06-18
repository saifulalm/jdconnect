"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Mail, Lock, Loader2, ArrowLeft, Eye, EyeOff, AlertCircle } from "lucide-react"
import { BrandMark } from "@/components/brand-mark"
import { apiUrl } from "@/lib/api"

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [form, setForm] = useState({ email: "", password: "" })
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    try {
      const res = await fetch(apiUrl("/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (res.ok) {
        localStorage.setItem("token", data.access_token)
        localStorage.setItem("user", JSON.stringify(data.user))
        router.push("/dashboard")
      } else {
        setError(data.message || "Login gagal. Periksa email dan password.")
      }
    } catch {
      setError("Tidak dapat terhubung ke server. Pastikan backend berjalan.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen mesh-gradient flex flex-col">
      <header className="container mx-auto px-4 h-16 flex items-center justify-between">
        <BrandMark />
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Beranda
        </Link>
      </header>

      <main className="flex-1 grid place-items-center px-4 py-8">
        <div className="w-full max-w-sm animate-slide-up">
          <div className="text-center mb-6 space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">Selamat datang kembali</h1>
            <p className="text-sm text-muted-foreground">Masuk ke akun JDConnect kamu</p>
          </div>

          <div className="rounded-3xl border border-border bg-card shadow-soft p-6 sm:p-7">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0" /> {error}
                </div>
              )}

              <Field label="Email">
                <Mail className="auth-icon" />
                <input
                  type="email"
                  required
                  placeholder="nama@email.com"
                  className="input-field !pl-10"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </Field>

              <Field
                label="Password"
                right={<Link href="#" className="text-xs text-primary hover:underline">Lupa password?</Link>}
              >
                <Lock className="auth-icon" />
                <input
                  type={showPw ? "text" : "password"}
                  required
                  placeholder="Masukkan password"
                  className="input-field !pl-10 !pr-10"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Toggle password"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </Field>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold shadow-glow disabled:opacity-50 active:scale-[0.99] transition-all inline-flex items-center justify-center gap-2"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isLoading ? "Memproses..." : "Masuk"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Belum punya akun?{" "}
              <Link href="/register" className="text-primary font-medium hover:underline">Daftar</Link>
            </p>
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Mau beli tanpa daftar?{" "}
            <Link href="/" className="text-foreground hover:underline">Isi ulang langsung →</Link>
          </p>
        </div>
      </main>
    </div>
  )
}

function Field({
  label,
  right,
  children,
}: {
  label: string
  right?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        {right}
      </div>
      <div className="relative">{children}</div>
    </div>
  )
}
