"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { apiUrl } from "@/lib/api";
import { 
  LayoutDashboard,
  CreditCard,
  History,
  Key,
  Settings,
  User, 
  Mail, 
  Phone, 
  Shield, 
  Moon, 
  Sun,
  Save,
  LogOut
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    notifications: true,
    darkMode: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      setUser(parsed);
      setFormData({
        name: parsed.name || "",
        email: parsed.email || "",
        phone: parsed.phone || "+62 812 3456 7890",
        notifications: true,
        darkMode: true,
      });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token || !user) return;

    setIsSaving(true);
    try {
      const response = await fetch(apiUrl(`/users/${user.id}`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
        }),
      });
      const data = await response.json();
      if (data.status === "success") {
        const updatedUser = { ...user, ...data.data };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setUser(updatedUser);
        alert("Pengaturan berhasil disimpan!");
      } else {
        alert(data.message || "Gagal menyimpan");
      }
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan saat menyimpan");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
  };

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-2xl mx-auto">
      <Card className="glass-dark border-white/5 rounded-[2.5rem] p-8 space-y-8">
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Informasi Profil</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit}>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Nama Lengkap
                    </Label>
                    <Input 
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="h-14 bg-white/5 border-white/5 rounded-2xl focus:ring-primary/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </Label>
                    <Input 
                      id="email"
                      type="email"
                      value={formData.email}
                      disabled
                      className="h-14 bg-white/5 border-white/5 rounded-2xl focus:ring-primary/50 opacity-75"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Nomor Telepon
                    </Label>
                    <Input 
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="h-14 bg-white/5 border-white/5 rounded-2xl focus:ring-primary/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Notifikasi Email
                    </Label>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">Terima update transaksi via email</span>
                      <Switch 
                        checked={formData.notifications}
                        onCheckedChange={(checked: boolean) => setFormData({ ...formData, notifications: checked })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Moon className="h-4 w-4" />
                      Mode Gelap
                    </Label>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">Aktifkan tema gelap untuk kenyamanan mata</span>
                      <Switch 
                        checked={formData.darkMode}
                        onCheckedChange={(checked: boolean) => setFormData({ ...formData, darkMode: checked })}
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <Button type="submit" disabled={isSaving} className="flex-1 h-14 rounded-2xl shadow-glow">
                      <Save className="mr-2 h-4 w-4" /> {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
                    </Button>
                    <Button type="button" variant="outline" className="flex-1 h-14 rounded-2xl" onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" /> Keluar
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
      </Card>
    </div>
  );
}
