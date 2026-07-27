"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Loader2,
  Plus,
  Trash2,
  Save,
  AlertCircle,
  CheckCircle2,
  Layers,
  Hash,
  Search,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { apiUrl, type Category, type OperatorPrefix } from "@/lib/api"
import { isAdminRole } from "@/lib/utils"

type Tab = "categories" | "prefixes"

export default function AdminCatalogPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>("categories")
  const [categories, setCategories] = useState<Category[]>([])
  const [prefixes, setPrefixes] = useState<OperatorPrefix[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)

  const authHeaders = useCallback((): HeadersInit => {
    const token = localStorage.getItem("token")
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [c, p] = await Promise.all([
        fetch(apiUrl("/catalog/admin/categories"), { headers: authHeaders() }).then((r) => r.json()),
        fetch(apiUrl("/catalog/prefixes"), { cache: "no-store" }).then((r) => r.json()),
      ])
      setCategories(Array.isArray(c) ? c : [])
      setPrefixes(Array.isArray(p) ? p : [])
    } catch {
      setNotice({ ok: false, text: "Gagal memuat data katalog." })
    } finally {
      setLoading(false)
    }
  }, [authHeaders])

  useEffect(() => {
    const token = localStorage.getItem("token")
    const userData = localStorage.getItem("user")
    if (!token || !userData) {
      router.push("/login")
      return
    }
    try {
      if (!isAdminRole(JSON.parse(userData).role)) {
        router.push("/dashboard")
        return
      }
    } catch {
      router.push("/login")
      return
    }
    load()
  }, [router, load])

  async function saveCategory(c: Category, patch: Partial<Category>) {
    setNotice(null)
    const res = await fetch(apiUrl(`/catalog/categories/${c.id}`), {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(patch),
    })
    if (res.ok) {
      setNotice({ ok: true, text: `Kategori "${c.label}" tersimpan.` })
      load()
    } else {
      const err = await res.json().catch(() => ({}))
      const msg = Array.isArray(err.message) ? err.message.join(", ") : err.message
      setNotice({ ok: false, text: msg || "Gagal menyimpan kategori." })
    }
  }

  async function addPrefix(prefix: string, provider: string) {
    setNotice(null)
    const res = await fetch(apiUrl("/catalog/prefixes"), {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ prefix, provider }),
    })
    if (res.ok) {
      setNotice({ ok: true, text: `Prefix ${prefix} → ${provider} ditambahkan.` })
      load()
    } else {
      const err = await res.json().catch(() => ({}))
      const msg = Array.isArray(err.message) ? err.message.join(", ") : err.message
      setNotice({ ok: false, text: msg || "Gagal menambah prefix." })
    }
  }

  async function removePrefix(p: OperatorPrefix) {
    await fetch(apiUrl(`/catalog/prefixes/${p.id}`), { method: "DELETE", headers: authHeaders() })
    setNotice({ ok: true, text: `Prefix ${p.prefix} dihapus.` })
    load()
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen mesh-gradient">
      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Pengaturan Katalog</h1>
          <p className="text-sm text-muted-foreground">
            Atur tab kategori, label input, dan prefix operator — langsung dari backend.
          </p>
        </div>

        {notice && (
          <div
            className={`flex items-center gap-2 text-sm rounded-xl px-3 py-2.5 ${
              notice.ok ? "text-success bg-success/10" : "text-destructive bg-destructive/10"
            }`}
          >
            {notice.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {notice.text}
          </div>
        )}

        <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit">
          {([
            ["categories", "Kategori", Layers],
            ["prefixes", "Prefix Operator", Hash],
          ] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-xs font-medium transition-colors ${
                tab === key
                  ? "bg-card text-foreground shadow-soft"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        {tab === "categories" ? (
          <div className="space-y-4">
            {categories.map((c) => (
              <CategoryCard key={c.id} category={c} onSave={saveCategory} />
            ))}
          </div>
        ) : (
          <PrefixPanel prefixes={prefixes} onAdd={addPrefix} onRemove={removePrefix} />
        )}
      </div>
    </div>
  )
}

function CategoryCard({
  category,
  onSave,
}: {
  category: Category
  onSave: (c: Category, patch: Partial<Category>) => Promise<void>
}) {
  const [draft, setDraft] = useState(category)
  const [saving, setSaving] = useState(false)
  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(category),
    [draft, category],
  )

  useEffect(() => setDraft(category), [category])

  async function handleSave() {
    setSaving(true)
    await onSave(category, {
      label: draft.label,
      description: draft.description,
      icon: draft.icon,
      inputLabel: draft.inputLabel,
      inputPlaceholder: draft.inputPlaceholder,
      inputHelp: draft.inputHelp,
      minLength: Number(draft.minLength),
      maxLength: Number(draft.maxLength),
      detectOperator: draft.detectOperator,
      requiresServerId: draft.requiresServerId,
      serverIdLabel: draft.serverIdLabel,
      sortOrder: Number(draft.sortOrder),
      isActive: draft.isActive,
    })
    setSaving(false)
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs bg-muted px-2 py-1 rounded-lg">{category.key}</span>
          <h2 className="font-semibold">{draft.label}</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">Aktif</span>
          <Switch
            checked={draft.isActive}
            onCheckedChange={(v: boolean) => setDraft({ ...draft, isActive: v })}
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Label Tab">
          <Input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
        </Field>
        <Field label="Ikon (Lucide)">
          <Input value={draft.icon} onChange={(e) => setDraft({ ...draft, icon: e.target.value })} />
        </Field>
        <Field label="Label Input">
          <Input
            value={draft.inputLabel}
            onChange={(e) => setDraft({ ...draft, inputLabel: e.target.value })}
          />
        </Field>
        <Field label="Placeholder">
          <Input
            value={draft.inputPlaceholder}
            onChange={(e) => setDraft({ ...draft, inputPlaceholder: e.target.value })}
          />
        </Field>
        <Field label="Teks Bantuan">
          <Input
            value={draft.inputHelp || ""}
            onChange={(e) => setDraft({ ...draft, inputHelp: e.target.value })}
          />
        </Field>
        <Field label="Deskripsi">
          <Input
            value={draft.description || ""}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />
        </Field>
        <Field label="Panjang Min">
          <Input
            type="number"
            value={draft.minLength}
            onChange={(e) => setDraft({ ...draft, minLength: Number(e.target.value) })}
          />
        </Field>
        <Field label="Panjang Maks">
          <Input
            type="number"
            value={draft.maxLength}
            onChange={(e) => setDraft({ ...draft, maxLength: Number(e.target.value) })}
          />
        </Field>
        <Field label="Urutan Tab">
          <Input
            type="number"
            value={draft.sortOrder}
            onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) })}
          />
        </Field>
        <Field label="Label Server ID">
          <Input
            value={draft.serverIdLabel || ""}
            placeholder="Server / Zone ID"
            onChange={(e) => setDraft({ ...draft, serverIdLabel: e.target.value })}
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-border">
        <label className="flex items-center gap-3 text-sm">
          <Switch
            checked={draft.detectOperator}
            onCheckedChange={(v: boolean) => setDraft({ ...draft, detectOperator: v })}
          />
          Deteksi operator dari prefix
        </label>
        <label className="flex items-center gap-3 text-sm">
          <Switch
            checked={draft.requiresServerId}
            onCheckedChange={(v: boolean) => setDraft({ ...draft, requiresServerId: v })}
          />
          Butuh Server ID
        </label>
        <Button
          size="sm"
          className="ml-auto"
          disabled={!dirty || saving}
          loading={saving}
          onClick={handleSave}
        >
          <Save className="h-4 w-4" /> Simpan
        </Button>
      </div>
    </div>
  )
}

