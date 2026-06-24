import { hasConvexUrl } from "@/lib/shop"
import { OrderPanel } from "@/routes/admin/orders/-panel"
import {
  EMPTY_ORDER_RECORDS,
  type AdminOrderRecord,
  type UpdateFulfillmentInput,
} from "@/routes/admin/orders/-types"
import { Link } from "@tanstack/react-router"
import { api } from "@workspace/backend/api"
import { Badge } from "@workspace/ui/components/badge"
import { buttonVariants } from "@workspace/ui/lib/button-variants"
import { useMutation, useQuery } from "convex/react"
import { ArrowLeftIcon, ClipboardListIcon } from "lucide-react"
import { useCallback } from "react"

export function AdminOrdersPage() {
  if (!hasConvexUrl()) {
    return <MissingBackend />
  }

  return <AdminOrders />
}

function AdminOrders() {
  const data = useQuery(api.orders.listAdminOrders) as
    | Array<AdminOrderRecord>
    | undefined
  const updateFulfillment = useMutation(api.orders.updateFulfillment)
  const handleUpdate = useCallback(
    async (input: UpdateFulfillmentInput) => {
      await updateFulfillment(input)
    },
    [updateFulfillment]
  )

  if (data === undefined) {
    return (
      <main className="min-h-svh bg-muted p-6">
        <div className="mx-auto h-[40rem] max-w-7xl animate-pulse rounded-lg bg-background" />
      </main>
    )
  }

  const orderRecords = data ?? EMPTY_ORDER_RECORDS

  return (
    <main className="min-h-svh bg-[linear-gradient(180deg,var(--background),var(--muted))]">
      <header className="border-b bg-background/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/admin" className={buttonVariants({ variant: "ghost" })}>
            <ArrowLeftIcon />
            Admin
          </Link>
          <Badge variant="destructive">Admin is public until auth exists</Badge>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 pt-4 pb-8 sm:px-6">
        <div className="mb-7">
          <h1 className="text-3xl font-semibold tracking-normal">
            Checkout orders
          </h1>
        </div>

        {orderRecords.length === 0 ? (
          <EmptyOrders />
        ) : (
          <div className="grid gap-4">
            {orderRecords.map((record) => (
              <OrderPanel
                key={`${record.order._id}-${record.order.updatedAt}`}
                record={record}
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

function MissingBackend() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted p-6">
      <section className="w-full max-w-lg rounded-lg border bg-background p-6">
        <h1 className="text-xl font-semibold">Connect Convex first</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Set `VITE_CONVEX_URL` in `apps/web/.env.local`, then restart the web
          dev server.
        </p>
      </section>
    </main>
  )
}

function EmptyOrders() {
  return (
    <div className="grid place-items-center border bg-background p-12 text-center">
      <ClipboardListIcon className="mb-3 size-8 text-muted-foreground" />
      <h2 className="text-lg font-medium">No orders yet</h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        Completed Stripe Checkout sessions will appear here after the webhook
        syncs them into Convex.
      </p>
    </div>
  )
}
