"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, BarChart3, Clock, DollarSign, PieChart, RefreshCw } from "lucide-react";

const sampleData = [
  { name: "Jan", revenue: 4000, trx: 240 },
  { name: "Feb", revenue: 3000, trx: 180 },
  { name: "Mar", revenue: 5200, trx: 310 },
  { name: "Apr", revenue: 2780, trx: 210 },
  { name: "May", revenue: 3890, trx: 260 },
  { name: "Jun", revenue: 4390, trx: 295 },
];

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(sampleData);

  const refreshData = async () => {
    setLoading(true);
    setTimeout(() => {
      setData(sampleData);
      setLoading(false);
    }, 500);
  };

  return (
    <div className="p-6 sm:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Analytics & Laporan</h1>
          <p className="text-sm text-muted-foreground">Ringkasan performa transaksi dan pendapatan.</p>
        </div>
        <Button onClick={refreshData} disabled={loading} className="rounded-2xl shadow-glow">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="glass-dark border-white/5 rounded-[2.5rem] p-8 group">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Revenue</p>
              <p className="text-3xl font-bold text-primary">Rp 45,2jt</p>
            </div>
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 group-hover:scale-110 transition-transform">
              <DollarSign className="h-7 w-7" />
            </div>
          </div>
        </Card>

        <Card className="glass-dark border-white/5 rounded-[2.5rem] p-8 group">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Transaksi</p>
              <p className="text-3xl font-bold text-emerald-500">1.247</p>
            </div>
            <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20 group-hover:scale-110 transition-transform">
              <Activity className="h-7 w-7" />
            </div>
          </div>
        </Card>

        <Card className="glass-dark border-white/5 rounded-[2.5rem] p-8 group">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Avg Time</p>
              <p className="text-3xl font-bold text-violet-500">2,3s</p>
            </div>
            <div className="h-14 w-14 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-500 border border-violet-500/20 group-hover:scale-110 transition-transform">
              <Clock className="h-7 w-7" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <Card className="glass-dark border-white/5 rounded-[2.5rem] lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Trend Bulanan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-96 min-h-[24rem]">
              <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="name" stroke="#94A3B8" />
                <YAxis stroke="#94A3B8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0F172A",
                    border: "1px solid #1E293B",
                    borderRadius: "12px",
                  }}
                  labelStyle={{ color: "#F8FAFC" }}
                  itemStyle={{ color: "#F8FAFC" }}
                />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="trx" stroke="#10B981" strokeWidth={3} dot={false} />
              </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-dark border-white/5 rounded-[2.5rem]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Distribusi Produk
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "Pulsa", value: 45, color: "#3B82F6" },
              { label: "Data", value: 30, color: "#10B981" },
              { label: "PLN", value: 15, color: "#F59E0B" },
              { label: "Game", value: 10, color: "#8B5CF6" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                <span className="text-sm font-bold text-primary">{item.value}%</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