function PrefixPanel({
  prefixes,
  onAdd,
  onRemove,
}: {
  prefixes: OperatorPrefix[]
  onAdd: (prefix: string, provider: string) => Promise<void>
  onRemove: (p: OperatorPrefix) => Promise<void>
}) {
  const [prefix, setPrefix] = useState("")
  const [provider, setProvider] = useState("")
  const [query, setQuery] = useState("")
  const [adding, setAdding] = useState(false)

  const grouped = useMemo(() => {
    const q = query.toLowerCase()
    const map = new Map<string, OperatorPrefix[]>()
    for (const p of prefixes) {
      if (q && !p.prefix.includes(q) && !p.provider.toLowerCase().includes(q)) continue
      const list = map.get(p.provider)
      if (list) list.push(p)
      else map.set(p.provider, [p])
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [prefixes, query])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!prefix || !provider) return
    setAdding(true)
    await onAdd(prefix, provider)
    setPrefix("")
    setProvider("")
    setAdding(false)
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Tambah Prefix</h2>
        <div className="grid sm:grid-cols-[160px_1fr_auto] gap-3 items-end">
          <Field label="Prefix">
            <Input
              inputMode="numeric"
              placeholder="0812"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
            />
          </Field>
          <Field label="Provider">
            <Input
              placeholder="Telkomsel"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
            />
          </Field>
          <Button type="submit" disabled={adding} loading={adding}>
            <Plus className="h-4 w-4" /> Tambah
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Provider harus sama dengan nama provider produk agar filter otomatis bekerja.
        </p>
      </form>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Cari prefix atau provider..."
          className="!pl-10"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {grouped.map(([providerName, items]) => (
        <div key={providerName} className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">{providerName}</h3>
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
              {items.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {items.map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-background pl-3 pr-1.5 h-9 text-sm font-mono"
              >
                {p.prefix}
                <button
                  onClick={() => onRemove(p)}
                  className="grid place-items-center size-6 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  aria-label={`Hapus ${p.prefix}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}
