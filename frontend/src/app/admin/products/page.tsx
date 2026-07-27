"use client";

import { isAdminRole } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { apiUrl } from "@/lib/api";
import { 
  Zap, 
  Plus, 
  Trash2, 
  Edit, 
  Search, 
  ArrowLeft,
  CheckCircle,
  XCircle,
  Loader2,
  Package,
  ChevronLeft,
  ChevronRight,
  Filter
} from "lucide-react";

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  provider: string;
  denomination: number;
  price: number;
  stock: number;
  isActive: boolean;
  description?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface PaginatedResponse {
  data: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function AdminProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [limit] = useState(10);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);

  const categories = [
    { value: "pulsa", label: "Pulsa" },
    { value: "data", label: "Paket Data" },
    { value: "pln", label: "Token Listrik" },
    { value: "game", label: "Voucher Game" },
    { value: "ewallet", label: "E-Wallet" },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

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
    }
  }, [router]);

  useEffect(() => {
    fetchProducts();
  }, [searchTerm, selectedCategory, page]);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(selectedCategory && { category: selectedCategory }),
      });

      // Server-side pagination/search: the API applies page, limit, search
      // and category, and reports the true total.
      const response = await fetch(apiUrl(`/products/admin/list?${params.toString()}`), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const raw = await response.json();
      const items: Product[] = Array.isArray(raw) ? raw : raw.data || [];

      setProducts(items);
      setTotalPages(raw.totalPages ?? 1);
      setTotalItems(raw.total ?? items.length);

      // Clamp if the current page fell past the end (e.g. after deleting).
      if (raw.totalPages && page > raw.totalPages) setPage(raw.totalPages);
    } catch (err) {
      console.error("Error fetching products:", err);
      setError("Gagal memuat data produk. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategory(e.target.value === "" ? null : e.target.value);
    setPage(1);
  };

  const handlePreviousPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    setDeleteProductId(productId);
    setIsDeleting(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }
      const response = await fetch(
        apiUrl(`/products/${productId}`),
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setProducts(products.filter((p) => p.id !== productId));
      setDeleteProductId(null);
      setIsDeleting(false);
    } catch (err) {
      console.error("Error deleting product:", err);
      setError("Gagal menghapus produk. Silakan coba lagi.");
      setIsDeleting(false);
    }
  };

  if (loading && products.length === 0) {
    return (
      <div className="min-h-screen mesh-gradient flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground font-medium">Memuat data produk...</p>
        </div>
      </div>
    );
  }

  if (error && products.length === 0) {
    return (
      <div className="min-h-screen mesh-gradient flex items-center justify-center p-6">
        <Card className="w-full max-w-md glass border-border/60 rounded-2xl">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-destructive/10 border border-destructive/20 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Terjadi Kesalahan</h3>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => fetchProducts()} className="w-full" size="lg">
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen mesh-gradient font-sans selection:bg-primary/20 selection:text-foreground">
      <header className="sticky top-0 z-40 glass border-b border-border/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" asChild className="-ml-2">
              <Link href="/admin">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex items-center space-x-3">
              <div className="bg-primary/10 border border-primary/20 p-2 rounded-2xl hidden sm:block">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold leading-tight">Manajemen Produk</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">Kelola katalog produk JDConnect</p>
              </div>
            </div>
          </div>
          <Button asChild>
            <Link href="/admin/products/create">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Tambah Produk</span>
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Filters Section */}
        <div className="glass p-4 sm:p-6 rounded-2xl border border-border/60 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Pencarian</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  id="search"
                  type="text"
                  placeholder="Cari nama, SKU, atau provider..."
                  value={searchTerm}
                  onChange={handleSearch}
                  className="pl-10 h-11"
                />
              </div>
            </div>
            <div className="sm:w-64">
              <Label htmlFor="category" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Filter Kategori</Label>
              <div className="relative">
                <Filter className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <select
                  id="category"
                  value={selectedCategory ?? ""}
                  onChange={handleCategoryChange}
                  className="w-full pl-10 pr-10 h-11 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none"
                >
                  <option value="">Semua Kategori</option>
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
          </div>
        </div>

        {/* Data Table */}
        <Card className="glass border-border/60 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b border-border/60">
                <tr>
                  <th className="px-6 py-4 font-semibold">Produk</th>
                  <th className="px-6 py-4 font-semibold">SKU / Provider</th>
                  <th className="px-6 py-4 font-semibold">Harga</th>
                  <th className="px-6 py-4 font-semibold">Stok</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <Package className="h-12 w-12 text-primary mb-3" />
                        <p className="text-base font-medium text-foreground mb-1">Tidak ada produk ditemukan</p>
                        <p className="text-sm">Coba sesuaikan filter atau kata kunci pencarian Anda.</p>
                        {(searchTerm || selectedCategory) && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-4 rounded-full"
                            onClick={() => { setSearchTerm(""); setSelectedCategory(null); }}
                          >
                            Reset Filter
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={product.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">{product.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{product.category.toUpperCase().replace("_", " ")}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-foreground">{product.sku}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{product.provider}</div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-foreground">
                        {formatCurrency(product.price)}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {product.stock.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide uppercase border ${
                          product.isActive ? 'bg-success/10 text-success border-success/20' : 'bg-muted/30 text-muted-foreground border-border/60'
                        }`}>
                          {product.isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-xl hover:text-primary hover:bg-primary/10"
                            onClick={() => router.push(`/admin/products/${product.id}/edit`)}
                            title="Edit Produk"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-xl hover:text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              if (window.confirm(`Hapus produk ${product.name}?`)) {
                                handleDeleteProduct(product.id);
                              }
                            }}
                            disabled={isDeleting && deleteProductId === product.id}
                            title="Hapus Produk"
                          >
                            {isDeleting && deleteProductId === product.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 0 && (
            <div className="px-6 py-4 border-t border-border/60 bg-card/20 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Menampilkan <span className="font-medium text-foreground">{products.length}</span> dari <span className="font-medium text-foreground">{totalItems}</span> data
              </span>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={page === 1 || loading}
                  className="h-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium text-muted-foreground px-2">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={page === totalPages || loading}
                  className="h-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
