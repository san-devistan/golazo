import type { GenericId } from "convex/values"

export type CheckoutOrderId = GenericId<"checkoutOrders">
export type ProductId = GenericId<"products">
export type ProductMetadataId = GenericId<"productMetadata">

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

export type ProductMetadataType = "text" | "number" | "boolean" | "link"

export type ShippingAddress = {
  line1: string | null
  line2: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  country: string | null
}

export type AdminOrderRecord = {
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

export type FulfillmentFormState = {
  fulfillmentStatus: FulfillmentStatus
  dropId: string
  trackId: string
}

export type UpdateFulfillmentInput = {
  orderId: CheckoutOrderId
  fulfillmentStatus: FulfillmentStatus
  dropId: string | null
  trackId: string | null
}

export const EMPTY_ORDER_RECORDS: Array<AdminOrderRecord> = []
export const FULFILLMENT_OPTIONS: Array<{
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
export const FULFILLMENT_STATUS_FIELD = "fulfillmentStatus"
export const DROP_ID_FIELD = "dropId"
export const TRACK_ID_FIELD = "trackId"
