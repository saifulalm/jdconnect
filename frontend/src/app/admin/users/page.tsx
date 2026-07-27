"use client";

import { isAdminRole } from "@/lib/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark } from "@/components/brand-mark";
import { apiUrl, formatIDR } from "@/lib/api";
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  Search,
  Wallet,
  Plus,
  CheckCircle2,
  AlertCircle,
  X,
  UserCheck,
  UserX,
} from "lucide-react";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  balance?: number;
  isActive?: boolean;
  transactions?: number;
  createdAt?: string;
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<AdminUser | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selfId, setSelfId] = useState("");

  const authHeaders = useCallback((): HeadersInit => {
    const token = localStorage.getItem("token");
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/admin/users"), { headers: authHeaders() });
      if (res.status === 401 || res.status === 403) {
        router.push("/login");
        return;
      }
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : data.users || []);
    } catch {
      setError("Gagal memuat data pengguna.");
    } finally {
      setLoading(false);
    }
  }, [authHeaders, router]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    if (!token || !user) {
      router.push("/login");
      return;
    }
    try {
      const parsed = JSON.parse(user);
      if (!isAdminRole(parsed.role)) {
        router.push("/dashboard");
        return;
      }
      setSelfId(parsed.id);
    } catch {
      router.push("/login");
      return;
    }
    load();
  }, [router, load]);

  async function submitTopup(amount: number, description: string) {
    if (!target) return;
    const res = await fetch(apiUrl("/admin/topup"), {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ userId: target.id, amount, description }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setNotice({
        ok: true,
        text: `Saldo ${target.name} +${formatIDR(amount)} → ${formatIDR(Number(data?.data?.balance ?? 0))}`,
      });
      setTarget(null);
      await load();
    } else {
      const msg = Array.isArray(data.message) ? data.message.join(", ") : data.message;
      setNotice({ ok: false, text: msg || "Top up gagal." });
    }
  }

  /** Privileged change — admin-only route, never the self-service one. */
  async function updateUser(u: AdminUser, patch: { role?: string; isActive?: boolean }) {
    setBusyId(u.id)
    setNotice(null)
    try {
      const res = await fetch(apiUrl(`/admin/users/${u.id}`), {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify(patch),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setNotice({
          ok: true,
          text:
            patch.isActive === undefined
              ? `Role ${u.name} diubah ke ${patch.role}.`
              : `${u.name} ${patch.isActive ? "diaktifkan" : "dinonaktifkan"}.`,
        })
        await load()
      } else {
        setNotice({ ok: false, text: data?.message || "Perubahan gagal." })
      }
    } finally {
      setBusyId(null)
    }
  }

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        (u.phone || "").includes(q),
    );
  }, [users, query]);

  return (
    <div className="min-h-screen mesh-gradient">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <BrandMark href="/admin" />
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Dashboard Admin
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Kelola Pengguna</h1>
            <p className="text-sm text-muted-foreground">{users.length} pengguna terdaftar</p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Muat Ulang
          </Button>
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

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Cari nama, email, atau nomor..."
            className="!pl-10 h-11 rounded-xl"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="py-20 grid place-items-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : error ? (
          <div className="py-16 text-center space-y-3">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={load}>
              Coba Lagi
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider border-b border-border">
                    <th className="px-5 py-3.5 font-medium">Pengguna</th>
                    <th className="px-5 py-3.5 font-medium">Role</th>
                    <th className="px-5 py-3.5 font-medium">Status</th>
                    <th className="px-5 py-3.5 font-medium text-right">Saldo</th>
                    <th className="px-5 py-3.5 font-medium text-right">Transaksi</th>
                    <th className="px-5 py-3.5 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="grid place-items-center size-9 rounded-xl bg-primary/10 text-primary font-semibold shrink-0">
                            {u.name?.[0]?.toUpperCase() || "?"}
                          </span>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{u.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {/* Self-management is blocked server-side too. */}
                        <select
                          value={u.role || "customer"}
                          disabled={u.id === selfId || busyId === u.id}
                          onChange={(e) => updateUser(u, { role: e.target.value })}
                          className="h-8 rounded-lg border border-border bg-background px-2 text-xs capitalize disabled:opacity-60"
                        >
                          <option value="customer">customer</option>
                          <option value="admin">admin</option>
                          <option value="superaccess">superaccess</option>
                        </select>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            u.isActive === false
                              ? "bg-destructive/10 text-destructive"
                              : "bg-success/10 text-success"
                          }`}
                        >
                          {u.isActive === false ? "Nonaktif" : "Aktif"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium whitespace-nowrap">
                        {formatIDR(Number(u.balance ?? 0))}
                      </td>
                      <td className="px-5 py-3.5 text-right text-muted-foreground">
                        {u.transactions ?? 0}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-1.5">
                          <Button size="sm" variant="outline" onClick={() => setTarget(u)}>
                            <Plus className="h-3.5 w-3.5" /> Top Up
                          </Button>
                          {u.id !== selfId && (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={busyId === u.id}
                              onClick={() => updateUser(u, { isActive: u.isActive === false })}
                              title={u.isActive === false ? "Aktifkan akun" : "Nonaktifkan akun"}
                            >
                              {u.isActive === false ? (
                                <UserCheck className="h-3.5 w-3.5" />
                              ) : (
                                <UserX className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {target && (
        <TopupDialog user={target} onClose={() => setTarget(null)} onSubmit={submitTopup} />
      )}
    </div>
  );
}

function TopupDialog({
  user,
  onClose,
  onSubmit,
}: {
  user: AdminUser;
  onClose: () => void;
  onSubmit: (amount: number, description: string) => Promise<void>;
}) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const value = Number(amount);
  const valid = !Number.isNaN(value) && value > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    await onSubmit(value, description);
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-sm p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 space-y-5 shadow-soft"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid place-items-center size-10 rounded-xl bg-primary/10 text-primary">
              <Wallet className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-semibold">Top Up Saldo</h2>
              <p className="text-xs text-muted-foreground">{user.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-xl border border-border bg-background px-4 py-3">
          <p className="text-xs text-muted-foreground">Saldo saat ini</p>
          <p className="font-semibold">{formatIDR(Number(user.balance ?? 0))}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount" className="text-sm">
            Jumlah (IDR)
          </Label>
          <Input
            id="amount"
            type="number"
            min="1"
            inputMode="numeric"
            placeholder="100000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
          />
          <div className="flex flex-wrap gap-1.5 pt-1">
            {[50000, 100000, 500000, 1000000].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setAmount(String(v))}
                className="text-xs px-2.5 h-8 rounded-lg border border-border hover:bg-muted transition-colors"
              >
                {formatIDR(v)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="desc" className="text-sm">
            Catatan <span className="text-muted-foreground font-normal">(opsional)</span>
          </Label>
          <Input
            id="desc"
            placeholder="Deposit transfer BCA"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" className="flex-1" disabled={!valid || saving} loading={saving}>
            Top Up
          </Button>
        </div>
      </form>
    </div>
  );
}
