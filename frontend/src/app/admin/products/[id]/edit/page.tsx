"use client";

import { isAdminRole } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { apiUrl } from "@/lib/api";
import { ArrowLeft, Loader2, Package, XCircle } from "lucide-react";

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  provider: string;
  denomination: number;
  price: number;
  stock: number;
  description?: string;
  imageUrl?: string;
  isActive?: boolean;
}

const categories = [
  { value: "pulsa", label: "Pulsa" },
  { value: "data", label: "Paket Data" },
  { value: "pln", label: "Token Listrik" },
  { value: "game", label: "Voucher Game" },
  { value: "ewallet", label: "E-Wallet" },
];

export default function AdminProductEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const productId = params?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    category: "",
    provider: "",
    denomination: "",
    price: "",
    stock: "",
    description: "",
    imageUrl: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    if (!token || !user) {
      router.push("/login");
      return;
    }
    const userData = JSON.parse(user);
    if (!isAdminRole(userData.role)) {
      router.push("/dashboard");
      return;
    }

    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(apiUrl(`/products/${productId}`), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const p: Product = await response.json();
        setFormData({
          sku: p.sku ?? "",
          name: p.name ?? "",
          category: p.category ?? "",
          provider: p.provider ?? "",
          denomination: String(p.denomination ?? ""),
          price: String(p.price ?? ""),
          stock: String(p.stock ?? ""),
          description: p.description ?? "",
          imageUrl: p.imageUrl ?? "",
        });
      } catch {
        setError("Gagal memuat detail produk.");
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchProduct();
    } else {
      setLoading(false);
      setError("Produk tidak ditemukan.");
    }
  }, [productId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }
      const response = await fetch(apiUrl(`/products/${productId}`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          denomination: Number(formData.denomination),
          price: Number(formData.price),
          stock: Number(formData.stock),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || "Gagal memperbarui produk");
      }

      router.push("/admin/products");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memperbarui produk");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen mesh-gradient flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground font-medium">Memuat produk...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen mesh-gradient font-sans selection:bg-primary/20 selection:text-foreground pb-12">
      <header className="sticky top-0 z-40 glass border-b border-border/60">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Button variant="ghost" size="icon" asChild className="mr-4 -ml-2">
            <Link href="/admin/products">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex items-center space-x-3">
            <div className="bg-primary/10 border border-primary/20 p-2 rounded-2xl hidden sm:block">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight">Edit Produk</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Perbarui detail produk</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {error && (
          <div className="mb-6 p-4 text-sm text-destructive bg-destructive/10 rounded-xl border border-destructive/20 flex items-start">
            <XCircle className="h-5 w-5 mr-3 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <Card className="glass border-border/60 rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-border/60 pb-6 pt-8 px-8">
            <CardTitle className="text-xl">Detail Produk</CardTitle>
            <CardDescription>Perbarui kolom yang diperlukan lalu simpan perubahan.</CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <form id="product-edit-form" onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="sku" className="text-sm font-medium">SKU / Kode Produk</Label>
                  <Input
                    id="sku"
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="h-11"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">Nama Produk</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="h-11"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-sm font-medium">Kategori</Label>
                  <div className="relative">
                    <select
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full pl-3 pr-10 h-11 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none"
                      required
                    >
                      <option value="">Pilih Kategori</option>
                      {categories.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="provider" className="text-sm font-medium">Provider</Label>
                  <Input
                    id="provider"
                    type="text"
                    value={formData.provider}
                    onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                    className="h-11"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 border-t border-border/60 pt-6">
                <div className="space-y-2">
                  <Label htmlFor="denomination" className="text-sm font-medium">Nominal/Nilai</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-muted-foreground text-sm">Rp</span>
                    <Input
                      id="denomination"
                      type="number"
                      value={formData.denomination}
                      onChange={(e) => setFormData({ ...formData, denomination: e.target.value })}
                      className="pl-9 h-11"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price" className="text-sm font-medium">Harga Jual</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-muted-foreground text-sm">Rp</span>
                    <Input
                      id="price"
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="pl-9 h-11"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 border-t border-border/60 pt-6">
                <div className="space-y-2">
                  <Label htmlFor="stock" className="text-sm font-medium">Stok Tersedia</Label>
                  <Input
                    id="stock"
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imageUrl" className="text-sm font-medium">URL Gambar Produk</Label>
                  <Input
                    id="imageUrl"
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    className="h-11"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Label htmlFor="description" className="text-sm font-medium">Deskripsi Singkat</Label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full min-h-[100px] p-3 rounded-xl bg-input border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary resize-y text-sm"
                />
              </div>
            </form>
          </CardContent>
          <CardFooter className="px-8 py-6 bg-card/20 border-t border-border/60 flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={() => router.back()} className="h-11 px-6 rounded-xl">
              Batal
            </Button>
            <Button type="submit" form="product-edit-form" className="h-11 px-8 rounded-xl" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan Perubahan"
              )}
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}

