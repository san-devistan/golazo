import { registerRoutes, type StripeEventHandlers } from "@convex-dev/stripe"
import { httpRouter } from "convex/server"
import type Stripe from "stripe"

import { components, internal } from "./_generated/api"
import { httpAction } from "./_generated/server"
import { authComponent, createAuth } from "./auth"
import { resend } from "./emailDelivery"

type StripeObjectReference = string | { id: string } | null | undefined

type StripeAddress = Stripe.Address | null | undefined

function stripeObjectId(value: StripeObjectReference) {
  return typeof value === "string" ? value : value?.id
}

function stripeAddress(value: StripeAddress) {
  if (!value) {
    return null
  }

  return {
    line1: value.line1 ?? null,
    line2: value.line2 ?? null,
    city: value.city ?? null,
    state: value.state ?? null,
    postalCode: value.postal_code ?? null,
    country: value.country ?? null,
  }
}

function checkoutCompletionStatus(session: Stripe.Checkout.Session) {
  return session.payment_status === "paid" ? "paid" : "processing"
}

function checkoutShippingDetails(session: Stripe.Checkout.Session) {
  return session.collected_information?.shipping_details ?? null
}

function checkoutPresentmentCurrency(session: Stripe.Checkout.Session) {
  return session.presentment_details?.presentment_currency.toUpperCase()
}

async function markOrderForCheckoutSession(
  ctx: Parameters<
    NonNullable<StripeEventHandlers["checkout.session.completed"]>
  >[0],
  session: Stripe.Checkout.Session,
  status: "paid" | "processing" | "failed" | "expired",
  failureReason?: string
) {
  const shippingDetails = checkoutShippingDetails(session)

  await ctx.runMutation(
    internal.checkoutModel.completeOrderFromCheckoutSession,
    {
      stripeCheckoutSessionId: session.id,
      status,
      commandId: session.metadata?.commandId,
      stripeCustomerId: stripeObjectId(session.customer),
      stripePaymentIntentId: stripeObjectId(session.payment_intent),
      stripePaymentStatus: session.payment_status,
      stripePresentmentAmountCents:
        session.presentment_details?.presentment_amount,
      stripePresentmentCurrency: checkoutPresentmentCurrency(session),
      customerEmail: session.customer_details?.email ?? null,
      customerPhone: session.customer_details?.phone ?? null,
      shippingName: shippingDetails?.name ?? null,
      shippingAddress: stripeAddress(shippingDetails?.address),
      failureReason,
    }
  )
}

const stripeEventHandlers: StripeEventHandlers = {
  "checkout.session.completed": async (ctx, event) => {
    const session = event.data.object

    await markOrderForCheckoutSession(
      ctx,
      session,
      checkoutCompletionStatus(session)
    )
  },
  "checkout.session.async_payment_succeeded": async (ctx, event) => {
    await markOrderForCheckoutSession(ctx, event.data.object, "paid")
  },
  "checkout.session.async_payment_failed": async (ctx, event) => {
    await markOrderForCheckoutSession(
      ctx,
      event.data.object,
      "failed",
      "Stripe reported that the asynchronous payment failed."
    )
  },
  "checkout.session.expired": async (ctx, event) => {
    await markOrderForCheckoutSession(
      ctx,
      event.data.object,
      "expired",
      "Stripe checkout session expired before payment."
    )
  },
}

const http = httpRouter()

authComponent.registerRoutes(http, createAuth)
http.route({
  path: "/resend/webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    return await resend.handleResendEventWebhook(ctx, req)
  }),
})
registerRoutes(http, components.stripe, {
  webhookPath: "/stripe/webhook",
  events: stripeEventHandlers,
})

export default http
