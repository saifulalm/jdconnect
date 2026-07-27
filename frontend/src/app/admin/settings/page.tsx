"use client";

import { isAdminRole } from "@/lib/utils";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Settings } from "lucide-react";

export default function AdminSettingsPage() {
  const router = useRouter();

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

  return (
    <div className="min-h-screen mesh-gradient font-sans selection:bg-primary/20 selection:text-foreground pb-12">
      <header className="sticky top-0 z-40 glass border-b border-border/60">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Button variant="ghost" size="icon" asChild className="mr-4 -ml-2">
            <Link href="/admin">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-primary/10 border border-primary/20 grid place-items-center">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight">Pengaturan</h1>
              <p className="text-xs text-muted-foreground">Konfigurasi sistem</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="glass border-border/60 rounded-2xl overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Segera hadir</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground leading-relaxed">
            Halaman pengaturan belum terhubung ke konfigurasi backend. Navigasi tetap tersedia agar tidak 404.
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

