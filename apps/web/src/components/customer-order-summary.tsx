import { useExactMoneyFormatter, useMoneyFormatter } from "@/lib/preferences"
import { Badge } from "@workspace/ui/components/badge"
import { buttonVariants } from "@workspace/ui/lib/button-variants"
import { cn } from "@workspace/ui/lib/utils"
import type { GenericId } from "convex/values"
import {
  AlertTriangleIcon,
  ExternalLinkIcon,
  PackageIcon,
  TruckIcon,
} from "lucide-react"

export type CheckoutStatus =
  | "pending"
  | "open"
  | "processing"
  | "paid"
  | "failed"
  | "expired"

export type FulfillmentStatus =
  | "unfulfilled"
  | "preparing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded"

type OrderFlowStatus =
  | "paid"
  | "preparing"
  | "shipping"
  | "delivered"
  | "cancelled"
  | "refunded"
  | "processing"
  | "pending"

export type ShippingAddress = {
  line1: string | null
  line2: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  country: string | null
}

export type CustomerOrderRecord = {
  order: {
    _id: GenericId<"checkoutOrders">
    commandId?: string
    status: CheckoutStatus
    fulfillmentStatus?: FulfillmentStatus
    customerEmail?: string | null
    customerPhone?: string | null
    shippingName?: string | null
    shippingAddress?: ShippingAddress | null
    trackingNumber?: string | null
    trackingUrl?: string | null
    amountTotalCents: number
    currency: string
    stripePresentmentAmountCents?: number
    stripePresentmentCurrency?: string
    productCount: number
    failureReason?: string
    createdAt: number
    updatedAt: number
    completedAt?: number
  }
  items: Array<{
    _id: GenericId<"checkoutOrderItems">
    productName: string
    productSlug: string
    imageUrl: string | null
    configurationSummary: Array<{ label: string; value: string }>
    unitPriceCents: number
    currency: string
    quantity: number
  }>
}

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "short",
  timeStyle: "short",
  hourCycle: "h23",
  timeZone: "UTC",
})

export function CustomerOrderSummary({
  record,
  priority = false,
}: {
  record: CustomerOrderRecord
  priority?: boolean
}) {
  const formatPrice = useMoneyFormatter()
  const formatExactPrice = useExactMoneyFormatter()
  const { order } = record
  const orderTotal =
    order.stripePresentmentAmountCents !== undefined
      ? formatExactPrice(
          order.stripePresentmentAmountCents,
          order.stripePresentmentCurrency ?? order.currency
        )
      : formatPrice(order.amountTotalCents, order.currency)
  const commandId = order.commandId ?? shortId(order._id)
  const currentStatus = orderFlowStatus(order)
  const trackingLabel = order.trackingNumber
    ? `Tracking ${order.trackingNumber}`
    : "Tracking available"

  return (
    <article
      className={cn(
        "border border-[#111] bg-white p-4 text-[#111]",
        priority && "border-[#111]"
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-oswald text-2xl leading-none font-bold tracking-wide uppercase">
              {commandId}
            </h3>
            <OrderFlowStatusBadge status={currentStatus} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {formatDateTime(orderDate(order))}
          </p>
        </div>
        <div className="shrink-0 sm:text-right">
          <div className="font-oswald text-2xl font-medium">{orderTotal}</div>
          <div className="text-xs text-muted-foreground">
            {order.productCount} item{order.productCount === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      {order.trackingUrl ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-y border-[#d9d9d9] py-3">
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <TruckIcon className="size-4 shrink-0" />
            <span className="truncate">{trackingLabel}</span>
          </div>
          <a
            href={order.trackingUrl}
            target="_blank"
            rel="noreferrer"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "rounded-none"
            )}
          >
            Track package
            <ExternalLinkIcon />
          </a>
        </div>
      ) : null}

      <div className="mt-4 divide-y divide-[#eeeeee]">
        {record.items.map((item) => (
          <div
            key={item._id}
            className="grid grid-cols-[64px_minmax(0,1fr)] gap-3 py-3 text-sm sm:grid-cols-[64px_minmax(0,1fr)_7rem] sm:items-start"
          >
            <a
              href={`/products/${item.productSlug}`}
              className="grid size-16 place-items-center overflow-hidden bg-[#eceff1]"
            >
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.productName}
                  className="size-full object-contain"
                />
              ) : (
                <PackageIcon className="size-5 text-muted-foreground" />
              )}
            </a>
            <div className="min-w-0">
              <a
                href={`/products/${item.productSlug}`}
                className="line-clamp-2 font-medium hover:underline"
              >
                {item.productName}
              </a>
              {item.configurationSummary.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {item.configurationSummary.map((summary) => (
                    <span key={`${item._id}-${summary.label}`}>
                      {summary.label}: {summary.value}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="font-medium sm:text-right">
              {formatPrice(item.unitPriceCents * item.quantity, item.currency)}
              <div className="mt-1 text-xs font-normal text-muted-foreground">
                x {item.quantity}
              </div>
            </div>
          </div>
        ))}
      </div>

      {order.failureReason ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-destructive">
          <AlertTriangleIcon className="size-4" />
          {order.failureReason}
        </p>
      ) : null}
    </article>
  )
}

function OrderFlowStatusBadge({ status }: { status: OrderFlowStatus }) {
  const variant =
    status === "paid" || status === "delivered"
      ? "default"
      : status === "cancelled" || status === "refunded"
        ? "destructive"
        : "secondary"

  return <Badge variant={variant}>{orderFlowStatusLabel(status)}</Badge>
}

function formatDateTime(value: number) {
  return DATE_TIME_FORMATTER.format(new Date(value))
}

function orderDate(order: CustomerOrderRecord["order"]) {
  return order.completedAt ?? order.createdAt
}

function orderFlowStatus(order: CustomerOrderRecord["order"]): OrderFlowStatus {
  const fulfillmentStatus = order.fulfillmentStatus ?? "unfulfilled"

  if (fulfillmentStatus === "cancelled" || fulfillmentStatus === "refunded") {
    return fulfillmentStatus
  }

  if (order.status === "failed" || order.status === "expired") {
    return "cancelled"
  }

  if (order.status !== "paid") {
    return order.status === "processing" ? "processing" : "pending"
  }

  if (fulfillmentStatus === "preparing") {
    return "preparing"
  }

  if (fulfillmentStatus === "shipped") {
    return "shipping"
  }

  if (fulfillmentStatus === "delivered") {
    return "delivered"
  }

  return "paid"
}

function orderFlowStatusLabel(status: OrderFlowStatus) {
  const labels: Record<OrderFlowStatus, string> = {
    paid: "Paid",
    preparing: "Preparing",
    shipping: "Shipping",
    delivered: "Delivered",
    cancelled: "Cancelled",
    refunded: "Refunded",
    processing: "Processing",
    pending: "Pending",
  }

  return labels[status]
}

function shortId(value: string) {
  return value.slice(-8).toUpperCase()
}
