import { displayCartConfigurationValue } from "@/components/customer/utils"
import type {
  CustomerCartItem,
  CustomerWishlistItem,
} from "@/lib/customer-state"
import { useMoneyFormatter, useTranslation } from "@/lib/preferences"
import { Link } from "@tanstack/react-router"
import { cn } from "@workspace/ui/lib/utils"
import { ShoppingBagIcon } from "lucide-react"
import { type ReactNode, useMemo } from "react"

type CartOrderItemProps =
  | {
      children?: ReactNode
      className?: string
      item: CustomerCartItem
      variant: "cart"
    }
  | {
      children?: ReactNode
      className?: string
      item: CustomerWishlistItem
      variant: "wishlist"
    }

export function CartOrderItem({
  children,
  className,
  item,
  variant,
}: CartOrderItemProps) {
  const formatPrice = useMoneyFormatter()
  const t = useTranslation()
  const productParams = useMemo(
    () => ({ slug: item.productSlug }),
    [item.productSlug]
  )
  const priceCents =
    variant === "cart"
      ? item.unitPriceCents * item.quantity
      : item.basePriceCents
  const linePrice = formatPrice(priceCents, item.currency)

  return (
    <li
      className={cn(
        "grid grid-cols-[6rem_minmax(0,1fr)] gap-3 border-b border-black/10 pb-3 last:border-b-0 last:pb-0",
        className
      )}
    >
      <Link
        to="/products/$slug"
        params={productParams}
        className="block aspect-square overflow-hidden bg-[#eceff1]"
      >
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.productName}
            className="size-full object-cover object-top"
          />
        ) : (
          <span className="grid size-full place-items-center">
            <ShoppingBagIcon className="size-5 text-black/45" />
          </span>
        )}
      </Link>
      <div className="grid min-w-0 content-stretch gap-[0.32rem]">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
          <Link
            to="/products/$slug"
            params={productParams}
            className="line-clamp-2 font-oswald text-[0.82rem] leading-[1.08] font-bold tracking-normal [overflow-wrap:anywhere] uppercase hover:underline"
          >
            {item.productName}
          </Link>
          <span className="font-oswald text-[0.82rem] leading-[1.08] font-bold tracking-normal whitespace-nowrap uppercase">
            {linePrice}
          </span>
        </div>
        <div className="mt-auto grid gap-[0.32rem]">
          {variant === "cart" ? <CartOrderConfiguration item={item} /> : null}
          <div className={cn("relative min-w-0", children && "pr-8")}>
            {variant === "cart" ? (
              <p className="text-[0.74rem] leading-[1.25] text-black/60">
                {t("quantity")}: {item.quantity}
              </p>
            ) : (
              <span aria-hidden="true" className="block h-[0.9375rem]" />
            )}
            {children ? (
              <div className="absolute top-1/2 right-0 -translate-y-1/2">
                {children}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  )
}

function CartOrderConfiguration({ item }: { item: CustomerCartItem }) {
  if (item.configurationSummary.length === 0) {
    return null
  }

  return (
    <dl className="flex min-w-0 flex-wrap gap-x-1 text-[0.74rem] leading-[1.25] text-black/60">
      {item.configurationSummary.map((summary) => (
        <div key={`${item.configurationKey}-${summary.label}`} className="flex">
          <dt>{summary.label}:</dt>
          <dd className="ml-1 min-w-0 break-words">
            {displayCartConfigurationValue(summary)}
            {summary !== item.configurationSummary.at(-1) ? (
              <span className="ml-1">/</span>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  )
}
