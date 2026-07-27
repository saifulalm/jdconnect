/**
 * Recently used destination numbers, kept on the device only.
 * Powers one-tap re-fill at checkout and prefills the account-claim form.
 */
const KEY = "recent:numbers"
const MAX = 6

export interface RecentNumber {
  number: string
  category: string
  label?: string // detected operator / product provider
  at: number
}

export function getRecentNumbers(category?: string): RecentNumber[] {
  if (typeof window === "undefined") return []
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]") as RecentNumber[]
    const list = Array.isArray(raw) ? raw : []
    return (category ? list.filter((r) => r.category === category) : list).sort(
      (a, b) => b.at - a.at,
    )
  } catch {
    return []
  }
}

export function rememberNumber(entry: Omit<RecentNumber, "at">): void {
  if (typeof window === "undefined") return
  try {
    const list = getRecentNumbers()
    const deduped = list.filter(
      (r) => !(r.number === entry.number && r.category === entry.category),
    )
    const next = [{ ...entry, at: Date.now() }, ...deduped].slice(0, MAX)
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Storage full or blocked — feature is optional, fail quietly.
  }
}

export function forgetNumber(number: string, category: string): void {
  if (typeof window === "undefined") return
  try {
    const next = getRecentNumbers().filter(
      (r) => !(r.number === number && r.category === category),
    )
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // ignore
  }
}

/** Last number used for any category — prefills the claim form. */
export function getLastNumber(): string {
  return getRecentNumbers()[0]?.number ?? ""
}
