import { CartOrderItem } from "@/components/customer/cart-order-item"
import type { CustomerCartItem } from "@/lib/customer-state"
import { useAppPreferences, useTranslation } from "@/lib/preferences"
import { getErrorMessage } from "@/lib/shop"
import { Button } from "@workspace/ui/components/button"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { Trash2Icon } from "lucide-react"
import { useCallback, useState } from "react"

export function CartSheet({
  items,
  isAuthenticated,
  isAuthLoading,
  isCheckingOut,
  open,
  onOpenChange,
  onAuthRequired,
  onCheckout,
  onRemoveItem,
}: {
  items: Array<CustomerCartItem>
  isAuthenticated: boolean
  isAuthLoading: boolean
  isCheckingOut: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onAuthRequired: () => void
  onCheckout: () => Promise<void>
  onRemoveItem: (configurationKey: string) => Promise<void>
}) {
  const { convertPriceCents, currency, formatPrice, t } = useAppPreferences()
  const totalCents = items.reduce(
    (total, item) =>
      total +
      convertPriceCents(item.unitPriceCents, item.currency) * item.quantity,
    0
  )
  const checkoutLabel = isAuthenticated ? t("checkout") : t("signInToCheckout")
  const shippingText = t("free")
  const totalText = formatPrice(totalCents, currency)
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
    (configurationKey: string) => {
      setErrorMessage(null)

      void onRemoveItem(configurationKey).catch((error) => {
        setErrorMessage(getErrorMessage(error))
      })
    },
    [onRemoveItem]
  )

  const checkout = useCallback(async () => {
    if (!isAuthenticated) {
      onAuthRequired()
      return
    }

    setErrorMessage(null)

    try {
      await onCheckout()
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }, [isAuthenticated, onAuthRequired, onCheckout])

  const handleCheckoutClick = useCallback(() => {
    void checkout()
  }, [checkout])

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="gap-1 rounded-none data-[side=right]:sm:max-w-[32rem] data-[side=right]:lg:max-w-[34rem]"
      >
        <SheetHeader className="mb-4 border-b border-black/10 pb-3">
          <SheetTitle className="font-oswald text-2xl font-bold tracking-wide uppercase">
            {t("cartTitle")}
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
              {t("cartEmpty")}
            </p>
          ) : (
            <ul className="grid list-none gap-[0.65rem] p-0">
              {items.map((item) => (
                <CartItemRow
                  key={item.configurationKey}
                  item={item}
                  onRemoveItem={handleRemoveItem}
                />
              ))}
            </ul>
          )}
        </div>
        {items.length > 0 && (
          <SheetFooter className="sticky bottom-0 z-10 mt-auto gap-4 border-t border-black/10 bg-white px-6 pt-4 pb-6 shadow-[0_-18px_30px_rgb(255_255_255/0.92)]">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <CartSummaryRow
                  label={t("shipping")}
                  value={shippingText}
                  variant="muted"
                />
                <CartSummaryRow
                  label={t("total")}
                  value={totalText}
                  variant="total"
                />
              </div>
              <p className="text-xs leading-[1.35] text-black/60">
                {t("cartCheckoutNote")}
              </p>
            </div>
            <Button
              type="button"
              className="min-h-12 rounded-none border border-[#111] bg-[#111] font-oswald text-base leading-none font-black tracking-normal text-white uppercase shadow-none hover:bg-white hover:text-[#111]"
              disabled={isAuthLoading || isCheckingOut}
              onClick={handleCheckoutClick}
            >
              {isCheckingOut ? t("openingCheckout") : checkoutLabel}
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}

function CartSummaryRow({
  label,
  value,
  variant,
}: {
  label: string
  value: string
  variant: "muted" | "total"
}) {
  if (variant === "total") {
    return (
      <div className="flex items-baseline justify-between gap-4 font-oswald font-extrabold tracking-normal text-[#111] uppercase">
        <span className="text-[clamp(0.95rem,2.5vw,1.1rem)] leading-[0.95]">
          {label}
        </span>
        <span className="text-right text-[clamp(1rem,2.75vw,1.2rem)] leading-[0.95]">
          {value}
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-4 text-sm leading-[1.2] text-black/70">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}

function CartItemRow({
  item,
  onRemoveItem,
}: {
  item: CustomerCartItem
  onRemoveItem: (configurationKey: string) => void
}) {
  const t = useTranslation()
  const handleRemoveItem = useCallback(() => {
    onRemoveItem(item.configurationKey)
  }, [item.configurationKey, onRemoveItem])

  return (
    <CartOrderItem item={item} variant="cart">
      <button
        type="button"
        aria-label={t("removeFromCart")}
        className="grid size-6 place-items-center text-[#111] transition hover:text-black/55 focus-visible:ring-2 focus-visible:ring-[#111]/30 focus-visible:outline-none"
        onClick={handleRemoveItem}
      >
        <Trash2Icon className="size-4" />
      </button>
    </CartOrderItem>
  )
}
