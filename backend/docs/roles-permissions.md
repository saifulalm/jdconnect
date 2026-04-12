# Audit Role & Permission Matrix (JDConnect)

## Roles yang wajib tersedia
- `superaccess`: kewenangan tertinggi (bypass seluruh check role)
- `admin`: akses penuh untuk operasional termasuk topup deposit member
- `customer`: pengguna layanan

## Kekurangan & celah keamanan (hasil audit)
- Register sebelumnya menerima `role` dari payload sehingga user bisa self-escalate menjadi admin.
- `RolesGuard` sebelumnya memakai `includes()` pada string, rawan false-positive (mis. substring match) dan tidak punya hirarki.
- Endpoint admin sebelumnya tidak dibatasi role (hanya JWT), sehingga customer bisa mengakses resource admin.
- Endpoint update user sebelumnya tidak membatasi “self-only” sehingga user bisa mengubah akun user lain.
- JWT sebelumnya bisa tidak sinkron antara sign/verify (secret mismatch) dan strategi tidak re-check user aktif di database.

## Permission Matrix (ringkas)

Legenda:
- ✅ = diizinkan
- ❌ = dilarang

| Area / Endpoint | customer | admin | superaccess |
|---|---:|---:|---:|
| Auth: register/login | ✅ | ✅ | ✅ |
| Users: profile sendiri | ✅ | ✅ | ✅ |
| Users: buat user baru (`POST /users`) | ❌ | ✅ | ✅ |
| Users: update user (`PATCH /users/:id`) | ✅ (self) | ✅ | ✅ |
| Products: list/get | ✅ | ✅ | ✅ |
| Products: create/update/delete | ❌ | ✅ | ✅ |
| Transactions: create/list (user) | ✅ | ✅ | ✅ |
| Admin: stats/users/transactions/revenue | ❌ | ✅ | ✅ |
| Admin: topup deposit member (`POST /admin/topup`) | ❌ | ✅ | ✅ |
| H2H: akses API partner (API key + HMAC + optional IP whitelist) | ✅ (khusus partner) | ✅ | ✅ |

## Prinsip implementasi
- `superaccess` selalu boleh (bypass) untuk semua route yang memakai role guard.
- `admin` boleh semua operasi operasional.
- `customer` hanya operasi self-service.

