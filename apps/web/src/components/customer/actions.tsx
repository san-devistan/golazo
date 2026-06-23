import { AuthDialog } from "@/components/customer/auth-dialog"
import { CartSheet } from "@/components/customer/cart-sheet"
import { HeaderIconButton } from "@/components/customer/icon-button"
import { WishlistSheet } from "@/components/customer/wishlist-sheet"
import { useCustomerState } from "@/lib/customer-state"
import { useNavigate } from "@tanstack/react-router"
import { HeartIcon, ShoppingBagIcon, UserIcon } from "lucide-react"
import { useCallback, useState } from "react"

export function CustomerActions() {
  const navigate = useNavigate()
  const {
    cartCount,
    cartItems,
    isAuthLoading,
    isAuthenticated,
    removeCartItem,
    setCartItemQuantity,
    startCheckout,
    wishlistCount,
    wishlistItems,
  } = useCustomerState()
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [isWishlistOpen, setIsWishlistOpen] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)
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
    setIsCartOpen(true)
  }, [])

  const handleAuthRequired = useCallback(() => {
    setIsAuthOpen(true)
  }, [])

  const handleCheckout = useCallback(async () => {
    setIsCheckingOut(true)

    try {
      await startCheckout()
    } finally {
      setIsCheckingOut(false)
    }
  }, [startCheckout])

  return (
    <>
      <HeaderIconButton
        label={isAuthenticated ? "Account" : "Sign in"}
        isActive={isAuthenticated}
        onClick={handleAccountClick}
      >
        <UserIcon className="size-5" />
      </HeaderIconButton>
      <HeaderIconButton
        label="Wishlist"
        count={wishlistCount}
        onClick={handleWishlistOpen}
      >
        <HeartIcon className="size-5" />
      </HeaderIconButton>
      <HeaderIconButton label="Cart" count={cartCount} onClick={handleCartOpen}>
        <ShoppingBagIcon className="size-5" />
      </HeaderIconButton>

      <AuthDialog open={isAuthOpen} onOpenChange={setIsAuthOpen} />
      <WishlistSheet
        items={wishlistItems}
        open={isWishlistOpen}
        onOpenChange={setIsWishlistOpen}
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
        onSetQuantity={setCartItemQuantity}
      />
    </>
  )
}
