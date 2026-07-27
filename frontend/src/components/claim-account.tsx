"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { UserPlus, Loader2, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react"
import { requestOtp, claimGuestOrders } from "@/lib/api"

/**
 * Turns a guest into an account holder without a signup form: prove the
 * destination number with an OTP, and every order placed with it is attached.
 */
export function ClaimAccount({ phoneNumber }: { phoneNumber: string }) {
  const router = useRouter()
  const [step, setStep] = useState<"idle" | "code" | "done">("idle")
  const [phone, setPhone] = useState(phoneNumber)
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [debugCode, setDebugCode] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [claimed, setClaimed] = useState(0)

  const phoneValid = /^[0-9]{9,15}$/.test(phone.replace(/\D/g, ""))

  async function sendCode() {
    setError(null)
    if (!phoneValid) return setError("Masukkan nomor lengkap yang dipakai saat pesan.")
    setBusy(true)
    try {
      const res = await requestOtp(phone, "verify_phone")
      // In dev (or when SMS is off) the backend echoes the code.
      setDebugCode(res.debugCode ?? null)
      setStep("code")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengirim kode.")
    } finally {
      setBusy(false)
    }
  }

  async function submitClaim() {
    setError(null)
    if (code.length !== 6) return setError("Kode OTP harus 6 digit.")
    setBusy(true)
    try {
      const res = await claimGuestOrders({ phoneNumber: phone, code, name: name || undefined })
      localStorage.setItem("token", res.access_token)
      localStorage.setItem("user", JSON.stringify(res.user))
      setClaimed(res.claimed)
      setStep("done")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kode salah atau kedaluwarsa.")
    } finally {
      setBusy(false)
    }
  }

  if (step === "done") {
    return (
      <div className="rounded-2xl border border-success/30 bg-success/5 p-5 space-y-3 text-center">
        <CheckCircle2 className="h-8 w-8 text-success mx-auto" />
        <div>
          <p className="font-medium text-sm">Pesanan tersimpan di akunmu</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {claimed} pesanan dipindahkan. Kamu sudah masuk otomatis.
          </p>
        </div>
        <button
          onClick={() => router.push("/dashboard")}
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
        >
          Buka Dashboard <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-start gap-3">
        <span className="grid place-items-center size-10 rounded-xl bg-primary/10 text-primary shrink-0">
          <UserPlus className="h-5 w-5" />
        </span>
        <div>
          <p className="font-medium text-sm">Simpan pesanan ini ke akun</p>
          <p className="text-xs text-muted-foreground">
            Verifikasi nomor dengan OTP — tanpa isi form pendaftaran.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2.5">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {step === "idle" ? (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Nomor tujuan (lengkap)</label>
            <input
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="081234567890"
              className="input-field"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">
              Nama <span className="font-normal">(opsional)</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama kamu"
              className="input-field"
            />
          </div>
          <button
            onClick={sendCode}
            disabled={busy}
            className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Kirim Kode OTP
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {debugCode && (
            <p className="text-xs text-warning bg-warning/10 rounded-xl px-3 py-2">
              Mode dev — kode OTP: <span className="font-mono font-semibold">{debugCode}</span>
            </p>
          )}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Kode OTP (6 digit)</label>
            <input
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              className="input-field text-center tracking-[0.4em] font-mono"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setStep("idle")}
              className="h-11 px-4 rounded-xl border border-border text-sm font-medium hover:bg-muted"
            >
              Ubah
            </button>
            <button
              onClick={submitClaim}
              disabled={busy || code.length !== 6}
              className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Verifikasi & Simpan
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
