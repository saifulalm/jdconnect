"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark } from "@/components/brand-mark";
import { apiUrl } from "@/lib/api";
import { 
  Key, 
  Copy, 
  RefreshCw, 
  ShieldCheck, 
  Globe, 
  Code, 
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  LayoutDashboard,
  CreditCard,
  History,
  Settings,
  LogOut,
  User as UserIcon,
  Search,
  Bell,
  Eye,
  EyeOff
} from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  apiKey?: string;
  apiSecret?: string;
  ipWhitelist?: string;
}

export default function ApiManagementPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [ipWhitelist, setIpWhitelist] = useState("");
  const [isUpdatingIp, setIsUpdatingIp] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    fetchProfile();
  }, [router]);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(apiUrl("/users/profile"), {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setUser(data.data);
        setIpWhitelist(data.data.ipWhitelist || "");
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateKeys = async () => {
    setIsGenerating(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(apiUrl("/users/api-keys"), {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        fetchProfile();
      }
    } catch (error) {
      console.error("Failed to generate keys:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const updateIpWhitelist = async () => {
    setIsUpdatingIp(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(apiUrl(`/users/${user?.id}`), {
        method: "PATCH",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ ipWhitelist })
      });
      if (response.ok) {
        alert("IP Whitelist diperbarui!");
      }
    } catch (error) {
      console.error("Failed to update IP whitelist:", error);
    } finally {
      setIsUpdatingIp(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    alert(`${label} disalin ke clipboard!`);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen mesh-gradient flex items-center justify-center">
        <Key className="h-10 w-10 text-primary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-5xl mx-auto">
          {/* Hero Card */}
          <Card className="glass-dark border-white/5 rounded-[2.5rem] p-10 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-10">
              <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 group-hover:scale-110 transition-transform duration-500">
                <Code className="h-10 w-10" />
              </div>
            </div>
            <div className="relative z-10 space-y-6 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary uppercase tracking-widest">
                Developer Mode
              </div>
              <h2 className="text-4xl font-bold tracking-tight leading-tight">Integrasikan Bisnis Anda dengan <span className="gradient-text">API Handal</span></h2>
              <p className="text-lg text-slate-400 leading-relaxed">
                Gunakan kredensial API Anda untuk mengakses layanan top-up secara otomatis. Pastikan untuk menjaga kerahasiaan API Secret Anda.
              </p>
            </div>
          </Card>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* API Credentials */}
              <Card className="glass-dark border-white/5 rounded-[2.5rem] p-8 space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-500">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-bold">Kredensial API</h3>
                  </div>
                  <Button 
                    onClick={generateKeys} 
                    disabled={isGenerating}
                    variant="outline" 
                    className="rounded-2xl border-white/5 bg-white/5 hover:bg-white/10"
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
                    {user.apiKey ? 'Regenerasi Key' : 'Generate Key'}
                  </Button>
                </div>

                {!user.apiKey ? (
                  <div className="py-12 flex flex-col items-center text-center space-y-4 bg-black/20 rounded-3xl border border-dashed border-white/10">
                    <Key className="h-12 w-12 text-slate-600" />
                    <p className="text-slate-500 max-w-xs">Anda belum memiliki API Key. Klik tombol di atas untuk membuat kredensial pertama Anda.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">API Key (Public)</Label>
                      <div className="flex gap-2">
                        <Input 
                          readOnly 
                          value={user.apiKey} 
                          className="h-14 bg-black/20 border-white/5 rounded-2xl font-mono text-sm"
                        />
                        <Button 
                          onClick={() => copyToClipboard(user.apiKey!, "API Key")}
                          className="h-14 w-14 rounded-2xl bg-white/5 border-white/5 hover:bg-white/10"
                          variant="ghost"
                        >
                          <Copy className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">API Secret (Private)</Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input 
                            type={showSecret ? "text" : "password"}
                            readOnly 
                            value={user.apiSecret} 
                            className="h-14 bg-black/20 border-white/5 rounded-2xl font-mono text-sm pr-14"
                          />
                          <button 
                            onClick={() => setShowSecret(!showSecret)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                          >
                            {showSecret ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                        <Button 
                          onClick={() => copyToClipboard(user.apiSecret!, "API Secret")}
                          className="h-14 w-14 rounded-2xl bg-white/5 border-white/5 hover:bg-white/10"
                          variant="ghost"
                        >
                          <Copy className="h-5 w-5" />
                        </Button>
                      </div>
                      <p className="text-[10px] text-rose-400 font-medium">Jangan pernah membagikan API Secret kepada siapapun!</p>
                    </div>
                  </div>
                )}
              </Card>

              {/* IP Whitelist */}
              <Card className="glass-dark border-white/5 rounded-[2.5rem] p-8 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <Globe className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">IP Whitelist</h3>
                    <p className="text-sm text-slate-500">Batasi akses API hanya dari IP server Anda.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <Input 
                    placeholder="Contoh: 1.2.3.4, 5.6.7.8"
                    value={ipWhitelist}
                    onChange={(e) => setIpWhitelist(e.target.value)}
                    className="h-14 bg-black/20 border-white/5 rounded-2xl"
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500">Gunakan koma (,) untuk memisahkan beberapa alamat IP.</p>
                    <Button 
                      onClick={updateIpWhitelist}
                      disabled={isUpdatingIp}
                      className="rounded-xl shadow-glow"
                    >
                      {isUpdatingIp ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Simpan Perubahan"}
                    </Button>
                  </div>
                </div>
              </Card>
            </div>

            <div className="space-y-8">
              {/* Documentation Quick Links */}
              <Card className="glass-dark border-white/5 rounded-[2.5rem] p-8 space-y-6">
                <h3 className="text-lg font-bold">Panduan Integrasi</h3>
                <div className="space-y-3">
                  {[
                    { title: "Autentikasi Signature", icon: ShieldCheck },
                    { title: "Daftar Endpoint", icon: Code },
                    { title: "Contoh Request Node.js", icon: Code },
                    { title: "Handling Callback", icon: Globe },
                  ].map((item, i) => (
                    <button key={i} className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-primary/50 transition-all group">
                      <div className="flex items-center gap-3">
                        <item.icon className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">{item.title}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-white transition-colors" />
                    </button>
                  ))}
                </div>
              </Card>

              {/* API Status */}
              <Card className="glass-dark border-white/5 rounded-[2.5rem] p-8 space-y-6">
                <h3 className="text-lg font-bold">Status Layanan</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Production API</span>
                    <div className="flex items-center gap-2 text-emerald-500 text-[10px] font-bold bg-emerald-500/10 px-3 py-1 rounded-full">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      OPERATIONAL
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Transaction Engine</span>
                    <div className="flex items-center gap-2 text-emerald-500 text-[10px] font-bold bg-emerald-500/10 px-3 py-1 rounded-full">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      OPERATIONAL
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
    </div>
  );
}
