# Prosedur Operasional Topup Deposit (Admin)

## Endpoint
- `POST /api/admin/topup`

## Header
- `Authorization: Bearer <JWT>`

## Payload
```json
{
  "userId": "<uuid target>",
  "amount": 50000,
  "description": "Topup deposit via CS"
}
```

## Otorisasi
- Wajib role `admin` atau `superaccess`.

## Audit Trail
- Setiap topup otomatis tercatat ke `balance_history` via `UserService.updateBalance()`.
- Field yang tercatat: `amount`, `balanceBefore`, `balanceAfter`, `type=topup`, `referenceId`, `description`, `createdAt`.

## Validasi & kontrol
- `amount` minimal 1.
- `userId` harus valid dan exist.

## Monitoring
- Cek log Heroku: `heroku logs --tail -a jdconnect-backend`
- Cek riwayat saldo user: query `balance_history`.

