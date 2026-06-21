/* eslint-disable no-await-in-loop, no-underscore-dangle -- Convex order writes are transactional and documents expose _id fields. */

import { v, type Infer } from "convex/values"

import { internal } from "./_generated/api"
import { internalMutation } from "./_generated/server"
import { priceCartProductConfiguration } from "./cartPricing"
import {
  cartConfigurationSummaryValidator,
  checkoutOrderStatusValidator,
  checkoutShippingAddressValidator,
  type checkoutFulfillmentStatusValidator,
} from "./shopValidators"

const MAX_CHECKOUT_LINE_ITEMS = 100
const MAX_FAILURE_REASON_LENGTH = 500

const checkoutOrderItemSnapshotValidator = v.object({
  productId: v.id("products"),
  configurationKey: v.string(),
  configurationSummary: cartConfigurationSummaryValidator,
  productName: v.string(),
  productSlug: v.string(),
  imageUrl: v.union(v.string(), v.null()),
  unitPriceCents: v.number(),
  currency: v.string(),
  quantity: v.number(),
})

type CheckoutOrderStatus = Infer<typeof checkoutOrderStatusValidator>
type CheckoutFulfillmentStatus = Infer<
  typeof checkoutFulfillmentStatusValidator
>
type CheckoutOrderItemSnapshot = Infer<
  typeof checkoutOrderItemSnapshotValidator
>

function normalizeQuantity(quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error("Cart item quantity must be at least 1.")
  }

  return quantity
}

function normalizeFailureReason(reason: string | undefined) {
  return reason?.slice(0, MAX_FAILURE_REASON_LENGTH)
}

function commandIdForOrder(orderId: string, now: number) {
  const date = new Date(now).toISOString().slice(0, 10).replaceAll("-", "")
  const idSuffix = orderId.slice(-6).toUpperCase()

  return `GLZ-${date}-${idSuffix}`
}

export const createPendingOrderFromCart = internalMutation({
  args: {
    userTokenIdentifier: v.string(),
  },
  returns: v.object({
    orderId: v.id("checkoutOrders"),
    commandId: v.string(),
    amountTotalCents: v.number(),
    currency: v.string(),
    productCount: v.number(),
    items: v.array(checkoutOrderItemSnapshotValidator),
  }),
  handler: async (ctx, args) => {
    const cartItems = await ctx.db
      .query("cartItems")
      .withIndex("by_userTokenIdentifier_and_updatedAt", (q) =>
        q.eq("userTokenIdentifier", args.userTokenIdentifier)
      )
      .order("asc")
      .take(MAX_CHECKOUT_LINE_ITEMS + 1)

    if (cartItems.length === 0) {
      throw new Error("Your cart is empty.")
    }

    if (cartItems.length > MAX_CHECKOUT_LINE_ITEMS) {
      throw new Error("Your cart has too many unique items to checkout.")
    }

    const items: Array<CheckoutOrderItemSnapshot> = []
    let currency: string | null = null
    let amountTotalCents = 0
    let productCount = 0

    for (const item of cartItems) {
      const quantity = normalizeQuantity(item.quantity)
      const pricedProduct = await priceCartProductConfiguration(
        ctx,
        item.productId,
        item.configurationSummary
      )

      if (currency !== null && pricedProduct.currency !== currency) {
        throw new Error("Checkout supports one currency at a time.")
      }

      currency = pricedProduct.currency
      amountTotalCents += pricedProduct.unitPriceCents * quantity
      productCount += quantity
      items.push({
        productId: item.productId,
        configurationKey: item.configurationKey,
        configurationSummary: pricedProduct.configurationSummary,
        productName: pricedProduct.productName,
        productSlug: pricedProduct.productSlug,
        imageUrl: pricedProduct.imageUrl,
        unitPriceCents: pricedProduct.unitPriceCents,
        currency: pricedProduct.currency,
        quantity,
      })
    }

    if (amountTotalCents <= 0 || currency === null) {
      throw new Error("Checkout amount must be greater than zero.")
    }

    const now = Date.now()
    const orderId = await ctx.db.insert("checkoutOrders", {
      userTokenIdentifier: args.userTokenIdentifier,
      status: "pending",
      fulfillmentStatus: "unfulfilled",
      dropId: null,
      trackId: null,
      amountTotalCents,
      currency,
      productCount,
      createdAt: now,
      updatedAt: now,
    })
    const commandId = commandIdForOrder(orderId, now)

    await ctx.db.patch(orderId, { commandId })

    for (const item of items) {
      await ctx.db.insert("checkoutOrderItems", {
        orderId,
        ...item,
        createdAt: now,
      })
    }

    return {
      orderId,
      commandId,
      amountTotalCents,
      currency,
      productCount,
      items,
    }
  },
})

