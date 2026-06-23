import { ProductThumb } from "@/components/customer/product-thumb"
import type { CustomerWishlistItem } from "@/lib/customer-state"
import { formatPrice } from "@/lib/shop"
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
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="gap-1 rounded-none sm:max-w-md">
        <SheetHeader className="pb-1">
          <SheetTitle className="font-oswald text-2xl font-bold tracking-wide uppercase">
            WISHLIST
          </SheetTitle>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4">
          {items.length === 0 ? (
            <p className="py-10 text-sm text-muted-foreground">
              No saved products yet.
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
