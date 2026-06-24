import type { CustomerOrderRecord } from "@/components/customer-order-summary"
import { ShopFooter } from "@/components/shop-footer"
import { ShopHeader, type ShopHeaderCategory } from "@/components/shop-header"
import { authClient } from "@/lib/auth-client"
import { hasConvexUrl } from "@/lib/shop"
import { OrdersSection } from "@/routes/account/-orders"
import { ProfileSection } from "@/routes/account/-profile"
import {
  AccountLoading,
  MissingBackend,
  SignInRequired,
} from "@/routes/account/-states"
import { Link } from "@tanstack/react-router"
import { api } from "@workspace/backend/api"
import { Button } from "@workspace/ui/components/button"
import { buttonVariants } from "@workspace/ui/lib/button-variants"
import { cn } from "@workspace/ui/lib/utils"
import { useQuery } from "convex/react"
import { ArrowLeftIcon, LogOutIcon } from "lucide-react"
import { useCallback, useState } from "react"

const EMPTY_CATEGORIES: Array<ShopHeaderCategory> = []

export function AccountPage() {
  if (!hasConvexUrl()) {
    return <MissingBackend />
  }

  return <AccountDashboard />
}

function AccountDashboard() {
  const session = authClient.useSession()
  const catalog = useQuery(api.shop.listCatalog)
  const orders = useQuery(api.orders.listViewerOrders) as
    | Array<CustomerOrderRecord>
    | null
    | undefined
  const categories = catalog?.categories ?? EMPTY_CATEGORIES
  const user = session.data?.user

  return (
    <main className="min-h-svh bg-white text-[#111]">
      <ShopHeader categories={categories} />
      <section className="mx-auto max-w-6xl px-4 pt-3 pb-12 sm:px-6 lg:px-10">
        <Link
          to="/"
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "mb-4 rounded-none"
          )}
        >
          <ArrowLeftIcon />
          Continue shopping
        </Link>

        {session.isPending ? (
          <AccountLoading />
        ) : user ? (
          <SignedInAccount
            email={user.email}
            orders={orders}
            userId={user.id}
          />
        ) : (
          <SignInRequired />
        )}
      </section>
      <ShopFooter categories={categories} />
    </main>
  )
}

function SignedInAccount({
  email,
  orders,
  userId,
}: {
  email: string
  orders: Array<CustomerOrderRecord> | null | undefined
  userId: string
}) {
  const [isSigningOut, setIsSigningOut] = useState(false)

  const signOut = useCallback(async () => {
    setIsSigningOut(true)

    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            window.location.assign("/")
          },
        },
      })
    } finally {
      setIsSigningOut(false)
    }
  }, [])

  const handleSignOut = useCallback(() => {
    void signOut()
  }, [signOut])

  return (
    <div className="grid gap-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-oswald text-5xl leading-none font-bold tracking-wide uppercase">
            Account
          </h1>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-fit rounded-none"
          disabled={isSigningOut}
          onClick={handleSignOut}
        >
          <LogOutIcon />
          {isSigningOut ? "Signing out" : "Sign out"}
        </Button>
      </header>

      <ProfileSection email={email} userId={userId} />
      <OrdersSection orders={orders} />
    </div>
  )
}
