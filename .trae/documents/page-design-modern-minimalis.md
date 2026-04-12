# Spesifikasi Desain Halaman (Desktop-first) — Modern Minimalis Profesional

## Global Styles (Design Tokens)
- Layout: container 1200–1280px; grid 12 kolom; spacing scale 4/8/12/16/24/32.
- Warna: background "slate-950"; surface "slate-900/50" (glass); border "white/5"; primary "blue/violet" gradien; danger "rose".
- Tipografi: Inter/system; H1 48–64, H2 28–36, body 14–16; angka (saldo) 32–40.
- Komponen: Card radius 24–40px; Button radius 16–24px; Input tinggi 44–56px.
- Interaksi: hover = naik 1–2px + border lebih terang; focus ring = primary/50; loading skeleton/spinner minimal.

## 1) Home (/)
**Meta**: Title "JDConnect — Platform Top-Up"; Description ringkas; OG image logo.
**Layout**: stacked sections; hero 2 kolom (copy + simulator card).
**Komponen**: Sticky header (Brand + anchor link) + CTA login/register; hero card "Cek Harga" (readonly untuk publik); section feature grid 3 kolom.

## 2) Login (/login) & Register (/register)
**Meta**: Title "Masuk" / "Daftar".
**Layout**: center card (max 420–480px) + background mesh.
**Komponen**: form field jelas + error inline; tombol primary full-width; link ke halaman pasangan; setelah sukses redirect ke /dashboard atau /admin.

## 3) App Shell (Area Pengguna)
**Layout**: Sidebar fixed (desktop) + Navbar sticky; konten scroll.
**Menu**: Dashboard, Transaksi, Riwayat, Analytics, API H2H, Pengaturan.
**State**: active menu highlight gradien; logout selalu tersedia; tampilkan nama+email real dari profile.

## 4) Dashboard Pengguna (/dashboard)
**Meta**: Title "Dashboard".
**Struktur**: (A) 3 stat card (saldo, total transaksi, status akun) (B) tabs kategori (C) grid produk.
**Sinkronisasi UI**: grid produk pakai data dari API /products; search/filter di navbar memfilter produk.

## 5) Buat Transaksi (/transaction)
**Meta**: Title "Buat Transaksi".
**Layout**: form 2 kolom; ringkasan harga (opsional) di sisi kanan.
**Komponen**: Select produk (searchable), input nomor, qty, catatan; state submit (disabled + spinner); tampilkan pesan sukses + invoice.

## 6) Riwayat (/transactions)
**Meta**: Title "Riwayat".
**Layout**: toolbar (search + filter) + tabel/list.
**Komponen**: badge status (success/pending/failed), refresh button, empty state elegan; aksi row membuka detail (bila ditambah) atau modal ringkas.

## 7) API H2H (/dashboard/api)
**Meta**: Title "API H2H".
**Layout**: hero card + 2 kolom (kredensial, IP whitelist).
**Komponen**: copy-to-clipboard, toggle show/hide secret, peringatan keamanan, validasi format IP CSV, toast non-intrusif.

## 8) Pengaturan (/dashboard/settings)
**Meta**: Title "Pengaturan".
**Layout**: single column card.
**Komponen**: form profil (name/email/phone) + preferensi (notifikasi/tema); tombol simpan; tampilkan hasil update (toast) + error inline.

## 9) Panel Admin (/admin, /admin/*)
**Meta**: Title "Admin".
**Layout**: sidebar admin + topbar; halaman list memakai tabel + toolbar.
**Komponen**: 
- /admin: stat cards + ringkasan transaksi.
- /admin/products: list + create/edit; form mirip user namun lebih padat.
- /admin/users: list + pencarian.
- /admin/transactions: list + filter status.

## Responsive (sekunder)
- <1024px: sidebar jadi drawer; tabel jadi card list; padding diperkecil.
- <640px: CTA full-width; form jadi 1 kolom; badge lebih ringkas.