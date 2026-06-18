"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Mail,
  Lock,
  User,
  Phone,
  Loader2,
  ArrowLeft,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
} from "lucide-react"
import { BrandMark } from "@/components/brand-mark"
import { apiUrl } from "@/lib/api"

export default function RegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  })
  const [error, setError] = useState("")

  const pwLongEnough = form.password.length >= 6
  const pwMatch = form.confirmPassword.length > 0 && form.password === form.confirmPassword
  const canSubmit = useMemo(
    () => form.name && form.email && pwLongEnough && pwMatch && !isLoading,
    [form, pwLongEnough, pwMatch, isLoading],
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!pwLongEnough) return setError("Password minimal 6 karakter.")
    if (!pwMatch) return setError("Konfirmasi password tidak cocok.")

    setIsLoading(true)
    try {
      const res = await fetch(apiUrl("/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          password: form.password,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        localStorage.setItem("token", data.access_token)
        localStorage.setItem("user", JSON.stringify(data.user))
        router.push("/dashboard")
      } else {
        const msg = Array.isArray(data.message) ? data.message.join(", ") : data.message
        setError(msg || "Pendaftaran gagal. Coba lagi.")
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
            <h1 className="text-2xl font-semibold tracking-tight">Buat akun baru</h1>
            <p className="text-sm text-muted-foreground">Daftar untuk simpan riwayat & saldo</p>
          </div>

          <div className="rounded-3xl border border-border bg-card shadow-soft p-6 sm:p-7">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0" /> {error}
                </div>
              )}

              <Field label="Nama Lengkap">
                <User className="auth-icon" />
                <input
                  required
                  placeholder="Nama kamu"
                  className="input-field !pl-10"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </Field>

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

              <Field label="Nomor Telepon" hint="opsional">
                <Phone className="auth-icon" />
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="081234567890"
                  className="input-field !pl-10"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </Field>

              <Field label="Password" hint={pwLongEnough ? undefined : "min. 6 karakter"}>
                <Lock className="auth-icon" />
                <input
                  type={showPw ? "text" : "password"}
                  required
                  placeholder="Minimal 6 karakter"
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

              <Field label="Konfirmasi Password">
                <Lock className="auth-icon" />
                <input
                  type={showPw ? "text" : "password"}
                  required
                  placeholder="Ulangi password"
                  className="input-field !pl-10 !pr-10"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                />
                {form.confirmPassword.length > 0 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    {pwMatch ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    )}
                  </span>
                )}
              </Field>

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold shadow-glow disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] transition-all inline-flex items-center justify-center gap-2"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isLoading ? "Memproses..." : "Daftar Sekarang"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Sudah punya akun?{" "}
              <Link href="/login" className="text-primary font-medium hover:underline">Masuk</Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      <div className="relative">{children}</div>
    </div>
  )
}
