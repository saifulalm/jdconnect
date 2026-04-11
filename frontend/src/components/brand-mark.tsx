import * as React from "react"
import Link from "next/link"
import { Zap } from "lucide-react"

import { cn } from "@/lib/utils"
import { BRAND } from "@/lib/brand"

export function BrandMark({
  href = "/",
  className,
  nameClassName,
  iconClassName,
}: {
  href?: string
  className?: string
  nameClassName?: string
  iconClassName?: string
}) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-3", className)}
      aria-label={BRAND.name}
    >
      <span
        className={cn(
          "grid place-items-center size-9 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/25",
          iconClassName
        )}
      >
        <Zap className="h-5 w-5" />
      </span>
      <span className={cn("text-base font-semibold tracking-tight", nameClassName)}>
        {BRAND.name}
      </span>
    </Link>
  )
}

