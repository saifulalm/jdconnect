"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Mail,
  Lock,
  Loader2,
  ArrowLeft,
  Eye,
  EyeOff,
  AlertCircle,
  Smartphone,
} from "lucide-react"
import { BrandMark } from "@/components/brand-mark"
import { apiUrl, requestOtp, otpLogin } from "@/lib/api"

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [mode, setMode] = useState<"password" | "otp">("password")
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
            {/* Password vs passwordless (OTP) */}
            <div className="grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1 mb-5">
              {(
                [
                  ["password", "Email & Password"],
                  ["otp", "Kode OTP"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setMode(key)
                    setError("")
                  }}
                  className={`h-9 rounded-xl text-xs font-medium transition-colors ${
                    mode === key
                      ? "bg-card text-foreground shadow-soft"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {mode === "otp" ? (
              <OtpLoginForm />
            ) : (
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
            )}

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

/** Passwordless sign-in with an OTP sent to the registered number. */
function OtpLoginForm() {
  const router = useRouter()
  const [step, setStep] = useState<"phone" | "code">("phone")
  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")
  const [debugCode, setDebugCode] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  async function sendCode() {
    setError("")
    if (!/^[0-9]{9,15}$/.test(phone.replace(/\D/g, ""))) {
      return setError("Masukkan nomor handphone yang valid.")
    }
    setBusy(true)
    try {
      const res = await requestOtp(phone, "login")
      setDebugCode(res.debugCode ?? null)
      setStep("code")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengirim kode.")
    } finally {
      setBusy(false)
    }
  }

  async function submit() {
    setError("")
    if (code.length !== 6) return setError("Kode OTP harus 6 digit.")
    setBusy(true)
    try {
      const res = await otpLogin(phone, code)
      localStorage.setItem("token", res.access_token)
      localStorage.setItem("user", JSON.stringify(res.user))
      router.push("/dashboard")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kode salah atau kedaluwarsa.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2.5">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {step === "phone" ? (
        <>
          <Field label="Nomor Handphone">
            <Smartphone className="auth-icon" />
            <input
              inputMode="numeric"
              placeholder="081234567890"
              className="input-field !pl-10"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </Field>
          <button
            onClick={sendCode}
            disabled={busy}
            className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold shadow-glow disabled:opacity-50 active:scale-[0.99] transition-all inline-flex items-center justify-center gap-2"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Kirim Kode OTP
          </button>
          <p className="text-xs text-muted-foreground text-center">
            Nomor harus sudah terdaftar. Pernah beli sebagai tamu?{" "}
            <Link href="/track" className="text-primary hover:underline">
              Klaim pesananmu
            </Link>
            .
          </p>
        </>
      ) : (
        <>
          {debugCode && (
            <p className="text-xs text-warning bg-warning/10 rounded-xl px-3 py-2">
              Mode dev — kode OTP: <span className="font-mono font-semibold">{debugCode}</span>
            </p>
          )}
          <Field label={`Kode OTP ke ${phone}`}>
            <input
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              className="input-field text-center tracking-[0.4em] font-mono"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
          </Field>
          <div className="flex gap-2">
            <button
              onClick={() => setStep("phone")}
              className="h-12 px-4 rounded-2xl border border-border text-sm font-medium hover:bg-muted"
            >
              Ubah
            </button>
            <button
              onClick={submit}
              disabled={busy || code.length !== 6}
              className="flex-1 h-12 rounded-2xl bg-primary text-primary-foreground font-semibold shadow-glow disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Masuk
            </button>
          </div>
        </>
      )}
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
