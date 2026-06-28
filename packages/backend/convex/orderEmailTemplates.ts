import { type Infer } from "convex/values"

import { deliveryNote } from "./emailDelivery"
import type { checkoutFulfillmentStatusValidator } from "./shopValidators"

const SITE_URL_FALLBACK = "http://localhost:3000"

export type CheckoutFulfillmentStatus = Infer<
  typeof checkoutFulfillmentStatusValidator
>

export type OrderEmailOrder = {
  _id: string
  amountTotalCents: number
  commandId?: string
  currency: string
  dropId?: string | null
  stripePresentmentAmountCents?: number
  stripePresentmentCurrency?: string
  stripeCheckoutSessionId?: string
  trackId?: string | null
}

export type OrderEmailItem = {
  configurationSummary: Array<{ label: string; value: string }>
  currency: string
  imageUrl: string | null
  productName: string
  productSlug: string
  quantity: number
  unitPriceCents: number
}

export type OrderEmailPreviewRecord = {
  customerEmail: string
  items: Array<OrderEmailItem>
  order: OrderEmailOrder
}

function siteUrl() {
  return process.env.SITE_URL ?? SITE_URL_FALLBACK
}

function orderReference(order: OrderEmailOrder) {
  return order.commandId ?? order._id.slice(-8).toUpperCase()
}

function formatMoney(cents: number, currency: string) {
  const normalizedCurrency = currency.toUpperCase()
  const fractionDigits =
    new Intl.NumberFormat("en", {
      currency: normalizedCurrency,
      style: "currency",
    }).resolvedOptions().maximumFractionDigits ?? 2

  return new Intl.NumberFormat("en", {
    currency: normalizedCurrency,
    style: "currency",
  }).format(cents / 10 ** fractionDigits)
}

function orderTotal(order: OrderEmailOrder) {
  if (
    order.stripePresentmentAmountCents !== undefined &&
    order.stripePresentmentCurrency
  ) {
    return formatMoney(
      order.stripePresentmentAmountCents,
      order.stripePresentmentCurrency
    )
  }

  return formatMoney(order.amountTotalCents, order.currency)
}

