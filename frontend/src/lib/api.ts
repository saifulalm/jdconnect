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
  gateway: "midtrans" | "mock"
  clientKey: string
  isProduction: boolean
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

export async function createGuestOrder(body: {
  productId: string
  phoneNumber: string
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

/** Detect Indonesian operator from MSISDN prefix. */
export function detectOperator(phone: string): string | null {
  const p = phone.replace(/\D/g, "").replace(/^62/, "0")
  if (!/^08\d{2}/.test(p)) return null
  const pre = p.slice(0, 4)
  const map: Record<string, string[]> = {
    Telkomsel: ["0811", "0812", "0813", "0821", "0822", "0823", "0851", "0852", "0853"],
    Indosat: ["0814", "0815", "0816", "0855", "0856", "0857", "0858"],
    XL: ["0817", "0818", "0819", "0859", "0877", "0878"],
    Tri: ["0895", "0896", "0897", "0898", "0899"],
    Smartfren: ["0881", "0882", "0883", "0884", "0885", "0886", "0887", "0888", "0889"],
    Axis: ["0831", "0832", "0833", "0838"],
  }
  for (const [op, prefixes] of Object.entries(map)) {
    if (prefixes.includes(pre)) return op
  }
  return null
}
