import { CartOrderItem } from "@/components/customer/cart-order-item"
import type {
  CustomerProductSnapshot,
  CustomerWishlistItem,
} from "@/lib/customer-state"
import { useTranslation } from "@/lib/preferences"
import { getErrorMessage } from "@/lib/shop"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { Trash2Icon } from "lucide-react"
import { useCallback, useState } from "react"

export function WishlistSheet({
  items,
  open,
  onOpenChange,
  onToggleWishlist,
}: {
  items: Array<CustomerWishlistItem>
  open: boolean
  onOpenChange: (open: boolean) => void
  onToggleWishlist: (product: CustomerProductSnapshot) => Promise<void>
}) {
  const t = useTranslation()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setErrorMessage(null)
      }

      onOpenChange(nextOpen)
    },
    [onOpenChange]
  )
  const handleRemoveItem = useCallback(
    (item: CustomerWishlistItem) => {
      setErrorMessage(null)

      void onToggleWishlist({
        productId: item.productId,
        name: item.productName,
        slug: item.productSlug,
        imageUrl: item.imageUrl,
        basePriceCents: item.basePriceCents,
        currency: item.currency,
      }).catch((error) => {
        setErrorMessage(getErrorMessage(error))
      })
    },
    [onToggleWishlist]
  )

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="gap-1 rounded-none data-[side=right]:sm:max-w-[32rem] data-[side=right]:lg:max-w-[34rem]"
      >
        <SheetHeader className="mb-4 border-b border-black/10 pb-3">
          <SheetTitle className="font-oswald text-2xl font-bold tracking-wide uppercase">
            {t("wishlistTitle")}
          </SheetTitle>
        </SheetHeader>
        {errorMessage ? (
          <p
            role="alert"
            className="mx-4 rounded-sm bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
          >
            {errorMessage}
          </p>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto px-4">
          {items.length === 0 ? (
            <p className="py-10 text-sm text-muted-foreground">
              {t("wishlistEmpty")}
            </p>
          ) : (
            <ul className="grid list-none gap-[0.65rem] p-0">
              {items.map((item) => (
                <WishlistItem
                  key={item.productId}
                  item={item}
                  onRemoveItem={handleRemoveItem}
                />
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function WishlistItem({
  item,
  onRemoveItem,
}: {
  item: CustomerWishlistItem
  onRemoveItem: (item: CustomerWishlistItem) => void
}) {
  const t = useTranslation()
  const handleRemoveItem = useCallback(() => {
    onRemoveItem(item)
  }, [item, onRemoveItem])

  return (
    <CartOrderItem item={item} variant="wishlist">
      <button
        type="button"
        aria-label={t("removeFromWishlist")}
        className="grid size-6 place-items-center text-[#111] transition hover:text-black/55 focus-visible:ring-2 focus-visible:ring-[#111]/30 focus-visible:outline-none"
        onClick={handleRemoveItem}
      >
        <Trash2Icon className="size-4" />
      </button>
    </CartOrderItem>
  )
}
