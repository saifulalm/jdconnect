# JDConnect — Pulsa & PPOB Platform

Top-up pulsa, paket data, token PLN, dan game dengan checkout **tanpa login**
(loginless), pembayaran via **Midtrans**, dan eksekusi otomatis ke **supplier
H2H** (Digiflazz) dengan fallback mock untuk demo lokal.

## Tech Stack
- **Frontend**: Next.js 16 + React 19 + TypeScript + Tailwind + shadcn/ui
- **Backend**: NestJS 11 + TypeORM + PostgreSQL (+ optional Redis)
- **Payment**: Midtrans Snap (mock fallback bila key kosong)
- **Supplier**: Digiflazz H2H (mock fallback bila kredensial kosong)

## Struktur
```
pulsa/
├── frontend/   # Next.js app (port 4001)
├── backend/    # NestJS API   (port 4000, prefix /api)
└── package.json
```

## Quick Start

```bash
# 1. Install (root workspaces: frontend + backend)
npm install

# 2. Konfigurasi backend env
cp backend/.env.example backend/.env   # sesuaikan kredensial Postgres

# 3. Buat database + tabel + data dummy (sekali jalan, idempotent)
cd backend && npm run db:init

# 4. Jalankan dev (frontend + backend)
cd .. && npm run dev
```

- Frontend: http://localhost:4001
- Backend API: http://localhost:4000/api

### Login dummy (dibuat oleh `db:init` / `npm run seed`)
| Email | Password | Role |
|---|---|---|
| admin@jdconnect.id | `Admin123!` | admin |
| demo@jdconnect.id | `Demo123!` | customer (saldo Rp 1.000.000) |

## Database
Skema dimiliki oleh **entity TypeORM** (bukan SQL manual). Untuk setup awal:
- `npm run db:init` — buat database (jika belum ada) → sinkron skema dari entity → seed.
- `npm run seed` — hanya seed (database & tabel sudah ada).

Versi produksi: `npm run db:init:prod` / `npm run seed:prod` (jalan dari `dist`).

## Alur loginless
1. User pilih produk + nomor → `POST /api/orders/guest`
2. Bayar via Midtrans Snap (atau `mock-pay` di dev)
3. Webhook `POST /api/payment/midtrans/callback` → tandai paid → top-up supplier
4. Lacak: `/track/{invoice}?phone={4 digit terakhir}`

## Mode produksi
Isi di `backend/.env` untuk mengaktifkan integrasi nyata:
- `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY` (kosong = gateway mock)
- `DIGIFLAZZ_USERNAME`, `DIGIFLAZZ_PROD_KEY` (kosong = supplier mock)
- Webhook Midtrans → `{BACKEND_URL}/api/payment/midtrans/callback`
- Callback Digiflazz → `{BACKEND_URL}/api/supplier/callback`

## Scripts
- `npm run dev` — frontend + backend
- `npm run build` — build keduanya
- `npm run test` — test (backend: `cd backend && npm test`, e2e `npm run test:e2e`)

## License
MIT
