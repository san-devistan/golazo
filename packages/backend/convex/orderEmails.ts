import { v } from "convex/values"

import type { Id } from "./_generated/dataModel.d.ts"
import {
  internalMutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server"
import { sendTransactionalEmail } from "./emailDelivery"
import {
  buildFulfillmentStatusUpdateEmail,
  buildOrderConfirmationEmail,
  buildUserEmailPreviews,
  fallbackPreviewRecord,
  type OrderEmailPreviewRecord,
} from "./orderEmailTemplates"
import { checkoutFulfillmentStatusValidator } from "./shopValidators"

const ORDER_ITEM_LIMIT = 100

type CheckoutOrderId = Id<"checkoutOrders">

const emailPreviewValidator = v.object({
  description: v.string(),
  html: v.string(),
  key: v.string(),
  name: v.string(),
  subject: v.string(),
  text: v.string(),
})

async function listOrderItems(
  ctx: MutationCtx | QueryCtx,
  orderId: CheckoutOrderId
) {
  return await ctx.db
    .query("checkoutOrderItems")
    .withIndex("by_orderId", (q) => q.eq("orderId", orderId))
    .take(ORDER_ITEM_LIMIT)
}

async function previewRecord(ctx: QueryCtx): Promise<OrderEmailPreviewRecord> {
  const [order] = await ctx.db
    .query("checkoutOrders")
    .withIndex("by_status_and_createdAt", (q) => q.eq("status", "paid"))
    .order("desc")
    .take(1)

  if (!order) {
    return fallbackPreviewRecord()
  }

  const fallback = fallbackPreviewRecord()
  const items = await listOrderItems(ctx, order._id)

  return {
    customerEmail: order.customerEmail ?? fallback.customerEmail,
    items: items.length > 0 ? items : fallback.items,
    order,
  }
}

export const listUserEmailPreviews = query({
  args: {},
  returns: v.array(emailPreviewValidator),
  handler: async (ctx) => {
    return buildUserEmailPreviews(await previewRecord(ctx))
  },
})

export const sendOrderConfirmation = internalMutation({
  args: {
    orderId: v.id("checkoutOrders"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId)

    if (!order || order.status !== "paid" || !order.customerEmail) {
      return null
    }

    const items = await listOrderItems(ctx, order._id)
    const { html, subject, text } = buildOrderConfirmationEmail({
      customerEmail: order.customerEmail,
      items,
      order,
    })

    await sendTransactionalEmail({
      ctx,
      customerEmail: order.customerEmail,
      subject,
      html,
      text,
    })

    return null
  },
})

export const sendFulfillmentStatusUpdate = internalMutation({
  args: {
    orderId: v.id("checkoutOrders"),
    previousFulfillmentStatus: checkoutFulfillmentStatusValidator,
    fulfillmentStatus: checkoutFulfillmentStatusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (args.previousFulfillmentStatus === args.fulfillmentStatus) {
      return null
    }

    const order = await ctx.db.get(args.orderId)

    if (!order || order.status !== "paid" || !order.customerEmail) {
      return null
    }

    // The admin can change status again before this scheduled email runs.
    if ((order.fulfillmentStatus ?? "unfulfilled") !== args.fulfillmentStatus) {
      return null
    }

    const { html, subject, text } = buildFulfillmentStatusUpdateEmail({
      customerEmail: order.customerEmail,
      fulfillmentStatus: args.fulfillmentStatus,
      order,
      previousFulfillmentStatus: args.previousFulfillmentStatus,
    })

    await sendTransactionalEmail({
      ctx,
      customerEmail: order.customerEmail,
      subject,
      html,
      text,
    })

    return null
  },
})
