"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiUrl } from "@/lib/api"
import {
  Key,
  Copy,
  RefreshCw,
  ShieldCheck,
  Globe,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react"

interface User {
  id: string
  name: string
  email: string
  role: string
  apiKey?: string
  apiSecret?: string
  ipWhitelist?: string
}

export default function ApiManagementPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [ipWhitelist, setIpWhitelist] = useState("")
  const [isUpdatingIp, setIsUpdatingIp] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }
    fetchProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  async function fetchProfile() {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(apiUrl("/users/profile"), {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) {
        router.push("/login")
        return
      }
      const data = await res.json()
      const u = data?.data ?? data
      if (u?.id) {
        setUser(u)
        setIpWhitelist(u.ipWhitelist || "")
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function generateKeys() {
    setIsGenerating(true)
    setNotice(null)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(apiUrl("/users/api-keys"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        await fetchProfile()
        setNotice("API key baru dibuat. Simpan secret dengan aman — tampil sekali di sini.")
      }
    } finally {
      setIsGenerating(false)
    }
  }

  async function updateIpWhitelist() {
    if (!user) return
    setIsUpdatingIp(true)
    setNotice(null)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(apiUrl(`/users/${user.id}`), {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ipWhitelist }),
      })
      if (res.ok) setNotice("IP whitelist diperbarui.")
    } finally {
      setIsUpdatingIp(false)
    }
  }

  function copy(text: string, tag: string) {
    navigator.clipboard?.writeText(text)
    setCopied(tag)
    setTimeout(() => setCopied(null), 1500)
  }

  if (isLoading) {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6 sm:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">API H2H</h1>
        <p className="text-sm text-muted-foreground">
          Kredensial untuk integrasi reseller — endpoint <code className="font-mono text-xs">/api/h2h/*</code>
        </p>
      </div>

      {notice && (
        <div className="flex items-center gap-2 text-sm text-success bg-success/10 rounded-xl px-3 py-2.5">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> {notice}
        </div>
      )}

      {/* Credentials */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid place-items-center size-10 rounded-xl bg-primary/10 text-primary">
              <Key className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-semibold">API Credentials</h2>
              <p className="text-xs text-muted-foreground">
                {user?.apiKey ? "Kredensial aktif" : "Belum ada API key"}
              </p>
            </div>
          </div>
          <Button size="sm" onClick={generateKeys} disabled={isGenerating} loading={isGenerating}>
            <RefreshCw className="h-4 w-4" />
            {user?.apiKey ? "Regenerate" : "Buat API Key"}
          </Button>
        </div>

        {user?.apiKey && (
          <div className="space-y-3">
            <CredentialRow
              label="API Key"
              value={user.apiKey}
              onCopy={() => copy(user.apiKey!, "key")}
              copied={copied === "key"}
            />
            {user.apiSecret && (
              <CredentialRow
                label="API Secret"
                value={showSecret ? user.apiSecret : "sk_" + "•".repeat(32)}
                onCopy={() => copy(user.apiSecret!, "secret")}
                copied={copied === "secret"}
                extra={
                  <button
                    onClick={() => setShowSecret((v) => !v)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Toggle secret"
                  >
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />
            )}
          </div>
        )}
      </div>

      {/* IP whitelist */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <span className="grid place-items-center size-10 rounded-xl bg-primary/10 text-primary">
            <Globe className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-semibold">IP Whitelist</h2>
            <p className="text-xs text-muted-foreground">
              Pisahkan dengan koma. Kosongkan untuk izinkan semua IP.
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ip" className="text-sm">Daftar IP</Label>
          <Input
            id="ip"
            placeholder="103.10.10.1, 103.10.10.2"
            value={ipWhitelist}
            onChange={(e) => setIpWhitelist(e.target.value)}
            className="font-mono text-sm"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={updateIpWhitelist}
          disabled={isUpdatingIp}
          loading={isUpdatingIp}
        >
          Simpan Whitelist
        </Button>
      </div>

      {/* Docs */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <span className="grid place-items-center size-10 rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-semibold">Contoh Request</h2>
            <p className="text-xs text-muted-foreground">Kirim API key via header <code className="font-mono">x-api-key</code></p>
          </div>
        </div>
        <div className="rounded-xl bg-[#0b0b0f] overflow-hidden">
          <pre className="p-4 text-xs leading-relaxed text-emerald-300 font-mono overflow-x-auto">
{`POST ${apiUrl("/h2h/transaction")}
x-api-key: {API_KEY}
Content-Type: application/json

{
  "productId": "TELKOMSEL_10K",
  "phoneNumber": "081234567890",
  "metadata": { "client_ref": "TX-001" }
}`}
          </pre>
        </div>
      </div>
    </div>
  )
}

function CredentialRow({
  label,
  value,
  onCopy,
  copied,
  extra,
}: {
  label: string
  value: string
  onCopy: () => void
  copied: boolean
  extra?: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3.5 h-12">
        <span className="flex-1 font-mono text-xs truncate">{value}</span>
        {extra}
        <button onClick={onCopy} className="text-muted-foreground hover:text-foreground" aria-label={`Salin ${label}`}>
          {copied ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}
