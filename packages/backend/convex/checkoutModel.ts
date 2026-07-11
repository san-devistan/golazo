import { v, type Infer } from "convex/values"

import { internal } from "./_generated/api"
import type { Doc } from "./_generated/dataModel.d.ts"
import { internalMutation, type MutationCtx } from "./_generated/server"
import { priceCartProductConfiguration } from "./cartPricing"
import {
  BASE_CURRENCY,
  checkoutCurrencyValidator,
  convertFromEurCents,
} from "./currency"
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
  currency: checkoutCurrencyValidator,
  quantity: v.number(),
})

type CheckoutOrderStatus = Infer<typeof checkoutOrderStatusValidator>
type CheckoutFulfillmentStatus = Infer<
  typeof checkoutFulfillmentStatusValidator
>
type CheckoutOrderItemSnapshot = Infer<
  typeof checkoutOrderItemSnapshotValidator
>
type CheckoutOrder = Doc<"checkoutOrders">
type CompleteOrderArgs = {
  status: CheckoutOrderStatus
  commandId?: string
  stripeCustomerId?: string
  stripePaymentIntentId?: string
  stripePaymentStatus?: string
  stripePresentmentAmountCents?: number
  stripePresentmentCurrency?: string
  customerEmail?: string | null
  customerPhone?: string | null
  shippingName?: string | null
  shippingAddress?: CheckoutOrder["shippingAddress"]
  failureReason?: string
}

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

function fulfillmentStatusForCompletion(
  status: CheckoutOrderStatus,
  currentStatus: CheckoutFulfillmentStatus | undefined
): CheckoutFulfillmentStatus {
  if (status === "failed" || status === "expired") {
    return "cancelled"
  }

  return currentStatus ?? "unfulfilled"
}

function assignIfDefined<T extends object, K extends keyof T>(
  target: Partial<T>,
  key: K,
  value: T[K] | undefined
) {
  if (value !== undefined) {
    target[key] = value
  }
}

function checkoutCompletionPatch(
  order: CheckoutOrder,
  args: CompleteOrderArgs,
  now: number
): Partial<CheckoutOrder> {
  const patch: Partial<CheckoutOrder> = {
    status: args.status,
    fulfillmentStatus: fulfillmentStatusForCompletion(
      args.status,
      order.fulfillmentStatus
    ),
    updatedAt: now,
  }

  assignIfDefined(patch, "commandId", args.commandId)
  assignIfDefined(patch, "stripeCustomerId", args.stripeCustomerId)
  assignIfDefined(patch, "stripePaymentIntentId", args.stripePaymentIntentId)
  assignIfDefined(patch, "stripePaymentStatus", args.stripePaymentStatus)
  assignIfDefined(
    patch,
    "stripePresentmentAmountCents",
    args.stripePresentmentAmountCents
  )
  assignIfDefined(
    patch,
    "stripePresentmentCurrency",
    args.stripePresentmentCurrency
  )
  assignIfDefined(patch, "customerEmail", args.customerEmail)
  assignIfDefined(patch, "customerPhone", args.customerPhone)
  assignIfDefined(patch, "shippingName", args.shippingName)
  assignIfDefined(patch, "shippingAddress", args.shippingAddress)

  if (args.failureReason !== undefined) {
    patch.failureReason = normalizeFailureReason(args.failureReason)
  }

  if (args.status === "paid") {
    patch.completedAt = order.completedAt ?? now
  }

  return patch
}

async function clearPurchasedCartItems(
  ctx: MutationCtx,
  order: CheckoutOrder,
  now: number
) {
  const orderItems = await ctx.db
    .query("checkoutOrderItems")
    .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
    .take(MAX_CHECKOUT_LINE_ITEMS)

  await Promise.all(
    orderItems.map(async (orderItem) => {
      const cartItem = await ctx.db
        .query("cartItems")
        .withIndex("by_userTokenIdentifier_and_configurationKey", (q) =>
          q
            .eq("userTokenIdentifier", order.userTokenIdentifier)
            .eq("configurationKey", orderItem.configurationKey)
        )
        .unique()

      if (!cartItem) {
        return
      }

      if (cartItem.quantity > orderItem.quantity) {
        await ctx.db.patch(cartItem._id, {
          quantity: cartItem.quantity - orderItem.quantity,
          updatedAt: now,
        })
        return
      }

      await ctx.db.delete(cartItem._id)
    })
  )
}

export const createPendingOrderFromCart = internalMutation({
  args: {
    userTokenIdentifier: v.string(),
    displayCurrency: checkoutCurrencyValidator,
    eurToUsdRate: v.number(),
  },
  returns: v.object({
    orderId: v.id("checkoutOrders"),
    commandId: v.string(),
    amountTotalCents: v.number(),
    currency: checkoutCurrencyValidator,
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

    const items = await Promise.all(
      cartItems.map(async (item) => {
        const quantity = normalizeQuantity(item.quantity)
        const pricedProduct = await priceCartProductConfiguration(
          ctx,
          item.productId,
          item.configurationSummary
        )

        if (pricedProduct.currency.toUpperCase() !== BASE_CURRENCY) {
          throw new Error("Checkout products must be priced in EUR.")
        }

        const unitPriceCents = convertFromEurCents({
          amountCents: pricedProduct.unitPriceCents,
          eurToUsdRate: args.eurToUsdRate,
          targetCurrency: args.displayCurrency,
        })

        return {
          productId: item.productId,
          configurationKey: item.configurationKey,
          configurationSummary: pricedProduct.configurationSummary,
          productName: pricedProduct.productName,
          productSlug: pricedProduct.productSlug,
          imageUrl: pricedProduct.imageUrl,
          unitPriceCents,
          currency: args.displayCurrency,
          quantity,
        } satisfies CheckoutOrderItemSnapshot
      })
    )
    const amountTotalCents = items.reduce(
      (total, item) => total + item.unitPriceCents * item.quantity,
      0
    )
    const productCount = items.reduce((total, item) => total + item.quantity, 0)

    if (amountTotalCents <= 0) {
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
      currency: args.displayCurrency,
      productCount,
      createdAt: now,
      updatedAt: now,
    })
    const commandId = commandIdForOrder(orderId, now)

    await ctx.db.patch(orderId, { commandId })

    await Promise.all(
      items.map((item) =>
        ctx.db.insert("checkoutOrderItems", {
          orderId,
          ...item,
          createdAt: now,
        })
      )
    )

    return {
      orderId,
      commandId,
      amountTotalCents,
      currency: args.displayCurrency,
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
    stripePresentmentAmountCents: v.optional(v.number()),
    stripePresentmentCurrency: v.optional(v.string()),
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
    const shouldClearPurchasedCartItems =
      args.status === "paid" && order.status !== "paid"

    await ctx.db.patch(order._id, checkoutCompletionPatch(order, args, now))

    if (!shouldClearPurchasedCartItems) {
      return null
    }

    await clearPurchasedCartItems(ctx, order, now)

    await ctx.scheduler.runAfter(
      0,
      internal.orderEmails.sendOrderConfirmation,
      { orderId: order._id }
    )

    return null
  },
})
