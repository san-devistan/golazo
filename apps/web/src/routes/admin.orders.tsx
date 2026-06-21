/* eslint-disable no-underscore-dangle, react-perf/jsx-no-new-function-as-prop */

import { formatPrice, getErrorMessage, hasConvexUrl } from "@/lib/shop"
import { Link, createFileRoute } from "@tanstack/react-router"
import { api } from "@workspace/backend/api"
import { Badge } from "@workspace/ui/components/badge"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  NativeSelect,
  NativeSelectOption,
} from "@workspace/ui/components/native-select"
import { toast } from "@workspace/ui/components/sonner"
import { useMutation, useQuery } from "convex/react"
import type { GenericId } from "convex/values"
import {
  ArrowLeftIcon,
  ClipboardListIcon,
  PackageIcon,
  SaveIcon,
} from "lucide-react"
import { type FormEvent, useState } from "react"

export const Route = createFileRoute("/admin/orders")({
  component: AdminOrdersPage,
})

type CheckoutOrderId = GenericId<"checkoutOrders">
type ProductId = GenericId<"products">
type ProductMetadataId = GenericId<"productMetadata">

type CheckoutStatus =
  | "pending"
  | "open"
  | "processing"
  | "paid"
  | "failed"
  | "expired"

type FulfillmentStatus =
  | "unfulfilled"
  | "preparing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded"

type ProductMetadataType = "text" | "number" | "boolean" | "link"

type ShippingAddress = {
  line1: string | null
  line2: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  country: string | null
}

type AdminOrderRecord = {
  order: {
    _id: CheckoutOrderId
    commandId?: string
    status: CheckoutStatus
    fulfillmentStatus?: FulfillmentStatus
    stripeCheckoutSessionId?: string
    stripeCustomerId?: string
    stripePaymentIntentId?: string
    stripePaymentStatus?: string
    customerEmail?: string | null
    customerPhone?: string | null
    shippingName?: string | null
    shippingAddress?: ShippingAddress | null
    dropId?: string | null
    trackId?: string | null
    amountTotalCents: number
    currency: string
    productCount: number
    failureReason?: string
    createdAt: number
    updatedAt: number
    completedAt?: number
  }
  items: Array<{
    _id: GenericId<"checkoutOrderItems">
    productId: ProductId
    productName: string
    productSlug: string
    imageUrl: string | null
    configurationSummary: Array<{ label: string; value: string }>
    metadata: Array<{
      _id: ProductMetadataId
      label: string
      type?: ProductMetadataType
      value: string
      linkUrl?: string | null
      showOnProductPage?: boolean
    }>
    unitPriceCents: number
    currency: string
    quantity: number
  }>
}

type FulfillmentFormState = {
  fulfillmentStatus: FulfillmentStatus
  dropId: string
  trackId: string
}

type UpdateFulfillmentInput = {
  orderId: CheckoutOrderId
  fulfillmentStatus: FulfillmentStatus
  dropId: string | null
  trackId: string | null
}

