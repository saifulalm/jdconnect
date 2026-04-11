export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api"

export function apiUrl(path: string) {
  const base = API_BASE_URL.replace(/\/+$/, "")
  const p = path.startsWith("/") ? path : `/${path}`
  return `${base}${p}`
}

