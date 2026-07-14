import { createClient, type GenericCtx } from "@convex-dev/better-auth"
import { convex } from "@convex-dev/better-auth/plugins"
import { requireRunMutationCtx } from "@convex-dev/better-auth/utils"
import { betterAuth } from "better-auth/minimal"

import { components } from "./_generated/api"
import type { DataModel } from "./_generated/dataModel.d.ts"
import { query } from "./_generated/server"
import authConfig from "./auth.config"
import { sendTransactionalEmail } from "./emailDelivery"
import { buildPasswordResetEmail } from "./orderEmailTemplates"

const siteUrl = process.env.SITE_URL ?? "https://golazo.localhost"

export const authComponent = createClient<DataModel>(components.betterAuth)

export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth({
    appName: "Golazo",
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        const { html, subject, text } = buildPasswordResetEmail({
          customerEmail: user.email,
          resetUrl: url,
        })

        await sendTransactionalEmail({
          ctx: requireRunMutationCtx(ctx),
          customerEmail: user.email,
          subject,
          html,
          text,
        })
      },
    },
    plugins: [convex({ authConfig })],
  })

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return await authComponent.getAuthUser(ctx)
  },
})
