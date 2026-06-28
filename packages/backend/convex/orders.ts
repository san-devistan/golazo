import { v } from "convex/values"

import { internal } from "./_generated/api"
import type { Doc, Id } from "./_generated/dataModel.d.ts"
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server"
import { checkoutFulfillmentStatusValidator } from "./shopValidators"

const ADMIN_ORDER_LIMIT = 100
const CUSTOMER_ORDER_LIMIT = 50
const ORDER_ITEM_LIMIT = 100
const MAX_ORDER_REFERENCE_LENGTH = 200

type CheckoutOrderId = Id<"checkoutOrders">
type CheckoutOrder = Doc<"checkoutOrders">
type CheckoutOrderItem = Doc<"checkoutOrderItems">
type ProductId = Id<"products">

function normalizeNullableText(value: string | null, maxLength: number) {
  const normalizedValue = value?.trim() ?? ""

  return normalizedValue ? normalizedValue.slice(0, maxLength) : null
}

async function listOrderItems(ctx: QueryCtx, orderId: CheckoutOrderId) {
  return await ctx.db
    .query("checkoutOrderItems")
    .withIndex("by_orderId", (q) => q.eq("orderId", orderId))
    .take(ORDER_ITEM_LIMIT)
}

async function listProductMetadata(ctx: QueryCtx, productId: ProductId) {
  return await ctx.db
    .query("productMetadata")
    .withIndex("by_productId_and_sortOrder", (q) =>
      q.eq("productId", productId)
    )
    .take(100)
}

async function listAdminOrderItems(ctx: QueryCtx, orderId: CheckoutOrderId) {
  const items = await listOrderItems(ctx, orderId)
  const metadataByProductId = new Map<
    ProductId,
    Promise<Awaited<ReturnType<typeof listProductMetadata>>>
  >()

  function metadataForItem(item: CheckoutOrderItem) {
    const existingMetadata = metadataByProductId.get(item.productId)
    if (existingMetadata) {
      return existingMetadata
    }

    const metadata = listProductMetadata(ctx, item.productId)
    metadataByProductId.set(item.productId, metadata)

    return metadata
  }

  return await Promise.all(
    items.map(async (item) => ({
      ...item,
      metadata: await metadataForItem(item),
    }))
  )
}

async function getOrderOrThrow(ctx: MutationCtx, orderId: CheckoutOrderId) {
  const order = await ctx.db.get(orderId)

  if (!order) {
    throw new Error("Order not found.")
  }

  return order
}

async function viewerTokenIdentifier(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity()

  return identity?.tokenIdentifier ?? null
}

function customerOrder(order: CheckoutOrder) {
  return {
    _id: order._id,
    commandId: order.commandId,
    status: order.status,
    fulfillmentStatus: order.fulfillmentStatus,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    shippingName: order.shippingName,
    shippingAddress: order.shippingAddress,
    trackingNumber: order.trackingNumber,
    trackingUrl: order.trackingUrl,
    amountTotalCents: order.amountTotalCents,
    currency: order.currency,
    stripePresentmentAmountCents: order.stripePresentmentAmountCents,
    stripePresentmentCurrency: order.stripePresentmentCurrency,
    productCount: order.productCount,
    failureReason: order.failureReason,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    completedAt: order.completedAt,
  }
}

async function customerOrderRecord(ctx: QueryCtx, order: CheckoutOrder) {
  return {
    order: customerOrder(order),
    items: await listOrderItems(ctx, order._id),
  }
}

export const listAdminOrders = query({
  args: {},
  handler: async (ctx) => {
    const orders = await ctx.db
      .query("checkoutOrders")
      .withIndex("by_status_and_createdAt", (q) => q.eq("status", "paid"))
      .order("desc")
      .take(ADMIN_ORDER_LIMIT)

    return await Promise.all(
      orders.map(async (order) => ({
        order,
        items: await listAdminOrderItems(ctx, order._id),
      }))
    )
  },
})

export const listViewerOrders = query({
  args: {},
  handler: async (ctx) => {
    const userTokenIdentifier = await viewerTokenIdentifier(ctx)

    if (!userTokenIdentifier) {
      return null
    }

    const orders = await ctx.db
      .query("checkoutOrders")
      .withIndex("by_userTokenIdentifier_and_createdAt", (q) =>
        q.eq("userTokenIdentifier", userTokenIdentifier)
      )
      .order("desc")
      .take(CUSTOMER_ORDER_LIMIT)

    return await Promise.all(
      orders.map((order) => customerOrderRecord(ctx, order))
    )
  },
})

export const getViewerOrderByCheckoutSession = query({
  args: {
    stripeCheckoutSessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const userTokenIdentifier = await viewerTokenIdentifier(ctx)

    if (!userTokenIdentifier) {
      return null
    }

    const order = await ctx.db
      .query("checkoutOrders")
      .withIndex("by_stripeCheckoutSessionId", (q) =>
        q.eq("stripeCheckoutSessionId", args.stripeCheckoutSessionId)
      )
      .unique()

    if (!order || order.userTokenIdentifier !== userTokenIdentifier) {
      return null
    }

    return await customerOrderRecord(ctx, order)
  },
})

export const updateFulfillment = mutation({
  args: {
    orderId: v.id("checkoutOrders"),
    fulfillmentStatus: checkoutFulfillmentStatusValidator,
    dropId: v.union(v.string(), v.null()),
    trackId: v.union(v.string(), v.null()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const order = await getOrderOrThrow(ctx, args.orderId)
    const previousFulfillmentStatus = order.fulfillmentStatus ?? "unfulfilled"
    const dropId = normalizeNullableText(
      args.dropId,
      MAX_ORDER_REFERENCE_LENGTH
    )
    const trackId = normalizeNullableText(
      args.trackId,
      MAX_ORDER_REFERENCE_LENGTH
    )

    await ctx.db.patch(order._id, {
      fulfillmentStatus: args.fulfillmentStatus,
      dropId,
      trackId,
      updatedAt: Date.now(),
    })

    if (previousFulfillmentStatus !== args.fulfillmentStatus) {
      await ctx.scheduler.runAfter(
        0,
        internal.orderEmails.sendFulfillmentStatusUpdate,
        {
          orderId: order._id,
          previousFulfillmentStatus,
          fulfillmentStatus: args.fulfillmentStatus,
        }
      )
    }

    return null
  },
})
