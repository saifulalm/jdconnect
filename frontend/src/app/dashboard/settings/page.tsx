"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { apiUrl } from "@/lib/api"
import {
  User,
  Mail,
  Phone,
  Bell,
  Moon,
  Save,
  LogOut,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"

export default function SettingsPage() {
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<{ id: string; name?: string; email?: string; phone?: string } | null>(null)
  const [form, setForm] = useState({ name: "", email: "", phone: "" })
  const [notifications, setNotifications] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    setMounted(true)
    const token = localStorage.getItem("token")
    const stored = localStorage.getItem("user")
    if (!token || !stored) {
      router.push("/login")
      return
    }
    try {
      const parsed = JSON.parse(stored)
      setUser(parsed)
      setForm({ name: parsed.name || "", email: parsed.email || "", phone: parsed.phone || "" })
    } catch {
      router.push("/login")
    }
    setNotifications(localStorage.getItem("pref:notifications") !== "off")
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const token = localStorage.getItem("token")
    if (!token || !user) return
    setIsSaving(true)
    setMessage(null)
    try {
      const res = await fetch(apiUrl(`/users/${user.id}`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: form.name, phone: form.phone }),
      })
      const data = await res.json()
      if (res.ok) {
        const updated = { ...user, ...(data?.data ?? data) }
        localStorage.setItem("user", JSON.stringify(updated))
        setUser(updated)
        setMessage({ ok: true, text: "Perubahan tersimpan." })
      } else {
        setMessage({ ok: false, text: data?.message || "Gagal menyimpan." })
      }
    } catch {
      setMessage({ ok: false, text: "Tidak dapat terhubung ke server." })
    } finally {
      setIsSaving(false)
    }
  }

  function toggleNotifications(checked: boolean) {
    setNotifications(checked)
    localStorage.setItem("pref:notifications", checked ? "on" : "off")
  }

  function handleLogout() {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    router.push("/")
  }

  return (
    <div className="p-6 sm:p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Pengaturan</h1>
        <p className="text-sm text-muted-foreground">Kelola profil dan preferensi akun</p>
      </div>

      {/* Profile */}
      <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <h2 className="font-semibold">Informasi Profil</h2>

        {message && (
          <div
            className={`flex items-center gap-2 text-sm rounded-xl px-3 py-2.5 ${
              message.ok ? "text-success bg-success/10" : "text-destructive bg-destructive/10"
            }`}
          >
            {message.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {message.text}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="name" className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" /> Nama Lengkap
          </Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" /> Email
          </Label>
          <Input id="email" type="email" value={form.email} disabled />
          <p className="text-xs text-muted-foreground">Email tidak dapat diubah.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone" className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" /> Nomor Telepon
          </Label>
          <Input
            id="phone"
            type="tel"
            inputMode="numeric"
            placeholder="081234567890"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>

        <Button type="submit" disabled={isSaving} loading={isSaving} className="w-full">
          <Save className="h-4 w-4" /> Simpan Perubahan
        </Button>
      </form>

      {/* Preferences */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <h2 className="font-semibold">Preferensi</h2>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Moon className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">Mode Gelap</p>
              <p className="text-xs text-muted-foreground">Tema gelap untuk seluruh aplikasi.</p>
            </div>
          </div>
          {mounted && (
            <Switch
              checked={resolvedTheme === "dark"}
              onCheckedChange={(c: boolean) => setTheme(c ? "dark" : "light")}
            />
          )}
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Bell className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">Notifikasi Email</p>
              <p className="text-xs text-muted-foreground">
                Preferensi tersimpan di perangkat ini.
              </p>
            </div>
          </div>
          <Switch checked={notifications} onCheckedChange={toggleNotifications} />
        </div>
      </div>

      {/* Danger */}
      <div className="rounded-2xl border border-border bg-card p-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Keluar dari akun</p>
          <p className="text-xs text-muted-foreground">Sesi di perangkat ini akan diakhiri.</p>
        </div>
        <Button variant="outline" onClick={handleLogout} className="shrink-0">
          <LogOut className="h-4 w-4" /> Keluar
        </Button>
      </div>
    </div>
  )
}
