"use client";

export const dynamic = "force-dynamic";

import { isAdminRole } from "@/lib/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Loader2,
  RefreshCw,
  ArrowLeft,
  CalendarDays,
  CalendarRange,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand-mark";
import { apiUrl, formatIDR } from "@/lib/api";

interface RevenuePoint {
  month: string;
  revenue: number;
  count: number;
}

interface Revenue {
  today: number;
  week: number;
  month: number;
  year: number;
  series: RevenuePoint[];
}

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

// Tokens are hex — read resolved values so charts follow the active theme.
function useChartColors() {
  const [colors, setColors] = useState({
    primary: "#4f46e5",
    border: "#e6e6ea",
    muted: "#6b7280",
    card: "#ffffff",
  });
  useEffect(() => {
    const read = () => {
      const s = getComputedStyle(document.documentElement);
      const v = (n: string, f: string) => s.getPropertyValue(n).trim() || f;
      setColors({
        primary: v("--primary", "#4f46e5"),
        border: v("--border", "#e6e6ea"),
        muted: v("--muted-foreground", "#6b7280"),
        card: v("--card", "#ffffff"),
      });
    };
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return colors;
}

export default function AdminReportsPage() {
  const router = useRouter();
  const colors = useChartColors();
  const [revenue, setRevenue] = useState<Revenue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(apiUrl("/admin/revenue"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) {
        router.push("/login");
        return;
      }
      if (!res.ok) throw new Error();
      setRevenue(await res.json());
    } catch {
      setError("Gagal memuat data omzet.");
    } finally {
      setLoading(false);
    }
  }, [router]);

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

  const chartData = useMemo(
    () =>
      (revenue?.series ?? []).map((p) => {
        const [, m] = p.month.split("-");
        return { ...p, label: MONTH_LABELS[Number(m) - 1] ?? p.month };
      }),
    [revenue],
  );

  const hasData = chartData.some((p) => p.revenue > 0);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

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

      <main className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Laporan Omzet</h1>
            <p className="text-sm text-muted-foreground">
              Dihitung dari transaksi berstatus sukses.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4" /> Muat Ulang
          </Button>
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2.5">
            {error}
          </p>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Tile icon={CalendarDays} label="Hari Ini" value={formatIDR(revenue?.today ?? 0)} />
          <Tile icon={CalendarRange} label="Minggu Ini" value={formatIDR(revenue?.week ?? 0)} />
          <Tile icon={Calendar} label="Bulan Ini" value={formatIDR(revenue?.month ?? 0)} />
          <Tile icon={TrendingUp} label="Tahun Ini" value={formatIDR(revenue?.year ?? 0)} />
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <h2 className="font-semibold text-sm">Omzet 6 Bulan Terakhir</h2>
          {!hasData ? (
            <div className="h-56 grid place-items-center text-center px-4">
              <p className="text-sm text-muted-foreground">
                Belum ada transaksi sukses pada periode ini.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke={colors.muted}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke={colors.muted}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) =>
                    v >= 1_000_000
                      ? `${Math.round(v / 100_000) / 10}jt`
                      : v >= 1000
                        ? `${Math.round(v / 1000)}rb`
                        : String(v)
                  }
                />
                <Tooltip
                  formatter={(v, name) =>
                    name === "revenue" ? formatIDR(Number(v)) : `${v} transaksi`
                  }
                  contentStyle={{
                    background: colors.card,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="revenue" fill={colors.primary} radius={[8, 8, 0, 0]} name="revenue" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider border-b border-border">
                  <th className="px-5 py-3.5 font-medium">Bulan</th>
                  <th className="px-5 py-3.5 font-medium text-right">Transaksi Sukses</th>
                  <th className="px-5 py-3.5 font-medium text-right">Omzet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {chartData.map((p) => (
                  <tr key={p.month} className="hover:bg-muted/50 transition-colors">
                    <td className="px-5 py-3.5">{p.label}</td>
                    <td className="px-5 py-3.5 text-right">{p.count}</td>
                    <td className="px-5 py-3.5 text-right font-medium">{formatIDR(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

function Tile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <span className="grid place-items-center size-9 rounded-xl bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="text-lg font-semibold tracking-tight">{value}</p>
    </div>
  );
}
