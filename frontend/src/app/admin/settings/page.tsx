"use client";

import { isAdminRole } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Percent,
  CreditCard,
  Truck,
  ArrowLeft,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark } from "@/components/brand-mark";
import { apiUrl, formatIDR, type PaymentConfig } from "@/lib/api";

interface SupplierInfo {
  driver: string;
  balance: number;
  currency: string;
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [taxRate, setTaxRate] = useState("11");
  const [savedRate, setSavedRate] = useState("11");
  const [payment, setPayment] = useState<PaymentConfig | null>(null);
  const [supplier, setSupplier] = useState<SupplierInfo | null>(null);
  const [supplierError, setSupplierError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const authHeaders = useCallback((): HeadersInit => {
    const token = localStorage.getItem("token");
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [taxRes, payRes] = await Promise.all([
        fetch(apiUrl("/tax/rate"), { headers: authHeaders() }),
        fetch(apiUrl("/payment/config")),
      ]);
      if (taxRes.ok) {
        const t = await taxRes.json();
        setTaxRate(String(t.rate));
        setSavedRate(String(t.rate));
      }
      if (payRes.ok) setPayment(await payRes.json());

      // Supplier balance can fail (upstream down) — surface it, don't block.
      const supRes = await fetch(apiUrl("/supplier/balance"), { headers: authHeaders() });
      if (supRes.ok) {
        setSupplier(await supRes.json());
        setSupplierError(null);
      } else {
        setSupplierError("Saldo supplier tidak dapat diambil.");
      }
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    if (!token || !userData) {
      router.push("/login");
      return;
    }
    try {
      if (!isAdminRole(JSON.parse(userData).role)) {
        router.push("/dashboard");
        return;
      }
    } catch {
      router.push("/login");
      return;
    }
    load();
  }, [router, load]);

  async function saveTax() {
    const rate = Number(taxRate);
    if (Number.isNaN(rate) || rate < 0 || rate > 100) {
      setNotice({ ok: false, text: "Tarif pajak harus 0-100." });
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch(apiUrl("/tax/rate"), {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ rate }),
      });
      if (res.ok) {
        setSavedRate(String(rate));
        setNotice({ ok: true, text: `Tarif pajak disimpan: ${rate}%.` });
      } else {
        setNotice({ ok: false, text: "Gagal menyimpan tarif pajak." });
      }
    } catch {
      setNotice({ ok: false, text: "Tidak dapat terhubung ke server." });
    } finally {
      setSaving(false);
    }
  }

  async function syncPriceList() {
    setSyncing(true);
    setNotice(null);
    try {
      const res = await fetch(apiUrl("/supplier/sync"), {
        method: "POST",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (res.ok) {
        setNotice({
          ok: true,
          text: `Sinkron selesai: ${data.synced} produk dari ${data.driver}.`,
        });
      } else {
        setNotice({ ok: false, text: data?.message || "Sinkron harga gagal." });
      }
    } catch {
      setNotice({ ok: false, text: "Tidak dapat terhubung ke supplier." });
    } finally {
      setSyncing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const gatewayLabel =
    payment?.gateway === "midtrans"
      ? "Midtrans (live/sandbox)"
      : payment?.gateway === "qris"
        ? "QRIS statis (konfirmasi manual)"
        : "Mock (demo lokal)";

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

      <main className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Pengaturan Sistem</h1>
          <p className="text-sm text-muted-foreground">
            Pajak, payment gateway, dan supplier H2H.
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

        {/* Tax */}
        <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <span className="grid place-items-center size-10 rounded-xl bg-primary/10 text-primary">
              <Percent className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-semibold">Tarif Pajak (PPN)</h2>
              <p className="text-xs text-muted-foreground">
                Dipakai saat menghitung total transaksi baru.
              </p>
            </div>
          </div>
          <div className="grid sm:grid-cols-[200px_auto] gap-3 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="rate" className="text-xs text-muted-foreground">
                Tarif (%)
              </Label>
              <Input
                id="rate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
              />
            </div>
            <Button onClick={saveTax} disabled={saving || taxRate === savedRate} loading={saving}>
              <Save className="h-4 w-4" /> Simpan
            </Button>
          </div>
        </section>

        {/* Payment gateway */}
        <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <span className="grid place-items-center size-10 rounded-xl bg-primary/10 text-primary">
              <CreditCard className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-semibold">Payment Gateway</h2>
              <p className="text-xs text-muted-foreground">Dikonfigurasi lewat environment.</p>
            </div>
          </div>
          <dl className="grid sm:grid-cols-2 gap-3 text-sm">
            <InfoRow label="Driver aktif" value={gatewayLabel} />
            <InfoRow
              label="Client key"
              value={payment?.clientKey ? "Terpasang" : "Kosong"}
              tone={payment?.clientKey ? "ok" : "warn"}
            />
          </dl>
          <p className="text-xs text-muted-foreground">
            Isi <code className="font-mono">MIDTRANS_SERVER_KEY</code> untuk gateway penuh, atau{" "}
            <code className="font-mono">QRIS_STATIC_CODE</code> untuk QRIS mandiri.
          </p>
        </section>

        {/* Supplier */}
        <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid place-items-center size-10 rounded-xl bg-primary/10 text-primary">
                <Truck className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-semibold">Supplier H2H</h2>
                <p className="text-xs text-muted-foreground">
                  Sumber stok dan harga modal produk.
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={load}>
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
          </div>

          {supplierError ? (
            <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2.5">
              {supplierError}
            </p>
          ) : (
            <dl className="grid sm:grid-cols-2 gap-3 text-sm">
              <InfoRow label="Driver aktif" value={supplier?.driver ?? "-"} />
              <InfoRow
                label="Saldo deposit"
                value={supplier ? formatIDR(supplier.balance) : "-"}
                icon={<Wallet className="h-3.5 w-3.5" />}
              />
            </dl>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border">
            <Button onClick={syncPriceList} disabled={syncing} loading={syncing}>
              <RefreshCw className="h-4 w-4" /> Sinkron Harga Produk
            </Button>
            <p className="text-xs text-muted-foreground">
              Menarik price list supplier dan memperbarui katalog (markup dari{" "}
              <code className="font-mono">SUPPLIER_MARKUP_PERCENT</code>).
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

function InfoRow({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn";
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-background px-4 py-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={`text-sm font-medium mt-0.5 inline-flex items-center gap-1.5 capitalize ${
          tone === "warn" ? "text-warning" : tone === "ok" ? "text-success" : ""
        }`}
      >
        {icon}
        {value}
      </dd>
    </div>
  );
}
