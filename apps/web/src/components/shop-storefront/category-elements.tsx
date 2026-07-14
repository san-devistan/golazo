import {
  ShopUnderlineText,
  SHOP_UNDERLINE_LINK_CLASS_NAME,
} from "@/components/shop-underline-text"
import { categoryHref } from "@/lib/catalog-navigation"
import { Link } from "@tanstack/react-router"
import { cn } from "@workspace/ui/lib/utils"

import type { StorefrontCategory, StorefrontMode } from "./types"

export function CategoryHeadingLink({
  category,
  mode,
  isDimmed,
}: {
  category: StorefrontCategory
  mode: StorefrontMode
  isDimmed: boolean
}) {
  return (
    <Link
      to={categoryHref(category, mode)}
      className={cn(
        SHOP_UNDERLINE_LINK_CLASS_NAME,
        "items-center gap-1",
        isDimmed && "opacity-40 grayscale"
      )}
    >
      <CategoryLogo category={category} className="size-12 sm:size-14" />
      <ShopUnderlineText>{category.name}</ShopUnderlineText>
    </Link>
  )
}

export function CategoryLogo({
  category,
  className,
}: {
  category: StorefrontCategory
  className?: string
}) {
  const logoUrl = category.logoUrl?.trim()

  if (!logoUrl) {
    return null
  }

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded bg-white p-1",
        className
      )}
    >
      <img
        src={logoUrl}
        alt=""
        loading="lazy"
        className="max-h-full max-w-full object-contain"
      />
    </span>
  )
}