export const attachCheckoutSession = internalMutation({
  args: {
    orderId: v.id("checkoutOrders"),
    stripeCheckoutSessionId: v.string(),
    stripeCustomerId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId)

    if (!order) {
      throw new Error("Checkout order not found.")
    }

    await ctx.db.patch(order._id, {
      status: "open",
      stripeCheckoutSessionId: args.stripeCheckoutSessionId,
      stripeCustomerId: args.stripeCustomerId,
      updatedAt: Date.now(),
    })

    return null
  },
})

export const markCheckoutCreationFailed = internalMutation({
  args: {
    orderId: v.id("checkoutOrders"),
    failureReason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId)

    if (!order || order.status === "paid") {
      return null
    }

    await ctx.db.patch(order._id, {
      status: "failed",
      failureReason: normalizeFailureReason(args.failureReason),
      updatedAt: Date.now(),
    })

    return null
  },
})

export const completeOrderFromCheckoutSession = internalMutation({
  args: {
    stripeCheckoutSessionId: v.string(),
    status: checkoutOrderStatusValidator,
    commandId: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
    stripePaymentIntentId: v.optional(v.string()),
    stripePaymentStatus: v.optional(v.string()),
    customerEmail: v.optional(v.union(v.string(), v.null())),
    customerPhone: v.optional(v.union(v.string(), v.null())),
    shippingName: v.optional(v.union(v.string(), v.null())),
    shippingAddress: v.optional(
      v.union(checkoutShippingAddressValidator, v.null())
    ),
    failureReason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query("checkoutOrders")
      .withIndex("by_stripeCheckoutSessionId", (q) =>
        q.eq("stripeCheckoutSessionId", args.stripeCheckoutSessionId)
      )
      .unique()

    if (!order) {
      return null
    }

    const now = Date.now()
    const nextStatus: CheckoutOrderStatus = args.status
    const nextFulfillmentStatus: CheckoutFulfillmentStatus | undefined =
      nextStatus === "failed" || nextStatus === "expired"
        ? "cancelled"
        : (order.fulfillmentStatus ?? "unfulfilled")
    const shouldClearPurchasedCartItems =
      nextStatus === "paid" && order.status !== "paid"

    await ctx.db.patch(order._id, {
      status: nextStatus,
      fulfillmentStatus: nextFulfillmentStatus,
      ...(args.commandId !== undefined && {
        commandId: args.commandId,
      }),
      ...(args.stripeCustomerId !== undefined && {
        stripeCustomerId: args.stripeCustomerId,
      }),
      ...(args.stripePaymentIntentId !== undefined && {
        stripePaymentIntentId: args.stripePaymentIntentId,
      }),
      ...(args.stripePaymentStatus !== undefined && {
        stripePaymentStatus: args.stripePaymentStatus,
      }),
      ...(args.customerEmail !== undefined && {
        customerEmail: args.customerEmail,
      }),
      ...(args.customerPhone !== undefined && {
        customerPhone: args.customerPhone,
      }),
      ...(args.shippingName !== undefined && {
        shippingName: args.shippingName,
      }),
      ...(args.shippingAddress !== undefined && {
        shippingAddress: args.shippingAddress,
      }),
      ...(args.failureReason !== undefined && {
        failureReason: normalizeFailureReason(args.failureReason),
      }),
      ...(nextStatus === "paid" && { completedAt: order.completedAt ?? now }),
      updatedAt: now,
    })

    if (!shouldClearPurchasedCartItems) {
      return null
    }

    const orderItems = await ctx.db
      .query("checkoutOrderItems")
      .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
      .take(MAX_CHECKOUT_LINE_ITEMS)

    for (const orderItem of orderItems) {
      const cartItem = await ctx.db
        .query("cartItems")
        .withIndex("by_userTokenIdentifier_and_configurationKey", (q) =>
          q
            .eq("userTokenIdentifier", order.userTokenIdentifier)
            .eq("configurationKey", orderItem.configurationKey)
        )
        .unique()

      if (!cartItem) {
        continue
      }

      if (cartItem.quantity > orderItem.quantity) {
        await ctx.db.patch(cartItem._id, {
          quantity: cartItem.quantity - orderItem.quantity,
          updatedAt: now,
        })
        continue
      }

      await ctx.db.delete(cartItem._id)
    }

    await ctx.scheduler.runAfter(
      0,
      internal.orderEmails.sendOrderConfirmation,
      { orderId: order._id }
    )

    return null
  },
})
