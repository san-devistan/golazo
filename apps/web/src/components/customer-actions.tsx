import { PasswordInput } from "@/components/password-input"
import { authClient } from "@/lib/auth-client"
import {
  type CustomerCartItem,
  type CustomerWishlistItem,
  useCustomerState,
} from "@/lib/customer-state"
import { formatPrice, getErrorMessage } from "@/lib/shop"
import { Link, useNavigate } from "@tanstack/react-router"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { cn } from "@workspace/ui/lib/utils"
import {
  HeartIcon,
  MinusIcon,
  PlusIcon,
  ShoppingBagIcon,
  Trash2Icon,
  UserIcon,
} from "lucide-react"
import { type FormEvent, useState } from "react"

type AuthMode = "reset-request" | "sign-in" | "sign-up"

function betterAuthErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message
  }

  return getErrorMessage(error)
}

function displayCartConfigurationValue({
  label,
  value,
}: {
  label: string
  value: string
}) {
  if (label.trim().toLowerCase() !== "flocking") {
    return value
  }

  return value.replace(/\b(?:name|number):\s*/gi, "").trim()
}

function HeaderIconButton({
  label,
  count,
  isActive = false,
  onClick,
  children,
}: {
  label: string
  count?: number
  isActive?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "relative grid size-9 place-items-center transition outline-none hover:bg-[#f1f1f1] focus-visible:ring-2 focus-visible:ring-[#111]/30",
        isActive && "bg-[#111] text-white hover:bg-[#222]"
      )}
      onClick={onClick}
    >
      {children}
      {count !== undefined && count > 0 && (
        <span className="absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#111] px-1 text-[10px] leading-4 font-black text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  )
}

export function CustomerActions() {
  const navigate = useNavigate()
  const customerState = useCustomerState()
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [isWishlistOpen, setIsWishlistOpen] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckingOut, setIsCheckingOut] = useState(false)

  function handleAccountClick() {
    if (customerState.isAuthenticated) {
      void navigate({ to: "/account" })
      return
    }

    setIsAuthOpen(true)
  }

  return (
    <>
      <HeaderIconButton
        label={customerState.isAuthenticated ? "Account" : "Sign in"}
        isActive={customerState.isAuthenticated}
        onClick={handleAccountClick}
      >
        <UserIcon className="size-5" />
      </HeaderIconButton>
      <HeaderIconButton
        label="Wishlist"
        count={customerState.wishlistCount}
        onClick={() => setIsWishlistOpen(true)}
      >
        <HeartIcon className="size-5" />
      </HeaderIconButton>
      <HeaderIconButton
        label="Cart"
        count={customerState.cartCount}
        onClick={() => setIsCartOpen(true)}
      >
        <ShoppingBagIcon className="size-5" />
      </HeaderIconButton>

      <AuthDialog open={isAuthOpen} onOpenChange={setIsAuthOpen} />
      <WishlistSheet
        items={customerState.wishlistItems}
        open={isWishlistOpen}
        onOpenChange={setIsWishlistOpen}
      />
      <CartSheet
        items={customerState.cartItems}
        isAuthenticated={customerState.isAuthenticated}
        isAuthLoading={customerState.isAuthLoading}
        isCheckingOut={isCheckingOut}
        open={isCartOpen}
        onOpenChange={setIsCartOpen}
        onAuthRequired={() => setIsAuthOpen(true)}
        onCheckout={async () => {
          setIsCheckingOut(true)

          try {
            await customerState.startCheckout()
          } finally {
            setIsCheckingOut(false)
          }
        }}
        onRemoveItem={customerState.removeCartItem}
        onSetQuantity={customerState.setCartItemQuantity}
      />
    </>
  )
}

function AuthDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const session = authClient.useSession()
  const [mode, setMode] = useState<AuthMode>("sign-in")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const user = session.data?.user
  const passwordMismatch =
    mode === "sign-up" &&
    confirmPassword.length > 0 &&
    password !== confirmPassword

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setErrorMessage(null)
      setSuccessMessage(null)
      setConfirmPassword("")
    }

    onOpenChange(nextOpen)
  }

  function switchMode(nextMode: AuthMode) {
    setErrorMessage(null)
    setSuccessMessage(null)
    setConfirmPassword("")
    setMode(nextMode)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      if (mode === "reset-request") {
        const result = await authClient.requestPasswordReset({
          email,
          redirectTo: `${window.location.origin}/reset-password`,
        })

        if (result.error) {
          throw result.error
        }

        setSuccessMessage("If an account exists, a reset link has been sent.")
        return
      }

      if (mode === "sign-up" && password !== confirmPassword) {
        throw new Error("Passwords do not match.")
      }

      const result =
        mode === "sign-in"
          ? await authClient.signIn.email({ email, password })
          : await authClient.signUp.email({
              email,
              password,
              name: email,
            })

      if (result.error) {
        throw result.error
      }

      onOpenChange(false)
      setPassword("")
      setConfirmPassword("")
    } catch (error) {
      setErrorMessage(betterAuthErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSignOut() {
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            window.location.reload()
          },
        },
      })
    } catch (error) {
      setErrorMessage(betterAuthErrorMessage(error))
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="rounded-none">
        {user ? (
          <>
            <DialogHeader>
              <DialogTitle>Account</DialogTitle>
              <DialogDescription>{user.email}</DialogDescription>
            </DialogHeader>
            {errorMessage ? (
              <p role="alert" className="text-sm font-medium text-destructive">
                {errorMessage}
              </p>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                disabled={isSubmitting}
                className="rounded-none"
                onClick={() => {
                  void handleSignOut()
                }}
              >
                {isSubmitting ? "Signing out" : "Sign out"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form
            onSubmit={(event) => {
              void handleSubmit(event)
            }}
          >
            <DialogHeader>
              <DialogTitle>
                {mode === "reset-request"
                  ? "Reset password"
                  : mode === "sign-in"
                    ? "Sign in"
                    : "Create account"}
              </DialogTitle>
              <DialogDescription>
                {mode === "reset-request"
                  ? "Enter your email to receive a reset link."
                  : "Save your cart and wishlist across devices."}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-5 grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="auth-email">Email</Label>
                <Input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              {mode !== "reset-request" ? (
                <div className="grid gap-2">
                  <Label htmlFor="auth-password">Password</Label>
                  <PasswordInput
                    id="auth-password"
                    autoComplete={
                      mode === "sign-in" ? "current-password" : "new-password"
                    }
                    required
                    minLength={8}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>
              ) : null}
              {mode === "sign-up" ? (
                <div className="grid gap-2">
                  <Label htmlFor="auth-confirm-password">
                    Confirm password
                  </Label>
                  <PasswordInput
                    id="auth-confirm-password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    aria-invalid={passwordMismatch || undefined}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                  {passwordMismatch ? (
                    <p className="text-sm font-medium text-destructive">
                      Passwords do not match.
                    </p>
                  ) : null}
                </div>
              ) : null}
              {errorMessage ? (
                <p
                  role="alert"
                  className="text-sm font-medium text-destructive"
                >
                  {errorMessage}
                </p>
              ) : null}
              {successMessage ? (
                <p className="text-sm font-medium text-[#166534]">
                  {successMessage}
                </p>
              ) : null}
            </div>

            <DialogFooter className="mt-5">
              <Button
                type="button"
                variant="ghost"
                disabled={isSubmitting}
                className="rounded-none"
                onClick={() => {
                  switchMode(mode === "sign-in" ? "sign-up" : "sign-in")
                }}
              >
                {mode === "sign-in" ? "Create account" : "Sign in"}
              </Button>
              {mode === "sign-in" ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  className="rounded-none"
                  onClick={() => switchMode("reset-request")}
                >
                  Reset password
                </Button>
              ) : null}
              <Button
                type="submit"
                disabled={isSubmitting || passwordMismatch}
                className="rounded-none"
              >
                {isSubmitting
                  ? "Working"
                  : mode === "reset-request"
                    ? "Send link"
                    : mode === "sign-in"
                      ? "Sign in"
                      : "Create account"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

function WishlistSheet({
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
                <Link
                  key={item.productId}
                  to="/products/$slug"
                  params={{ slug: item.productSlug }}
                  className="flex gap-3 py-3 transition hover:bg-muted/50"
                >
                  <ProductThumb
                    imageUrl={item.imageUrl}
                    name={item.productName}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 font-oswald text-base leading-5 font-bold tracking-wide uppercase">
                      {item.productName}
                    </div>
                    <div className="mt-1 text-sm font-semibold">
                      {formatPrice(item.basePriceCents, item.currency)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function CartSheet({
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
  const totalCents = items.reduce(
    (total, item) => total + item.unitPriceCents * item.quantity,
    0
  )
  const productCount = items.reduce((total, item) => total + item.quantity, 0)
  const productCountLabel = `${productCount} ${
    productCount === 1 ? "Product" : "Products"
  }`
  const currency = items[0]?.currency ?? "EUR"
  const checkoutLabel = isAuthenticated ? "Checkout" : "Sign in to checkout"
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setErrorMessage(null)
    }

    onOpenChange(nextOpen)
  }

  function handleRemoveItem(configurationKey: string) {
    setErrorMessage(null)

    void onRemoveItem(configurationKey).catch((error) => {
      setErrorMessage(getErrorMessage(error))
    })
  }

  function handleSetQuantity(configurationKey: string, quantity: number) {
    setErrorMessage(null)

    void onSetQuantity(configurationKey, quantity).catch((error) => {
      setErrorMessage(getErrorMessage(error))
    })
  }

  async function handleCheckout() {
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
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="gap-1 rounded-none sm:max-w-md">
        <SheetHeader className="pb-1">
          <SheetTitle className="font-oswald text-2xl font-bold tracking-wide uppercase">
            CART
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
              Your cart is empty.
            </p>
          ) : (
            <div className="divide-y">
              {items.map((item) => (
                <div
                  key={item.configurationKey}
                  className="grid grid-cols-[80px_minmax(0,1fr)] items-start gap-3 py-3"
                >
                  <Link
                    to="/products/$slug"
                    params={{ slug: item.productSlug }}
                  >
                    <ProductThumb
                      imageUrl={item.imageUrl}
                      name={item.productName}
                    />
                  </Link>
                  <div className="relative min-w-0 pr-9">
                    <Link
                      to="/products/$slug"
                      params={{ slug: item.productSlug }}
                      className="line-clamp-2 font-oswald text-base leading-5 font-bold tracking-wide uppercase hover:underline"
                    >
                      {item.productName}
                    </Link>
                    {item.configurationSummary.length > 0 && (
                      <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                        {item.configurationSummary.map((summary) => (
                          <div
                            key={`${item.configurationKey}-${summary.label}`}
                          >
                            {summary.label}:{" "}
                            {displayCartConfigurationValue(summary)}
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      aria-label="Remove from cart"
                      className="absolute top-0 right-0 grid size-8 place-items-center text-muted-foreground transition hover:text-foreground"
                      onClick={() => {
                        handleRemoveItem(item.configurationKey)
                      }}
                    >
                      <Trash2Icon className="size-4" />
                    </button>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="inline-grid grid-cols-[32px_40px_32px] bg-muted">
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          className="grid size-8 place-items-center"
                          onClick={() => {
                            handleSetQuantity(
                              item.configurationKey,
                              item.quantity - 1
                            )
                          }}
                        >
                          <MinusIcon className="size-3.5" />
                        </button>
                        <div className="grid h-8 place-items-center text-xs font-bold">
                          {item.quantity}
                        </div>
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          className="grid size-8 place-items-center"
                          onClick={() => {
                            handleSetQuantity(
                              item.configurationKey,
                              item.quantity + 1
                            )
                          }}
                        >
                          <PlusIcon className="size-3.5" />
                        </button>
                      </div>
                      <div className="ml-auto font-oswald text-sm font-medium">
                        {formatPrice(item.unitPriceCents, item.currency)}
                      </div>
                    </div>
                  </div>
                </div>
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
              onClick={() => {
                void handleCheckout()
              }}
            >
              <ShoppingBagIcon className="size-4" />
              {isCheckingOut ? "Opening checkout" : checkoutLabel}
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}

function ProductThumb({
  imageUrl,
  name,
}: {
  imageUrl: string | null
  name: string
}) {
  return (
    <div className="grid size-20 shrink-0 place-items-center overflow-hidden bg-[#eceff1]">
      {imageUrl ? (
        <img src={imageUrl} alt={name} className="size-full object-contain" />
      ) : (
        <ShoppingBagIcon className="size-5 text-muted-foreground" />
      )}
    </div>
  )
}
