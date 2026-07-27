import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Backend Role enum: superaccess | admin | customer (lowercase).
export function isAdminRole(role?: string | null): boolean {
  const r = (role ?? "").toLowerCase()
  return r === "admin" || r === "superaccess"
}
