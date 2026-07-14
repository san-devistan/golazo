"use node"

import { StripeSubscriptions } from "@convex-dev/stripe"
import { v } from "convex/values"
import Stripe from "stripe"

import { components, internal } from "./_generated/api"
import type { Id } from "./_generated/dataModel.d.ts"
import { action } from "./_generated/server"
import {
  BASE_CURRENCY,
  checkoutCurrencyValidator,
  normalizeCheckoutCurrency,
  resolveEurToUsdRate,
  type CheckoutCurrency,
} from "./currency"
import {
  DEFAULT_SHIPPING_ALLOWED_COUNTRIES,
  isShippingAllowedCountry,
} from "./stripeAllowedCountries"

const SITE_URL_FALLBACK = "https://golazo.localhost"
const STRIPE_API_VERSION = "2026-02-25.clover" as const
const MAX_STRIPE_DESCRIPTION_LENGTH = 900
const stripeComponent = new StripeSubscriptions(components.stripe, {})

type CheckoutActionLineItem = {
  productName: string
  imageUrl: string | null
  unitPriceCents: number
  currency: CheckoutCurrency
  quantity: number
  configurationSummary: Array<{ label: string; value: string }>
}

type PendingCheckoutOrder = {
  orderId: Id<"checkoutOrders">
  commandId: string
  items: Array<CheckoutActionLineItem>
}

type CreateCartCheckoutResult = {
  sessionId: string
  url: string
}

type CurrencyRatesResult = {
  baseCurrency: typeof BASE_CURRENCY
  eurToUsdRate: number
}

function requireStripeSecretKey() {
  const apiKey = process.env.STRIPE_SECRET_KEY

  if (!apiKey) {
    throw new Error("STRIPE_SECRET_KEY is not set.")
  }

  return apiKey
}

function siteUrl() {
  return process.env.SITE_URL ?? SITE_URL_FALLBACK
}

function originFromUrl(value: string) {
  return new URL(value).origin
}

function trustedCheckoutOrigins() {
  const origins = new Set<string>([
    originFromUrl(siteUrl()),
    originFromUrl(SITE_URL_FALLBACK),
  ])
  const configuredOrigins = process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",")

  for (const configuredOrigin of configuredOrigins ?? []) {
    const trimmedOrigin = configuredOrigin.trim()

    if (!trimmedOrigin) {
      continue
    }

    try {
      origins.add(originFromUrl(trimmedOrigin))
    } catch {
      // Better Auth supports non-URL origin patterns. Checkout returns only
      // allow exact URL origins so wildcard patterns are intentionally ignored.
    }
  }

  return origins
}

function checkoutReturnOrigin(value: string | undefined) {
  const fallbackOrigin = originFromUrl(siteUrl())

  if (!value) {
    return fallbackOrigin
  }

  let returnOrigin: string

  try {
    returnOrigin = originFromUrl(value)
  } catch {
    throw new Error("Checkout return origin is invalid.")
  }

  if (!trustedCheckoutOrigins().has(returnOrigin)) {
    throw new Error("Checkout return origin is not trusted.")
  }

  return returnOrigin
}

function normalizeCancelPath(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/"
  }

  return value
}

function shippingAllowedCountries() {
  const configuredCountries =
    process.env.STRIPE_SHIPPING_ALLOWED_COUNTRIES?.split(",")
      .map((country) => country.trim().toUpperCase())
      .filter(isShippingAllowedCountry)

  if (configuredCountries && configuredCountries.length > 0) {
    return configuredCountries
  }

  return DEFAULT_SHIPPING_ALLOWED_COUNTRIES
}

function summaryDescription(summary: Array<{ label: string; value: string }>) {
  if (summary.length === 0) {
    return undefined
  }

  const description = summary
    .map((item) => `${item.label}: ${item.value}`)
    .join("\n")

  return description.slice(0, MAX_STRIPE_DESCRIPTION_LENGTH)
}

