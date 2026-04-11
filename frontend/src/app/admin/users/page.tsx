"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiUrl } from "@/lib/api";
import { ArrowLeft, Loader2, Users } from "lucide-react";

type AdminUser = {
  id: string | number;
  name: string;
  email: string;
  transactions?: number;
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    if (!token || !user) {
      router.push("/login");
      return;
    }
    const userData = JSON.parse(user);
    if (userData.role !== "admin") {
      router.push("/dashboard");
      return;
    }

    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(apiUrl("/admin/users"), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setUsers(Array.isArray(data) ? data : data.users || []);
      } catch {
        setError("Gagal memuat data pengguna.");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [router]);

  return (
    <div className="min-h-screen mesh-gradient font-sans selection:bg-primary/20 selection:text-foreground pb-12">
      <header className="sticky top-0 z-40 glass border-b border-border/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild className="-ml-2">
              <Link href="/admin">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-2xl bg-primary/10 border border-primary/20 grid place-items-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold leading-tight">Pengguna</h1>
                <p className="text-xs text-muted-foreground">Daftar pengguna (admin)</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground font-medium">Memuat data pengguna...</p>
          </div>
        ) : error ? (
          <Card className="glass border-border/60 rounded-2xl">
            <CardContent className="p-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : (
          <Card className="glass border-border/60 rounded-2xl overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Daftar Pengguna</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b border-border/60">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Nama</th>
                      <th className="px-6 py-4 font-semibold">Email</th>
                      <th className="px-6 py-4 font-semibold text-right">Transaksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-6 py-10 text-center text-muted-foreground">
                          Tidak ada data pengguna.
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => (
                        <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-4 font-medium">{u.name}</td>
                          <td className="px-6 py-4 text-muted-foreground">{u.email}</td>
                          <td className="px-6 py-4 text-right text-muted-foreground">
                            {u.transactions ?? "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

