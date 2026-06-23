import {
  CustomerOrderSummary,
  type CustomerOrderRecord,
} from "@/components/customer-order-summary"
import { ShopHeader, type ShopHeaderCategory } from "@/components/shop-header"
import { authClient } from "@/lib/auth-client"
import { Link } from "@tanstack/react-router"
import { api } from "@workspace/backend/api"
import { buttonVariants } from "@workspace/ui/lib/button-variants"
import { cn } from "@workspace/ui/lib/utils"
import { useQuery } from "convex/react"
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  PackageSearchIcon,
  ShoppingBagIcon,
} from "lucide-react"

type CheckoutSuccessSearch = {
  session_id?: string
}

const EMPTY_CATEGORIES: Array<ShopHeaderCategory> = []

function CheckoutSuccess({ search }: { search: CheckoutSuccessSearch }) {
  const session = authClient.useSession()
  const catalog = useQuery(api.shop.listCatalog)
  const order = useQuery(api.orders.getViewerOrderByCheckoutSession, {
    stripeCheckoutSessionId: search.session_id ?? "",
  }) as CustomerOrderRecord | null | undefined
  const categories = catalog?.categories ?? EMPTY_CATEGORIES
  const user = session.data?.user

  return (
    <main className="min-h-svh bg-white text-[#111]">
      <ShopHeader categories={categories} />
      <section className="mx-auto grid max-w-5xl gap-8 px-4 pt-10 pb-14 sm:px-6 lg:px-10">
        {session.isPending ? (
          <SuccessLoading />
        ) : !user ? (
          <SignedOutSuccess />
        ) : !search.session_id ? (
          <UnmatchedSuccess />
        ) : order === undefined ? (
          <SuccessLoading />
        ) : order ? (
          <MatchedSuccess record={order} />
        ) : (
          <UnmatchedSuccess />
        )}
      </section>
    </main>
  )
}

function MatchedSuccess({ record }: { record: CustomerOrderRecord }) {
  const title =
    record.order.status === "paid" ? "Order confirmed" : "Order received"

  return (
    <>
      <header className="grid gap-5 border-b border-[#d9d9d9] pb-7">
        <div className="grid size-12 place-items-center bg-[#111] text-white">
          <CheckCircle2Icon className="size-6" />
        </div>
        <div>
          <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
            Checkout complete
          </p>
          <h1 className="font-oswald text-5xl leading-none font-bold tracking-wide uppercase">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            We saved your order details to your account.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/account" className={cn(buttonVariants(), "rounded-none")}>
            View account
            <ArrowRightIcon />
          </Link>
          <Link
            to="/"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "rounded-none"
            )}
          >
            Continue shopping
          </Link>
        </div>
      </header>

      <CustomerOrderSummary record={record} priority />
    </>
  )
}

function SignedOutSuccess() {
  return (
    <section className="mx-auto grid max-w-lg place-items-center border border-[#d9d9d9] bg-white p-10 text-center">
      <ShoppingBagIcon className="mb-3 size-8 text-muted-foreground" />
      <h1 className="text-xl font-semibold">Order received</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Sign in to view your order details.
      </p>
      <Link to="/" className={cn(buttonVariants(), "mt-5 rounded-none")}>
        Continue shopping
      </Link>
    </section>
  )
}

function UnmatchedSuccess() {
  return (
    <section className="mx-auto grid max-w-lg place-items-center border border-[#d9d9d9] bg-white p-10 text-center">
      <PackageSearchIcon className="mb-3 size-8 text-muted-foreground" />
      <h1 className="text-xl font-semibold">Order is being confirmed</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Your account page will show the order once checkout details finish
        syncing.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Link to="/account" className={cn(buttonVariants(), "rounded-none")}>
          View account
          <ArrowRightIcon />
        </Link>
        <Link
          to="/"
          className={cn(buttonVariants({ variant: "outline" }), "rounded-none")}
        >
          Continue shopping
        </Link>
      </div>
    </section>
  )
}

function SuccessLoading() {
  return (
    <div className="grid gap-6">
      <div className="h-44 animate-pulse bg-[#f1f1f1]" />
      <div className="h-72 animate-pulse bg-[#f1f1f1]" />
    </div>
  )
}

export { CheckoutSuccess }
export type { CheckoutSuccessSearch }