function fulfillmentStatusLabel(status: CheckoutFulfillmentStatus) {
  const labels: Record<CheckoutFulfillmentStatus, string> = {
    unfulfilled: "Paid",
    preparing: "Preparing",
    shipped: "Shipping",
    delivered: "Delivered",
    cancelled: "Cancelled",
    refunded: "Refunded",
  }

  return labels[status]
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function orderUrl(order: OrderEmailOrder) {
  if (order.stripeCheckoutSessionId) {
    const url = new URL("/checkout/success", siteUrl())
    url.searchParams.set("session_id", order.stripeCheckoutSessionId)

    return url.href
  }

  return new URL("/account", siteUrl()).href
}

function productUrl(productSlug: string) {
  return new URL(`/products/${productSlug}`, siteUrl()).href
}

function textOrderItemOptions(item: OrderEmailItem) {
  if (item.configurationSummary.length === 0) {
    return ""
  }

  return `\n${item.configurationSummary
    .map((summary) => `  ${summary.label}: ${summary.value}`)
    .join("\n")}`
}

function textOrderItems(items: Array<OrderEmailItem>) {
  return items
    .map((item) => {
      const itemTotal = formatMoney(
        item.unitPriceCents * item.quantity,
        item.currency
      )

      return `- ${item.productName} x${item.quantity} - ${itemTotal}${textOrderItemOptions(item)}`
    })
    .join("\n")
}

function htmlOrderItemOptions(item: OrderEmailItem) {
  if (item.configurationSummary.length === 0) {
    return ""
  }

  return `<div style="margin-top: 4px; color: #666; font-size: 13px; line-height: 1.4;">
      ${item.configurationSummary
        .map(
          (summary) =>
            `<span style="display: inline-block; margin-right: 12px;">${escapeHtml(summary.label)}: ${escapeHtml(summary.value)}</span>`
        )
        .join("")}
    </div>`
}

function htmlOrderItemImage(item: OrderEmailItem) {
  if (!item.imageUrl) {
    return `<div style="width: 64px; height: 64px; background: #eceff1; color: #666; font-size: 12px; line-height: 64px; text-align: center;">No image</div>`
  }

  return `<img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(
    item.productName
  )}" width="64" height="64" style="display: block; width: 64px; height: 64px; object-fit: contain; background: #eceff1;" />`
}

function htmlOrderItems(items: Array<OrderEmailItem>) {
  return items
    .map((item) => {
      const itemUrl = productUrl(item.productSlug)
      const itemTotal = formatMoney(
        item.unitPriceCents * item.quantity,
        item.currency
      )

      return `<tr>
  <td style="padding: 12px 12px 12px 0; border-top: 1px solid #e5e5e5; width: 64px; vertical-align: top;">
    ${htmlOrderItemImage(item)}
  </td>
  <td style="padding: 12px 0; border-top: 1px solid #e5e5e5; vertical-align: top;">
    <a href="${escapeHtml(itemUrl)}" style="color: #111; font-weight: 700; text-decoration: none;">${escapeHtml(item.productName)}</a>
    ${htmlOrderItemOptions(item)}
  </td>
  <td style="padding: 12px 0 12px 12px; border-top: 1px solid #e5e5e5; text-align: right; vertical-align: top; white-space: nowrap;">
    ${escapeHtml(itemTotal)}
    <div style="margin-top: 4px; color: #666; font-size: 13px;">x ${item.quantity}</div>
  </td>
</tr>`
    })
    .join("")
}

function maybeDeliveryNote(note: string | null) {
  return note ? `\n\n${note}` : ""
}

function maybeDeliveryNoteHtml(note: string | null) {
  return note
    ? `<p style="margin: 24px 0 0; color: #777; font-size: 13px;">${escapeHtml(
        note
      )}</p>`
    : ""
}

export function buildPasswordResetEmail({
  customerEmail,
  resetUrl,
}: {
  customerEmail: string
  resetUrl: string
}) {
  const note = deliveryNote(customerEmail)
  const subject = "Reset your Golazo password"
  const text = `Use this link to reset your Golazo password:

${resetUrl}

This link expires in 1 hour. If you did not request this, you can ignore this email.${maybeDeliveryNote(note)}`
  const html = `<div style="margin: 0; background: #f6f6f6; padding: 32px 0; font-family: Arial, sans-serif; color: #111;">
  <div style="margin: 0 auto; max-width: 600px; background: #fff; padding: 32px;">
    <p style="margin: 0 0 12px; color: #666; font-size: 14px;">Golazo account</p>
    <h1 style="margin: 0 0 16px; font-size: 24px; line-height: 1.25;">Reset your password</h1>
    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.5;">Use the link below to choose a new password for your Golazo account. The link expires in 1 hour.</p>
    <p style="margin: 28px 0 0;">
      <a href="${escapeHtml(resetUrl)}" style="display: inline-block; background: #111; color: #fff; padding: 12px 18px; text-decoration: none;">Reset password</a>
    </p>
    <p style="margin: 24px 0 0; color: #666; font-size: 14px; line-height: 1.5;">If you did not request this, you can ignore this email.</p>
    ${maybeDeliveryNoteHtml(note)}
  </div>
</div>`

  return { html, subject, text }
}

export function buildOrderConfirmationEmail({
  customerEmail,
  items,
  order,
}: OrderEmailPreviewRecord) {
  const reference = orderReference(order)
  const note = deliveryNote(customerEmail)
  const total = orderTotal(order)
  const url = orderUrl(order)
  const subject = `Your Golazo order ${reference} is confirmed`
  const text = `Thanks for your order.

Order: ${reference}
Status: Paid
Total: ${total}

Items:
${textOrderItems(items)}

View your order:
${url}${maybeDeliveryNote(note)}`
  const html = `<div style="margin: 0; background: #f6f6f6; padding: 32px 0; font-family: Arial, sans-serif; color: #111;">
  <div style="margin: 0 auto; max-width: 600px; background: #fff; padding: 32px;">
    <p style="margin: 0 0 12px; color: #666; font-size: 14px;">Order ${escapeHtml(reference)}</p>
    <h1 style="margin: 0 0 16px; font-size: 24px; line-height: 1.25;">Your order is confirmed</h1>
    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.5;">Thanks for shopping with Golazo. We received your order and will notify you as soon as its status changes.</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
      ${htmlOrderItems(items)}
    </table>
    <p style="margin: 24px 0 0; font-size: 18px;"><strong>Total: ${escapeHtml(total)}</strong></p>
    <p style="margin: 28px 0 0;">
      <a href="${escapeHtml(url)}" style="display: inline-block; background: #111; color: #fff; padding: 12px 18px; text-decoration: none;">View order</a>
    </p>
    ${maybeDeliveryNoteHtml(note)}
  </div>
</div>`

  return { html, subject, text }
}

export function buildFulfillmentStatusUpdateEmail({
  customerEmail,
  fulfillmentStatus,
  order,
  previousFulfillmentStatus,
}: {
  customerEmail: string
  fulfillmentStatus: CheckoutFulfillmentStatus
  order: OrderEmailOrder
  previousFulfillmentStatus: CheckoutFulfillmentStatus
}) {
  const reference = orderReference(order)
  const note = deliveryNote(customerEmail)
  const nextLabel = fulfillmentStatusLabel(fulfillmentStatus)
  const previousLabel = fulfillmentStatusLabel(previousFulfillmentStatus)
  const url = orderUrl(order)
  const trackingDetails = [
    order.dropId ? `Drop ID: ${order.dropId}` : null,
    order.trackId ? `Track ID: ${order.trackId}` : null,
  ].filter((line): line is string => Boolean(line))
  const trackingText = trackingDetails.length
    ? `\n\n${trackingDetails.join("\n")}`
    : ""
  const trackingHtml = trackingDetails.length
    ? `<ul style="margin: 20px 0 0; padding-left: 20px;">${trackingDetails
        .map((line) => `<li>${escapeHtml(line)}</li>`)
        .join("")}</ul>`
    : ""
  const subject = `Your Golazo order ${reference} is ${nextLabel}`
  const text = `Your order status changed.

Order: ${reference}
Previous status: ${previousLabel}
New status: ${nextLabel}${trackingText}

View your order:
${url}${maybeDeliveryNote(note)}`
  const html = `<div style="margin: 0; background: #f6f6f6; padding: 32px 0; font-family: Arial, sans-serif; color: #111;">
  <div style="margin: 0 auto; max-width: 600px; background: #fff; padding: 32px;">
    <p style="margin: 0 0 12px; color: #666; font-size: 14px;">Order ${escapeHtml(reference)}</p>
    <h1 style="margin: 0 0 16px; font-size: 24px; line-height: 1.25;">Your order is ${escapeHtml(nextLabel)}</h1>
    <p style="margin: 0; font-size: 16px; line-height: 1.5;">The order status changed from ${escapeHtml(previousLabel)} to ${escapeHtml(nextLabel)}.</p>
    ${trackingHtml}
    <p style="margin: 28px 0 0;">
      <a href="${escapeHtml(url)}" style="display: inline-block; background: #111; color: #fff; padding: 12px 18px; text-decoration: none;">View order</a>
    </p>
    ${maybeDeliveryNoteHtml(note)}
  </div>
</div>`

  return { html, subject, text }
}

export function fallbackPreviewRecord(): OrderEmailPreviewRecord {
  return {
    customerEmail: "customer@example.com",
    order: {
      _id: "preview_checkout_order_12345678",
      amountTotalCents: 10600,
      commandId: "GLZ-1024",
      currency: "eur",
      dropId: "DROP-8412",
      stripeCheckoutSessionId: "cs_test_preview",
      trackId: "TRK-2026-0001",
    },
    items: [
      {
        configurationSummary: [
          { label: "Size", value: "M" },
          { label: "Flocking", value: "Mbappe 10" },
        ],
        currency: "eur",
        imageUrl: new URL("/favicon.svg", siteUrl()).href,
        productName: "France home jersey",
        productSlug: "france-home-jersey",
        quantity: 1,
        unitPriceCents: 8900,
      },
      {
        configurationSummary: [{ label: "Size", value: "Adult" }],
        currency: "eur",
        imageUrl: null,
        productName: "Gift wrap",
        productSlug: "gift-wrap",
        quantity: 1,
        unitPriceCents: 1700,
      },
    ],
  }
}

export function buildUserEmailPreviews(record: OrderEmailPreviewRecord) {
  const confirmation = buildOrderConfirmationEmail(record)
  const statusUpdate = buildFulfillmentStatusUpdateEmail({
    customerEmail: record.customerEmail,
    fulfillmentStatus: "shipped",
    order: record.order,
    previousFulfillmentStatus: "preparing",
  })
  const passwordReset = buildPasswordResetEmail({
    customerEmail: record.customerEmail,
    resetUrl: new URL("/reset-password?token=preview-reset-token", siteUrl())
      .href,
  })

  return [
    {
      key: "password-reset",
      name: "Password reset",
      description: "Sent to the customer when they request a password reset.",
      ...passwordReset,
    },
    {
      key: "order-confirmation",
      name: "Order confirmation",
      description: "Sent to the customer after Stripe confirms payment.",
      ...confirmation,
    },
    {
      key: "fulfillment-status-update",
      name: "Status update",
      description:
        "Sent to the customer when an admin changes the order status.",
      ...statusUpdate,
    },
  ]
}
