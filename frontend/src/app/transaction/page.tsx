"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiUrl } from "@/lib/api";
import { 
  Smartphone, 
  CreditCard, 
  Zap, 
  Loader2, 
  CheckCircle2,
  ChevronLeft,
  ArrowLeft
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  sku: string;
  provider: string;
  denomination: number;
  price: number;
  category: string;
}

interface TransactionResponse {
  status: string;
  message?: string;
  data: {
    invoiceNumber: string;
    status: string;
    phoneNumber: string;
    price: number;
  };
}

export default function TransactionPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    productId: "",
    phoneNumber: "",
    quantity: 1,
    notes: "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }
      const response = await fetch(apiUrl("/products"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setProducts(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      setError("Gagal memuat produk. Pastikan backend berjalan.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(apiUrl("/transactions"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data: TransactionResponse = await response.json();

      if (response.ok && data.status === "success") {
        alert(`Transaksi berhasil! Invoice: ${data.data.invoiceNumber}`);
        router.push("/transactions");
      } else {
        setError(data.message || "Transaksi gagal. Cek saldo atau stok produk.");
      }
    } catch (err) {
      setError("Koneksi error. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <Button variant="ghost" className="rounded-xl" asChild>
          <Link href="/dashboard">
            <ChevronLeft className="mr-2 h-5 w-5" />
            Kembali
          </Link>
        </Button>
      </div>

      <Card className="glass-dark border-white/5 rounded-[2.5rem] overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10 p-8">
          <CardTitle className="text-3xl font-bold flex items-center gap-3">
            <CreditCard className="h-10 w-10" />
            Buat Transaksi Baru
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 mb-6">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <Label className="flex items-center gap-2 font-bold">
                  <Smartphone className="h-5 w-5" />
                  Pilih Produk
                </Label>
                <Select value={formData.productId} onValueChange={(value: string) => setFormData({ ...formData, productId: value })}>
                  <SelectTrigger className="h-14 rounded-2xl bg-white/5 border-white/5">
                    <SelectValue placeholder="Pilih produk..." />
                  </SelectTrigger>
                  <SelectContent className="bg-surface border-white/5 rounded-2xl">
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id} className="hover:bg-white/5">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                            {product.provider.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold">{product.name}</div>
                            <div className="text-xs text-slate-500">{product.sku}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <Label className="flex items-center gap-2 font-bold">
                  <Zap className="h-5 w-5" />
                  Nomor Tujuan
                </Label>
                <Input
                  placeholder="081234567890"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="h-14 rounded-2xl bg-white/5 border-white/5 focus:ring-primary/50 text-lg"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <Label className="flex items-center gap-2 font-bold">Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                  className="h-14 rounded-2xl bg-white/5 border-white/5 focus:ring-primary/50"
                />
              </div>
              <div className="space-y-4">
                <Label className="flex items-center gap-2 font-bold">Catatan (Opsional)</Label>
                <Input
                  placeholder="Pesan khusus..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="h-14 rounded-2xl bg-white/5 border-white/5 focus:ring-primary/50"
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="button" variant="outline" className="flex-1 h-16 rounded-3xl shadow-glow" onClick={() => router.back()}>
                <ChevronLeft className="mr-2 h-5 w-5" />
                Batal
              </Button>
              <Button
                type="submit"
                disabled={submitting || !formData.productId || !formData.phoneNumber}
                className="flex-1 h-16 rounded-3xl shadow-glow bg-gradient-to-r from-primary to-secondary text-xl font-bold"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    Bayar Sekarang
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
