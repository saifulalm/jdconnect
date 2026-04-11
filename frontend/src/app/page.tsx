"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark } from "@/components/brand-mark";
import { BRAND } from "@/lib/brand";
import { 
  ArrowRight, 
  Bolt, 
  CheckCircle2, 
  Clock, 
  Gamepad2, 
  Phone, 
  Shield, 
  Smartphone, 
  Zap, 
  Wifi,
  Globe,
  Wallet,
  ZapIcon
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen mesh-gradient font-sans selection:bg-primary/20 selection:text-foreground overflow-x-hidden">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-white/5 glass-dark">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <BrandMark />
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <Link href="#features" className="hover:text-primary transition-colors">Fitur</Link>
            <Link href="#products" className="hover:text-primary transition-colors">Produk</Link>
            <Link href="#h2h" className="hover:text-primary transition-colors">H2H API</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" className="hidden sm:flex" asChild>
              <Link href="/login">Masuk</Link>
            </Button>
            <Button className="shadow-glow" asChild>
              <Link href="/register">Daftar Sekarang</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative pt-20 pb-32 overflow-hidden">
          <div className="container mx-auto px-4 relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="text-center lg:text-left space-y-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary animate-in fade-in slide-in-from-bottom-4 duration-1000">
                  <Zap className="h-4 w-4 fill-primary" />
                  <span>{BRAND.tagline}</span>
                </div>
                
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] text-balance animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-200">
                  Platform Top-Up <br />
                  <span className="gradient-text">Generasi Baru</span>
                </h1>
                
                <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl mx-auto lg:mx-0 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
                  Nikmati pengalaman transaksi digital yang sinematik. Cepat, aman, dan tersedia 24/7 untuk semua kebutuhan gaya hidup digital Anda.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-500">
                  <Button size="xl" className="h-14 px-8 text-lg rounded-2xl shadow-glow" asChild>
                    <Link href="/register">
                      Mulai Transaksi <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                  <Button size="xl" variant="outline" className="h-14 px-8 text-lg rounded-2xl glass" asChild>
                    <Link href="#features">Pelajari Fitur</Link>
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-6 pt-10 border-t border-white/5 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-700">
                  <div>
                    <div className="text-2xl font-bold">99.9%</div>
                    <div className="text-sm text-muted-foreground">Uptime API</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">~3 Detik</div>
                    <div className="text-sm text-muted-foreground">Kecepatan Proses</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">24/7</div>
                    <div className="text-sm text-muted-foreground">Dukungan Sistem</div>
                  </div>
                </div>
              </div>

              <div className="relative lg:ml-auto animate-in fade-in zoom-in duration-1000 delay-300">
                <div className="absolute -inset-4 bg-primary/20 blur-3xl rounded-full opacity-50 animate-pulse" />
                <Card className="relative glass border-white/10 shadow-2xl rounded-[2.5rem] overflow-hidden animate-float">
                  <CardHeader className="p-8 pb-0">
                    <CardTitle className="text-3xl font-bold">Cek Harga</CardTitle>
                    <CardDescription className="text-lg">Simulasi transaksi instan kami</CardDescription>
                  </CardHeader>
                  <CardContent className="p-8 space-y-8">
                    <div className="space-y-3">
                      <Label htmlFor="phone-hero" className="text-base font-semibold">Nomor Telepon</Label>
                      <div className="relative group">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input 
                          id="phone-hero" 
                          placeholder="081234567890" 
                          className="h-14 pl-12 bg-black/20 border-white/5 rounded-2xl text-lg focus:ring-primary/50"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Label className="text-base font-semibold">Pilih Nominal</Label>
                      <div className="grid grid-cols-3 gap-3">
                        {["10K", "25K", "50K", "100K", "150K", "200K"].map((nom) => (
                          <div key={nom} className="relative group">
                            <input type="radio" name="nom-hero" id={`h-${nom}`} className="peer sr-only" />
                            <Label 
                              htmlFor={`h-${nom}`}
                              className="flex items-center justify-center h-14 rounded-2xl border border-white/5 bg-white/5 text-sm font-bold cursor-pointer hover:bg-white/10 peer-checked:bg-primary peer-checked:text-white peer-checked:border-primary transition-all duration-300 shadow-sm"
                            >
                              {nom}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button className="w-full h-16 text-lg font-bold rounded-2xl shadow-glow transition-transform active:scale-95" asChild>
                      <Link href="/login">Beli Sekarang</Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-24 bg-black/20">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
              <h2 className="text-sm font-bold tracking-widest text-primary uppercase">Mengapa Kami</h2>
              <p className="text-4xl md:text-5xl font-bold">Layanan Digital Tanpa Hambatan</p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Kami membangun infrastruktur yang kuat untuk memastikan setiap transaksi Anda berhasil dalam hitungan detik.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  title: "Kecepatan Cahaya",
                  desc: "Sistem otomasi kami memproses transaksi rata-rata di bawah 3 detik.",
                  icon: ZapIcon,
                  color: "text-amber-400"
                },
                {
                  title: "Keamanan Berlapis",
                  desc: "Enkripsi data end-to-end dan sistem deteksi fraud real-time.",
                  icon: Shield,
                  color: "text-blue-400"
                },
                {
                  title: "API H2H Handal",
                  desc: "Dokumentasi API lengkap dengan sistem request signing HMAC.",
                  icon: Globe,
                  color: "text-emerald-400"
                },
                {
                  title: "Metode Lengkap",
                  desc: "Mendukung berbagai pembayaran otomatis mulai dari VA hingga E-Wallet.",
                  icon: Wallet,
                  color: "text-purple-400"
                },
                {
                  title: "Smart Monitoring",
                  desc: "Pantau status transaksi Anda secara real-time dengan detail lengkap.",
                  icon: Clock,
                  color: "text-rose-400"
                },
                {
                  title: "Customer Support",
                  desc: "Tim bantuan yang siap melayani Anda kapanpun dibutuhkan.",
                  icon: CheckCircle2,
                  color: "text-cyan-400"
                }
              ].map((feature, i) => (
                <Card key={i} className="glass-dark border-white/5 hover:border-primary/50 transition-all duration-500 group rounded-[2rem] p-4">
                  <CardHeader>
                    <div className={`h-14 w-14 rounded-2xl bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500 ${feature.color}`}>
                      <feature.icon className="h-7 w-7" />
                    </div>
                    <CardTitle className="text-2xl font-bold">{feature.title}</CardTitle>
                    <CardDescription className="text-base text-muted-foreground mt-2 leading-relaxed">
                      {feature.desc}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* H2H API Preview */}
        <section id="h2h" className="py-24 relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] -z-10 opacity-30" />
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-8">
                <h2 className="text-4xl md:text-5xl font-bold leading-tight">
                  Solusi <span className="gradient-text">API H2H</span> untuk Bisnis Anda
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Integrasikan layanan kami ke dalam aplikasi atau website Anda dengan API yang aman, stabil, dan mudah digunakan.
                </p>
                <ul className="space-y-4">
                  {[
                    "Autentikasi API Key & HMAC Signature",
                    "IP Whitelisting untuk keamanan ekstra",
                    "Webhook Callback real-time",
                    "Rate limiting & Antrian cerdas"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 font-medium">
                      <CheckCircle2 className="h-6 w-6 text-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Button size="xl" variant="outline" className="h-14 px-8 rounded-2xl glass" asChild>
                  <Link href="/register">Daftar Developer</Link>
                </Button>
              </div>
              <div className="glass-dark border-white/10 rounded-3xl p-1 shadow-2xl overflow-hidden">
                <div className="bg-slate-950 p-6 font-mono text-sm overflow-x-auto">
                  <div className="flex gap-2 mb-4 border-b border-white/10 pb-4">
                    <div className="h-3 w-3 rounded-full bg-rose-500" />
                    <div className="h-3 w-3 rounded-full bg-amber-500" />
                    <div className="h-3 w-3 rounded-full bg-emerald-500" />
                  </div>
                  <pre className="text-emerald-400">
{`POST /api/h2h/transaction HTTP/1.1
Host: api.pulsa.id
Content-Type: application/json
x-api-key: pk_live_...
x-api-signature: hmac-sha256(...)

{
  "productId": "telkomsel-10k",
  "phoneNumber": "081234567890",
  "metadata": {
    "client_ref": "TX-001"
  }
}`}
                  </pre>
                  <div className="mt-6 border-t border-white/10 pt-4 text-slate-500">
                    {`// Respon Cepat < 100ms`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-20 border-t border-white/5 bg-black/40">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-12">
            <div className="space-y-6">
              <BrandMark />
              <p className="text-sm text-muted-foreground leading-relaxed">
                Platform distribusi produk digital terbaik di Indonesia. Memberikan layanan tercepat dan termudah untuk kebutuhan Anda.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-6">Produk</h4>
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-primary transition-colors">Pulsa All Operator</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Paket Data Internet</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Token Listrik PLN</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Top Up Game</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-6">Bantuan</h4>
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-primary transition-colors">Pusat Bantuan</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Syarat & Ketentuan</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Kebijakan Privasi</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Hubungi Kami</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-6">Media Sosial</h4>
              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-primary transition-colors cursor-pointer">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-primary transition-colors cursor-pointer">
                  <Globe className="h-5 w-5" />
                </div>
                <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-primary transition-colors cursor-pointer">
                  <Wifi className="h-5 w-5" />
                </div>
              </div>
            </div>
          </div>
          <div className="mt-20 pt-8 border-t border-white/5 text-center text-sm text-muted-foreground">
            © 2024 {BRAND.name}. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