const EMPTY_ORDER_RECORDS: Array<AdminOrderRecord> = []
const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "short",
  timeStyle: "short",
  hourCycle: "h23",
})
const FULFILLMENT_OPTIONS: Array<{
  value: FulfillmentStatus
  label: string
}> = [
  { value: "unfulfilled", label: "Paid" },
  { value: "preparing", label: "Preparing" },
  { value: "shipped", label: "Shipping" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
]
const FULFILLMENT_STATUS_FIELD = "fulfillmentStatus"
const DROP_ID_FIELD = "dropId"
const TRACK_ID_FIELD = "trackId"

function AdminOrdersPage() {
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

  if (data === undefined) {
    return (
      <main className="min-h-svh bg-muted p-6">
        <div className="mx-auto h-[40rem] max-w-7xl animate-pulse rounded-lg bg-background" />
      </main>
    )
  }

  const orderRecords = data ?? EMPTY_ORDER_RECORDS

  async function handleUpdate(input: UpdateFulfillmentInput) {
    await updateFulfillment(input)
  }

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

function OrderPanel({
  record,
  onUpdate,
}: {
  record: AdminOrderRecord
  onUpdate: (input: UpdateFulfillmentInput) => Promise<void>
}) {
  const order = record.order
  const [isExpanded, setIsExpanded] = useState(false)
  const [form, setForm] = useState(() => orderToFormState(order))
  const [isSaving, setIsSaving] = useState(false)
  const commandId = order.commandId ?? shortId(order._id)
  const detailsId = `order-details-${order._id}`
  const shippingLines = formatShippingAddress(order.shippingAddress)
  const shippingAddressSummary = shippingLines.join(", ")

  function handleStatusChange(fulfillmentStatus: FulfillmentStatus) {
    setForm((current) => ({
      ...current,
      fulfillmentStatus,
    }))
    setIsExpanded(true)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)

    try {
      const formData = new FormData(event.currentTarget)
      const fulfillmentStatus = fulfillmentStatusFromFormData(formData)
      const dropId = formTextValue(formData, DROP_ID_FIELD)
      const trackId = formTextValue(formData, TRACK_ID_FIELD)

      setForm({ fulfillmentStatus, dropId, trackId })
      await onUpdate({
        orderId: order._id,
        fulfillmentStatus,
        dropId: nullableFormText(dropId),
        trackId: nullableFormText(trackId),
      })
      toast.success("Order updated.")
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form
      className="border border-[#111] bg-background p-4"
      onSubmit={(event) => {
        void handleSubmit(event)
      }}
    >
      <div className="min-w-0">
        <OrderPanelHeader
          commandId={commandId}
          detailsId={detailsId}
          isExpanded={isExpanded}
          order={order}
          status={form.fulfillmentStatus}
          onStatusChange={handleStatusChange}
          onToggle={() => setIsExpanded((current) => !current)}
        />

        {isExpanded ? (
          <div id={detailsId}>
            <OrderContactDetails
              address={shippingAddressSummary}
              customerEmail={order.customerEmail}
              customerPhone={order.customerPhone}
              shippingName={order.shippingName}
            />

            <div className="mt-4 border-t pt-4">
              <div className="divide-y">
                {record.items.map((item) => (
                  <OrderItemRow key={item._id} item={item} />
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-2 border-t pt-4 text-xs md:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
              <OrderId label="Stripe ID" value={order.stripePaymentIntentId} />
              <OrderId label="Customer ID" value={order.stripeCustomerId} />
              <EditableOrderId
                label="Drop ID"
                inputId={`drop-id-${order._id}`}
                name={DROP_ID_FIELD}
                value={form.dropId}
                onChange={(dropId) =>
                  setForm((current) => ({
                    ...current,
                    dropId,
                  }))
                }
              />
              <EditableOrderId
                label="Track ID"
                inputId={`track-id-${order._id}`}
                name={TRACK_ID_FIELD}
                value={form.trackId}
                onChange={(trackId) =>
                  setForm((current) => ({
                    ...current,
                    trackId,
                  }))
                }
              />
              <div className="flex items-end">
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-none"
                >
                  <SaveIcon />
                  {isSaving ? "Saving" : "Save"}
                </Button>
              </div>
            </div>
            {order.failureReason && (
              <p className="mt-3 text-sm text-destructive">
                {order.failureReason}
              </p>
            )}
          </div>
        ) : null}
      </div>
    </form>
  )
}

function OrderPanelHeader({
  commandId,
  detailsId,
  isExpanded,
  order,
  status,
  onStatusChange,
  onToggle,
}: {
  commandId: string
  detailsId: string
  isExpanded: boolean
  order: AdminOrderRecord["order"]
  status: FulfillmentStatus
  onStatusChange: (fulfillmentStatus: FulfillmentStatus) => void
  onToggle: () => void
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-controls={detailsId}
            aria-expanded={isExpanded}
            className="min-w-0 p-0 text-left"
            onClick={onToggle}
          >
            <h2 className="text-xl font-semibold hover:underline">
              {commandId}
            </h2>
          </button>
          <InlineStatusSelect
            orderId={order._id}
            value={status}
            onChange={onStatusChange}
          />
        </div>
        <button
          type="button"
          aria-controls={detailsId}
          aria-expanded={isExpanded}
          className="mt-1 block p-0 text-left text-sm text-muted-foreground hover:text-foreground"
          onClick={onToggle}
        >
          {formatDateTime(orderDate(order))}
        </button>
      </div>
      <button
        type="button"
        aria-controls={detailsId}
        aria-expanded={isExpanded}
        className="p-0 text-right"
        onClick={onToggle}
      >
        <div className="font-oswald text-2xl font-medium">
          {formatPrice(order.amountTotalCents, order.currency)}
        </div>
        <div className="text-xs text-muted-foreground">
          {order.productCount} item{order.productCount === 1 ? "" : "s"}
        </div>
      </button>
    </div>
  )
}

function OrderItemRow({ item }: { item: AdminOrderRecord["items"][number] }) {
  return (
    <div className="grid grid-cols-[64px_minmax(0,1fr)] gap-3 py-3 text-sm sm:grid-cols-[64px_minmax(0,1fr)_7rem] sm:items-start">
      <OrderItemThumbnail
        imageUrl={item.imageUrl}
        productName={item.productName}
        productSlug={item.productSlug}
      />
      <div className="min-w-0">
        <a
          href={`/products/${item.productSlug}`}
          className="font-medium hover:underline"
        >
          {item.productName}
        </a>
        {(item.configurationSummary.length > 0 || item.metadata.length > 0) && (
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {item.configurationSummary.map((summary) => (
              <span key={`${item._id}-${summary.label}`}>
                {summary.label}: {summary.value}
              </span>
            ))}
            <OrderItemMetadata metadata={item.metadata} />
          </div>
        )}
      </div>
      <OrderItemTotal
        currency={item.currency}
        quantity={item.quantity}
        totalCents={item.unitPriceCents * item.quantity}
      />
    </div>
  )
}

function OrderItemThumbnail({
  imageUrl,
  productName,
  productSlug,
}: {
  imageUrl: string | null
  productName: string
  productSlug: string
}) {
  return (
    <a
      href={`/products/${productSlug}`}
      className="grid size-16 place-items-center overflow-hidden bg-[#eceff1]"
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={productName}
          className="size-full object-contain"
        />
      ) : (
        <PackageIcon className="size-5 text-muted-foreground" />
      )}
    </a>
  )
}

function OrderItemTotal({
  currency,
  quantity,
  totalCents,
}: {
  currency: string
  quantity: number
  totalCents: number
}) {
  return (
    <div className="font-medium sm:text-right">
      {formatPrice(totalCents, currency)}
      <div className="mt-1 text-xs font-normal text-muted-foreground">
        x {quantity}
      </div>
    </div>
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

function OrderContactDetails({
  address,
  customerEmail,
  customerPhone,
  shippingName,
}: {
  address: string
  customerEmail?: string | null
  customerPhone?: string | null
  shippingName?: string | null
}) {
  return (
    <div className="mt-4 grid gap-x-6 gap-y-3 border-t pt-4 text-sm sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,2fr)]">
      <OrderInfoField
        fallback="Email pending"
        label="Customer"
        value={customerEmail}
      />
      <OrderInfoField
        fallback="Phone pending"
        label="Phone"
        value={customerPhone}
      />
      <OrderInfoField
        fallback="Recipient pending"
        label="Ship to"
        value={shippingName}
      />
      <OrderInfoField
        fallback="Address pending"
        label="Address"
        value={address}
        valueClassName="whitespace-normal"
      />
    </div>
  )
}

function OrderInfoField({
  label,
  value,
  fallback,
  valueClassName,
}: {
  label: string
  value?: string | null
  fallback?: string
  valueClassName?: string
}) {
  const displayValue = value?.trim() || fallback || "Not set"
  const colorClassName = value?.trim() ? "" : " text-muted-foreground"
  const displayClassName = `mt-1 truncate${colorClassName}${
    valueClassName ? ` ${valueClassName}` : ""
  }`

  return (
    <div className="min-w-0">
      <div className="text-xs font-medium text-muted-foreground uppercase">
        {label}
      </div>
      <div className={displayClassName}>{displayValue}</div>
    </div>
  )
}

function OrderId({ label, value }: { label: string; value?: string | null }) {
  const displayValue = value?.trim() || "Pending"

  return (
    <div className="min-w-0">
      <div className="text-muted-foreground">{label}</div>
      <div className="truncate font-mono text-[11px]">{displayValue}</div>
    </div>
  )
}

function InlineStatusSelect({
  orderId,
  value,
  onChange,
}: {
  orderId: CheckoutOrderId
  value: FulfillmentStatus
  onChange: (value: FulfillmentStatus) => void
}) {
  return (
    <div className="inline-flex items-center">
      <Label htmlFor={`fulfillment-${orderId}`} className="sr-only">
        Status
      </Label>
      <NativeSelect
        id={`fulfillment-${orderId}`}
        name={FULFILLMENT_STATUS_FIELD}
        size="sm"
        value={value}
        className="w-auto [&_select]:h-6 [&_select]:rounded-full [&_select]:border-transparent [&_select]:bg-secondary [&_select]:py-0 [&_select]:pr-7 [&_select]:pl-2.5 [&_select]:text-xs [&_select]:font-medium [&_svg]:right-2 [&_svg]:size-3"
        onChange={(event) => onChange(event.target.value as FulfillmentStatus)}
      >
        {FULFILLMENT_OPTIONS.map((option) => (
          <NativeSelectOption key={option.value} value={option.value}>
            {option.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  )
}

function EditableOrderId({
  label,
  inputId,
  name,
  value,
  onChange,
}: {
  label: string
  inputId: string
  name: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="min-w-0">
      <Label htmlFor={inputId} className="text-muted-foreground">
        {label}
      </Label>
      <Input
        id={inputId}
        name={name}
        value={value}
        placeholder="Pending"
        className="mt-1 h-8 rounded-none px-2 font-mono text-[11px]"
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}

function OrderItemMetadata({
  metadata,
}: {
  metadata: AdminOrderRecord["items"][number]["metadata"]
}) {
  return metadata.map((item) => {
    const href = metadataLinkHref(item)

    if (!href) {
      return (
        <span key={item._id}>
          {item.label}: {item.value}
        </span>
      )
    }

    return (
      <span key={item._id}>
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-4 hover:text-primary"
        >
          {item.label}
        </a>
      </span>
    )
  })
}

function metadataLinkHref(
  item: AdminOrderRecord["items"][number]["metadata"][number]
) {
  const rawValue = item.type === "link" ? item.value : item.linkUrl
  const value = rawValue?.trim()
  if (!value) {
    return null
  }

  const urlText = /^[a-z][a-z0-9+.-]*:/i.test(value)
    ? value
    : `https://${value}`

  try {
    const url = new URL(urlText)

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null
    }

    return url.href
  } catch {
    return null
  }
}

function orderToFormState(
  order: AdminOrderRecord["order"]
): FulfillmentFormState {
  return {
    fulfillmentStatus: order.fulfillmentStatus ?? "unfulfilled",
    dropId: order.dropId ?? "",
    trackId: order.trackId ?? "",
  }
}

function nullableFormText(value: string) {
  const normalizedValue = value.trim()

  return normalizedValue ? normalizedValue : null
}

function formTextValue(formData: FormData, name: string) {
  const value = formData.get(name)

  return typeof value === "string" ? value : ""
}

function fulfillmentStatusFromFormData(formData: FormData): FulfillmentStatus {
  const value = formTextValue(formData, FULFILLMENT_STATUS_FIELD)

  if (isFulfillmentStatus(value)) {
    return value
  }

  throw new Error("Choose a valid order status.")
}

function isFulfillmentStatus(value: string): value is FulfillmentStatus {
  return FULFILLMENT_OPTIONS.some((option) => option.value === value)
}

function shortId(value: string) {
  return value.slice(-8).toUpperCase()
}

function formatDateTime(value: number) {
  return DATE_TIME_FORMATTER.format(new Date(value))
}

function orderDate(order: AdminOrderRecord["order"]) {
  return order.completedAt ?? order.createdAt
}

function formatShippingAddress(address: ShippingAddress | null | undefined) {
  if (!address) {
    return []
  }

  const cityLine = [address.postalCode, address.city].filter(Boolean).join(" ")
  const regionLine = [address.state, address.country].filter(Boolean).join(", ")

  return [address.line1, address.line2, cityLine, regionLine].filter(
    (line): line is string => Boolean(line)
  )
}
