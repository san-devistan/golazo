import { Resend } from "@convex-dev/resend"

import { components } from "./_generated/api"

const FROM_EMAIL_FALLBACK = "Golazo <onboarding@resend.dev>"

type EmailSendContext = Parameters<Resend["sendEmail"]>[0]

export const resend: Resend = new Resend(components.resend, {
  testMode: false,
})

export function fromEmail() {
  return process.env.RESEND_FROM_EMAIL ?? FROM_EMAIL_FALLBACK
}

export function devRecipient() {
  return process.env.RESEND_DEV_TO_EMAIL?.trim() || null
}

export function recipientEmail(customerEmail: string) {
  return devRecipient() ?? customerEmail
}

export function deliveryNote(customerEmail: string) {
  return devRecipient()
    ? `Development mode: this email was intended for ${customerEmail}.`
    : null
}

export async function sendTransactionalEmail({
  ctx,
  customerEmail,
  html,
  subject,
  text,
}: {
  ctx: EmailSendContext
  customerEmail: string
  html: string
  subject: string
  text: string
}) {
  await resend.sendEmail(ctx, {
    from: fromEmail(),
    to: recipientEmail(customerEmail),
    subject,
    html,
    text,
  })
}
