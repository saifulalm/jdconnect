export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api"

export function apiUrl(path: string) {
  const base = API_BASE_URL.replace(/\/+$/, "")
  const p = path.startsWith("/") ? path : `/${path}`
  return `${base}${p}`
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type Product = {
  id: string
  sku: string
  name: string
  category: "pulsa" | "data" | "pln" | "game" | "ewallet"
  provider: string
  denomination: number
  price: number
  isActive: boolean
  description?: string
}

export type GuestOrderResponse = {
  invoiceNumber: string
  amount: number
  status: string
  paymentStatus: string
  payment: { token?: string; redirectUrl?: string; qrString?: string; gateway: string }
}

export type OrderStatus = {
  invoiceNumber: string
  product?: string
  provider: string
  phoneNumber: string
  amount: number
  status: string
  paymentStatus: string
  serialNumber?: string
  message?: string
  qrString?: string
  createdAt: string
}

export type PaymentConfig = {
  gateway: "midtrans" | "qris" | "mock"
  clientKey: string
  isProduction: boolean
}

/** Storefront category config — served by the backend, admin-editable. */
export type Category = {
  id: string
  key: string
  label: string
  description?: string
  icon: string
  inputLabel: string
  inputPlaceholder: string
  inputHelp?: string
  minLength: number
  maxLength: number
  detectOperator: boolean
  requiresServerId: boolean
  serverIdLabel?: string
  sortOrder: number
  isActive: boolean
}

export type OperatorPrefix = {
  id: string
  prefix: string
  provider: string
  isActive: boolean
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------
async function handle<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = (data as any)?.message || (data as any)?.error || `Request failed (${res.status})`
    throw new Error(Array.isArray(msg) ? msg.join(", ") : msg)
  }
  return data as T
}

export async function getProducts(category?: string): Promise<Product[]> {
  const q = category ? `?category=${encodeURIComponent(category)}` : ""
  const res = await fetch(apiUrl(`/products${q}`), { cache: "no-store" })
  return handle<Product[]>(res)
}

export async function getPaymentConfig(): Promise<PaymentConfig> {
  const res = await fetch(apiUrl("/payment/config"), { cache: "no-store" })
  return handle<PaymentConfig>(res)
}

export async function getCategories(): Promise<Category[]> {
  const res = await fetch(apiUrl("/catalog/categories"), { cache: "no-store" })
  return handle<Category[]>(res)
}

export async function getOperatorPrefixes(): Promise<OperatorPrefix[]> {
  const res = await fetch(apiUrl("/catalog/prefixes"), { cache: "no-store" })
  return handle<OperatorPrefix[]>(res)
}

export async function createGuestOrder(body: {
  productId: string
  phoneNumber: string
  serverId?: string
  customerEmail?: string
  customerName?: string
}): Promise<GuestOrderResponse> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
  const res = await fetch(apiUrl("/orders/guest"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  return handle<GuestOrderResponse>(res)
}

export async function trackOrder(invoiceNumber: string, phoneLast4: string): Promise<OrderStatus> {
  const res = await fetch(
    apiUrl(`/orders/track/${invoiceNumber}?phone=${encodeURIComponent(phoneLast4)}`),
    { cache: "no-store" },
  )
  return handle<OrderStatus>(res)
}

/** Dev-only: settle a mock-gateway order so the flow can complete locally. */
export async function mockPay(invoiceNumber: string): Promise<void> {
  await fetch(apiUrl(`/payment/mock-pay/${invoiceNumber}`), { method: "POST" })
}

export async function requestOtp(phoneNumber: string, purpose = "checkout") {
  const res = await fetch(apiUrl("/otp/request"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phoneNumber, purpose }),
  })
  return handle<{ sent: boolean; debugCode?: string }>(res)
}

/**
 * Loginless -> account: verify ownership of the destination number and
 * attach every guest order placed with it. Returns a session token.
 */
export async function claimGuestOrders(body: {
  phoneNumber: string
  code: string
  name?: string
}): Promise<{
  access_token: string
  user: { id: string; email: string; name: string; role: string }
  claimed: number
  accountCreated: boolean
}> {
  const res = await fetch(apiUrl("/orders/claim"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return handle(res)
}

/** Passwordless sign-in for an existing account. */
export async function otpLogin(phoneNumber: string, code: string): Promise<{
  access_token: string
  user: { id: string; email: string; name: string; role: string }
}> {
  const res = await fetch(apiUrl("/auth/otp/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phoneNumber, code }),
  })
  return handle(res)
}

export async function verifyOtp(phoneNumber: string, code: string, purpose = "checkout") {
  const res = await fetch(apiUrl("/otp/verify"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phoneNumber, code, purpose }),
  })
  return handle<{ valid: boolean }>(res)
}

export function formatIDR(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value)
}

/** Normalise an Indonesian MSISDN to local format (leading 0). */
export function normalizeMsisdn(input: string): string {
  let p = (input || "").replace(/\D/g, "")
  if (p.startsWith("62")) p = "0" + p.slice(2)
  if (p && !p.startsWith("0")) p = "0" + p
  return p
}

/**
 * Detect the operator from a backend-managed prefix table (admin-editable).
 * Longest-prefix wins so 4-digit entries beat 3-digit ones.
 */
export function detectOperator(phone: string, prefixes: OperatorPrefix[]): string | null {
  const p = normalizeMsisdn(phone)
  if (p.length < 4) return null
  let best: OperatorPrefix | null = null
  for (const row of prefixes) {
    if (!row.isActive) continue
    if (p.startsWith(row.prefix) && (!best || row.prefix.length > best.prefix.length)) {
      best = row
    }
  }
  return best?.provider ?? null
}
