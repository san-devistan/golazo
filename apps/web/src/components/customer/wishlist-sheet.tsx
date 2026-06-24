import { ProductThumb } from "@/components/customer/product-thumb"
import type { CustomerWishlistItem } from "@/lib/customer-state"
import { useMoneyFormatter, useTranslation } from "@/lib/preferences"
import { Link } from "@tanstack/react-router"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { useMemo } from "react"

export function WishlistSheet({
  items,
  open,
  onOpenChange,
}: {
  items: Array<CustomerWishlistItem>
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslation()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="gap-1 rounded-none sm:max-w-md">
        <SheetHeader className="pb-1">
          <SheetTitle className="font-oswald text-2xl font-bold tracking-wide uppercase">
            {t("wishlistTitle")}
          </SheetTitle>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4">
          {items.length === 0 ? (
            <p className="py-10 text-sm text-muted-foreground">
              {t("wishlistEmpty")}
            </p>
          ) : (
            <div className="divide-y">
              {items.map((item) => (
                <WishlistItem key={item.productId} item={item} />
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function WishlistItem({ item }: { item: CustomerWishlistItem }) {
  const formatPrice = useMoneyFormatter()
  const productParams = useMemo(
    () => ({ slug: item.productSlug }),
    [item.productSlug]
  )

  return (
    <Link
      to="/products/$slug"
      params={productParams}
      className="flex gap-3 py-3 transition hover:bg-muted/50"
    >
      <ProductThumb imageUrl={item.imageUrl} name={item.productName} />
      <div className="min-w-0 flex-1">
        <div className="line-clamp-2 font-oswald text-base leading-5 font-bold tracking-wide uppercase">
          {item.productName}
        </div>
        <div className="mt-1 text-sm font-semibold">
          {formatPrice(item.basePriceCents, item.currency)}
        </div>
      </div>
    </Link>
  )
}
