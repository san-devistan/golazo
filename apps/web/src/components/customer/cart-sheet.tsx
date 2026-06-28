import { ProductThumb } from "@/components/customer/product-thumb"
import { displayCartConfigurationValue } from "@/components/customer/utils"
import type { CustomerCartItem } from "@/lib/customer-state"
import {
  useAppPreferences,
  useMoneyFormatter,
  useTranslation,
} from "@/lib/preferences"
import { getErrorMessage } from "@/lib/shop"
import { Link } from "@tanstack/react-router"
import { Button } from "@workspace/ui/components/button"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { MinusIcon, PlusIcon, ShoppingBagIcon, Trash2Icon } from "lucide-react"
import { useCallback, useMemo, useState } from "react"

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
  onSetQuantity,
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
  onSetQuantity: (configurationKey: string, quantity: number) => Promise<void>
}) {
  const { convertPriceCents, currency, formatPrice, t } = useAppPreferences()
  const totalCents = items.reduce(
    (total, item) =>
      total +
      convertPriceCents(item.unitPriceCents, item.currency) * item.quantity,
    0
  )
  const productCount = items.reduce((total, item) => total + item.quantity, 0)
  const productCountLabel = `${productCount} ${t(
    productCount === 1 ? "productSingular" : "productPlural"
  )}`
  const checkoutLabel = isAuthenticated ? t("checkout") : t("signInToCheckout")
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

  const handleSetQuantity = useCallback(
    (configurationKey: string, quantity: number) => {
      setErrorMessage(null)

      void onSetQuantity(configurationKey, quantity).catch((error) => {
        setErrorMessage(getErrorMessage(error))
      })
    },
    [onSetQuantity]
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
      <SheetContent side="right" className="gap-1 rounded-none sm:max-w-md">
        <SheetHeader className="pb-1">
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
            <div className="divide-y">
              {items.map((item) => (
                <CartItemRow
                  key={item.configurationKey}
                  item={item}
                  onRemoveItem={handleRemoveItem}
                  onSetQuantity={handleSetQuantity}
                />
              ))}
            </div>
          )}
        </div>
        {items.length > 0 && (
          <SheetFooter className="border-t">
            <div className="flex items-end justify-between text-sm font-bold">
              <span>{productCountLabel}</span>
              <span className="font-oswald text-lg font-medium">
                {formatPrice(totalCents, currency)}
              </span>
            </div>
            <Button
              type="button"
              className="rounded-none"
              disabled={isAuthLoading || isCheckingOut}
              onClick={handleCheckoutClick}
            >
              <ShoppingBagIcon className="size-4" />
              {isCheckingOut ? t("openingCheckout") : checkoutLabel}
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}

function CartItemRow({
  item,
  onRemoveItem,
  onSetQuantity,
}: {
  item: CustomerCartItem
  onRemoveItem: (configurationKey: string) => void
  onSetQuantity: (configurationKey: string, quantity: number) => void
}) {
  const formatPrice = useMoneyFormatter()
  const t = useTranslation()
  const productParams = useMemo(
    () => ({ slug: item.productSlug }),
    [item.productSlug]
  )
  const handleRemoveItem = useCallback(() => {
    onRemoveItem(item.configurationKey)
  }, [item.configurationKey, onRemoveItem])
  const handleDecreaseQuantity = useCallback(() => {
    onSetQuantity(item.configurationKey, item.quantity - 1)
  }, [item.configurationKey, item.quantity, onSetQuantity])
  const handleIncreaseQuantity = useCallback(() => {
    onSetQuantity(item.configurationKey, item.quantity + 1)
  }, [item.configurationKey, item.quantity, onSetQuantity])

  return (
    <div className="grid grid-cols-[80px_minmax(0,1fr)] items-start gap-3 py-3">
      <Link to="/products/$slug" params={productParams}>
        <ProductThumb imageUrl={item.imageUrl} name={item.productName} />
      </Link>
      <div className="relative min-w-0 pr-9">
        <Link
          to="/products/$slug"
          params={productParams}
          className="line-clamp-2 font-oswald text-base leading-5 font-bold tracking-wide uppercase hover:underline"
        >
          {item.productName}
        </Link>
        <CartConfigurationSummary item={item} />
        <button
          type="button"
          aria-label={t("removeFromCart")}
          className="absolute top-0 right-0 grid size-8 place-items-center text-muted-foreground transition hover:text-foreground"
          onClick={handleRemoveItem}
        >
          <Trash2Icon className="size-4" />
        </button>
        <div className="mt-3 flex items-center justify-between gap-3">
          <QuantityControl
            quantity={item.quantity}
            onDecrease={handleDecreaseQuantity}
            onIncrease={handleIncreaseQuantity}
          />
          <div className="ml-auto font-oswald text-sm font-medium">
            {formatPrice(item.unitPriceCents, item.currency)}
          </div>
        </div>
      </div>
    </div>
  )
}

function CartConfigurationSummary({ item }: { item: CustomerCartItem }) {
  if (item.configurationSummary.length === 0) {
    return null
  }

  return (
    <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
      {item.configurationSummary.map((summary) => (
        <div key={`${item.configurationKey}-${summary.label}`}>
          {summary.label}: {displayCartConfigurationValue(summary)}
        </div>
      ))}
    </div>
  )
}

function QuantityControl({
  quantity,
  onDecrease,
  onIncrease,
}: {
  quantity: number
  onDecrease: () => void
  onIncrease: () => void
}) {
  const t = useTranslation()

  return (
    <div className="inline-grid grid-cols-[32px_40px_32px] bg-muted">
      <button
        type="button"
        aria-label={t("decreaseQuantity")}
        className="grid size-8 place-items-center"
        onClick={onDecrease}
      >
        <MinusIcon className="size-3.5" />
      </button>
      <div className="grid h-8 place-items-center text-xs font-bold">
        {quantity}
      </div>
      <button
        type="button"
        aria-label={t("increaseQuantity")}
        className="grid size-8 place-items-center"
        onClick={onIncrease}
      >
        <PlusIcon className="size-3.5" />
      </button>
    </div>
  )
}
