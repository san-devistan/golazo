import { AuthDialog } from "@/components/customer/auth-dialog"
import { CartOrderItem } from "@/components/customer/cart-order-item"
import { CartSheet } from "@/components/customer/cart-sheet"
import { HeaderIconButton } from "@/components/customer/icon-button"
import { WishlistSheet } from "@/components/customer/wishlist-sheet"
import { type CustomerCartItem, useCustomerState } from "@/lib/customer-state"
import { useAppPreferences } from "@/lib/preferences"
import { useNavigate } from "@tanstack/react-router"
import { cn } from "@workspace/ui/lib/utils"
import { HeartIcon, ShoppingBagIcon, UserIcon } from "lucide-react"
import { type FocusEvent, useCallback, useMemo, useState } from "react"

const MAX_CART_PREVIEW_ITEMS = 3

export function CustomerActions() {
  const navigate = useNavigate()
  const { convertPriceCents, currency, formatPrice, t } = useAppPreferences()
  const {
    cartCount,
    cartItems,
    isAuthLoading,
    isAuthenticated,
    removeCartItem,
    startCheckout,
    toggleWishlist,
    wishlistCount,
    wishlistItems,
  } = useCustomerState()
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [isWishlistOpen, setIsWishlistOpen] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCartPreviewOpen, setIsCartPreviewOpen] = useState(false)
  const [isCheckingOut, setIsCheckingOut] = useState(false)

  const handleAccountClick = useCallback(() => {
    if (isAuthenticated) {
      void navigate({ to: "/account" })
      return
    }

    setIsAuthOpen(true)
  }, [isAuthenticated, navigate])

  const handleWishlistOpen = useCallback(() => {
    setIsWishlistOpen(true)
  }, [])

  const handleCartOpen = useCallback(() => {
    setIsCartPreviewOpen(false)
    setIsCartOpen(true)
  }, [])
  const handleCartPreviewOpen = useCallback(() => {
    setIsCartPreviewOpen(true)
  }, [])
  const handleCartPreviewClose = useCallback(() => {
    setIsCartPreviewOpen(false)
  }, [])
  const handleCartPreviewBlur = useCallback(
    (event: FocusEvent<HTMLDivElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget)) {
        setIsCartPreviewOpen(false)
      }
    },
    []
  )

  const handleAuthRequired = useCallback(() => {
    setIsAuthOpen(true)
  }, [])

  const handleCheckout = useCallback(async () => {
    setIsCheckingOut(true)

    try {
      await startCheckout(currency)
    } finally {
      setIsCheckingOut(false)
    }
  }, [currency, startCheckout])

  const cartPreviewTotalCents = useMemo(
    () =>
      cartItems.reduce(
        (total, item) =>
          total +
          convertPriceCents(item.unitPriceCents, item.currency) * item.quantity,
        0
      ),
    [cartItems, convertPriceCents]
  )

  return (
    <>
      <HeaderIconButton
        label={isAuthenticated ? t("account") : t("signIn")}
        isActive={isAuthenticated}
        onClick={handleAccountClick}
      >
        <UserIcon className="size-5" />
      </HeaderIconButton>
      <HeaderIconButton
        label={t("wishlist")}
        count={wishlistCount}
        onClick={handleWishlistOpen}
      >
        <HeartIcon className="size-5" />
      </HeaderIconButton>
      <div
        data-cart-animation-target=""
        className="relative"
        onMouseEnter={handleCartPreviewOpen}
        onMouseLeave={handleCartPreviewClose}
        onFocus={handleCartPreviewOpen}
        onBlur={handleCartPreviewBlur}
      >
        <HeaderIconButton
          label={t("cart")}
          count={cartCount}
          onClick={handleCartOpen}
        >
          <ShoppingBagIcon className="size-5" />
        </HeaderIconButton>
        <CartHoverPreview
          emptyLabel={t("cartEmpty")}
          isOpen={isCartPreviewOpen && !isCartOpen}
          items={cartItems}
          title={t("cartTitle")}
          totalLabel={t("total")}
          totalText={formatPrice(cartPreviewTotalCents, currency)}
        />
      </div>

      <AuthDialog open={isAuthOpen} onOpenChange={setIsAuthOpen} />
      <WishlistSheet
        items={wishlistItems}
        open={isWishlistOpen}
        onOpenChange={setIsWishlistOpen}
        onToggleWishlist={toggleWishlist}
      />
      <CartSheet
        items={cartItems}
        isAuthenticated={isAuthenticated}
        isAuthLoading={isAuthLoading}
        isCheckingOut={isCheckingOut}
        open={isCartOpen}
        onOpenChange={setIsCartOpen}
        onAuthRequired={handleAuthRequired}
        onCheckout={handleCheckout}
        onRemoveItem={removeCartItem}
      />
    </>
  )
}

function CartHoverPreview({
  emptyLabel,
  isOpen,
  items,
  title,
  totalLabel,
  totalText,
}: {
  emptyLabel: string
  isOpen: boolean
  items: Array<CustomerCartItem>
  title: string
  totalLabel: string
  totalText: string
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute top-full right-0 z-50 hidden w-[min(22rem,calc(100vw-2rem))] pt-3 opacity-0 transition lg:block",
        isOpen && "pointer-events-auto opacity-100"
      )}
    >
      <section
        aria-label="Cart preview"
        className="grid max-h-[min(70vh,28rem)] gap-3 overflow-auto border border-black/15 bg-white p-3 text-[#111] shadow-[0_14px_32px_rgb(0_0_0/0.08)]"
      >
        <h2 className="font-oswald text-sm leading-none font-bold uppercase">
          {title}
        </h2>
        {items.length === 0 ? (
          <p className="text-sm leading-5 text-black/60">{emptyLabel}</p>
        ) : (
          <CartHoverPreviewContent
            items={items}
            totalLabel={totalLabel}
            totalText={totalText}
          />
        )}
      </section>
    </div>
  )
}

function CartHoverPreviewContent({
  items,
  totalLabel,
  totalText,
}: {
  items: Array<CustomerCartItem>
  totalLabel: string
  totalText: string
}) {
  const previewItems = items.slice(0, MAX_CART_PREVIEW_ITEMS)
  const extraItemCount = items.length - previewItems.length

  return (
    <>
      <ul className="grid list-none gap-[0.65rem] p-0">
        {previewItems.map((item) => (
          <CartOrderItem
            key={item.configurationKey}
            item={item}
            variant="cart"
          />
        ))}
      </ul>
      {extraItemCount > 0 && (
        <p className="text-xs text-black/55">+{extraItemCount} more</p>
      )}
      <div className="flex items-center justify-between border-t border-black/10 pt-3 font-oswald text-sm font-bold uppercase">
        <span>{totalLabel}</span>
        <span>{totalText}</span>
      </div>
    </>
  )
}
