import {
  CustomerOrderSummary,
  type CustomerOrderRecord,
} from "@/components/customer-order-summary"
import { PackageIcon } from "lucide-react"

const EMPTY_ORDERS: Array<CustomerOrderRecord> = []

export function OrdersSection({
  orders,
}: {
  orders: Array<CustomerOrderRecord> | null | undefined
}) {
  if (orders === undefined) {
    return <OrdersLoading />
  }

  if (orders === null) {
    return (
      <section className="border border-[#d9d9d9] p-8 text-center">
        <PackageIcon className="mx-auto mb-3 size-8 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Orders unavailable</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Refresh the page to load your orders.
        </p>
      </section>
    )
  }

  const orderRecords = orders.length > 0 ? orders : EMPTY_ORDERS

  return (
    <section className="grid gap-5">
      <div>
        <h2 className="text-2xl font-semibold">Orders</h2>
      </div>

      {orderRecords.length === 0 ? (
        <EmptyOrders />
      ) : (
        <div className="grid gap-4">
          {orderRecords.map((record) => (
            <CustomerOrderSummary key={record.order._id} record={record} />
          ))}
        </div>
      )}
    </section>
  )
}

function EmptyOrders() {
  return (
    <div className="grid place-items-center border border-[#d9d9d9] bg-white p-12 text-center">
      <PackageIcon className="mb-3 size-8 text-muted-foreground" />
      <h2 className="text-lg font-medium">No orders yet</h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        Your completed checkouts will appear here.
      </p>
    </div>
  )
}

function OrdersLoading() {
  return (
    <section className="grid gap-4">
      <div className="h-16 animate-pulse bg-[#f1f1f1]" />
      <div className="h-56 animate-pulse bg-[#f1f1f1]" />
      <div className="h-56 animate-pulse bg-[#f1f1f1]" />
    </section>
  )
}