function checkoutLineItem(
  item: CheckoutActionLineItem
): Stripe.Checkout.SessionCreateParams.LineItem {
  const description = summaryDescription(item.configurationSummary)

  return {
    price_data: {
      currency: item.currency.toLowerCase(),
      product_data: {
        name: item.productName,
        ...(description !== undefined && { description }),
        ...(item.imageUrl ? { images: [item.imageUrl] } : {}),
      },
      unit_amount: item.unitPriceCents,
    },
    quantity: item.quantity,
  }
}

function checkoutMetadata({
  commandId,
  orderId,
  userTokenIdentifier,
}: {
  commandId: string
  orderId: string
  userTokenIdentifier: string
}) {
  return {
    commandId,
    orderId,
    userId: userTokenIdentifier,
  }
}

export const getCurrencyRates = action({
  args: {},
  returns: v.object({
    baseCurrency: v.literal(BASE_CURRENCY),
    eurToUsdRate: v.number(),
  }),
  handler: async (): Promise<CurrencyRatesResult> => ({
    baseCurrency: BASE_CURRENCY,
    eurToUsdRate: await resolveEurToUsdRate(),
  }),
})

export const createCartCheckout = action({
  args: {
    cancelPath: v.optional(v.string()),
    displayCurrency: v.optional(checkoutCurrencyValidator),
    returnOrigin: v.optional(v.string()),
  },
  returns: v.object({
    sessionId: v.string(),
    url: v.string(),
  }),
  handler: async (ctx, args): Promise<CreateCartCheckoutResult> => {
    const identity = await ctx.auth.getUserIdentity()

    if (!identity) {
      throw new Error("Sign in to checkout.")
    }

    const userTokenIdentifier = identity.tokenIdentifier
    const displayCurrency = normalizeCheckoutCurrency(args.displayCurrency)
    const checkoutSiteOrigin = checkoutReturnOrigin(args.returnOrigin)
    const eurToUsdRate =
      displayCurrency === BASE_CURRENCY ? 1 : await resolveEurToUsdRate()
    const customerEmail = identity.email
    const order: PendingCheckoutOrder = await ctx.runMutation(
      internal.checkoutModel.createPendingOrderFromCart,
      {
        displayCurrency,
        eurToUsdRate,
        userTokenIdentifier,
        ...(customerEmail ? { customerEmail } : {}),
      }
    )

    try {
      const customer = await stripeComponent.getOrCreateCustomer(ctx, {
        userId: userTokenIdentifier,
        email: identity.email,
      })
      const stripe = new Stripe(requireStripeSecretKey(), {
        apiVersion: STRIPE_API_VERSION,
      })
      const metadata = checkoutMetadata({
        commandId: order.commandId,
        orderId: order.orderId,
        userTokenIdentifier,
      })
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer: customer.customerId,
        client_reference_id: order.commandId,
        line_items: order.items.map(checkoutLineItem),
        shipping_address_collection: {
          allowed_countries: shippingAllowedCountries(),
        },
        phone_number_collection: {
          enabled: true,
        },
        success_url: `${checkoutSiteOrigin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${checkoutSiteOrigin}${normalizeCancelPath(args.cancelPath)}`,
        metadata,
        payment_intent_data: {
          metadata,
        },
      })

      if (!session.url) {
        throw new Error("Stripe did not return a checkout URL.")
      }

      await ctx.runMutation(internal.checkoutModel.attachCheckoutSession, {
        orderId: order.orderId,
        stripeCheckoutSessionId: session.id,
        stripeCustomerId: customer.customerId,
      })

      return {
        sessionId: session.id,
        url: session.url,
      }
    } catch (error) {
      await ctx.runMutation(internal.checkoutModel.markCheckoutCreationFailed, {
        orderId: order.orderId,
        failureReason:
          error instanceof Error ? error.message : "Failed to create checkout.",
      })

      throw error
    }
  },
})
