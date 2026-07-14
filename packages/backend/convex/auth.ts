import { createClient, type GenericCtx } from "@convex-dev/better-auth"
import { convex } from "@convex-dev/better-auth/plugins"
import { requireRunMutationCtx } from "@convex-dev/better-auth/utils"
import { betterAuth } from "better-auth/minimal"
import { admin } from "better-auth/plugins/admin"
import { v } from "convex/values"

import { components } from "./_generated/api"
import type { DataModel } from "./_generated/dataModel.d.ts"
import { query } from "./_generated/server"
import authConfig from "./auth.config"
import betterAuthSchema from "./betterAuth/schema"
import { sendTransactionalEmail } from "./emailDelivery"
import { buildPasswordResetEmail } from "./orderEmailTemplates"

const siteUrl = process.env.SITE_URL ?? "https://golazo.localhost"
const ADMIN_ROLE = "admin"
const ADMIN_USER_IDS_ENV_NAME = "BETTER_AUTH_ADMIN_USER_IDS"

const adminUserValidator = v.object({
  email: v.string(),
  id: v.string(),
  name: v.string(),
})

const adminAuthStateValidator = v.union(
  v.object({
    status: v.literal("admin"),
    user: adminUserValidator,
  }),
  v.object({
    status: v.literal("forbidden"),
    user: adminUserValidator,
  }),
  v.object({
    status: v.literal("signed-out"),
  })
)

export const authComponent = createClient<DataModel, typeof betterAuthSchema>(
  components.betterAuth,
  {
    local: {
      schema: betterAuthSchema,
    },
  }
)

function adminUserIds() {
  return (
    process.env[ADMIN_USER_IDS_ENV_NAME]
      ?.split(",")
      .map((id) => id.trim())
      .filter(Boolean) ?? []
  )
}

function hasAdminRole(role: string | null | undefined) {
  return (
    role
      ?.split(",")
      .map((value) => value.trim().toLowerCase())
      .includes(ADMIN_ROLE) ?? false
  )
}

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
    plugins: [
      admin({
        adminUserIds: adminUserIds(),
      }),
      convex({ authConfig }),
    ],
  })

export const getCurrentUser = query({
  args: {},
  returns: v.union(adminUserValidator, v.null()),
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx)

    if (!user) {
      return null
    }

    return {
      email: user.email,
      id: user._id,
      name: user.name,
    }
  },
})

export const getCurrentAdminState = query({
  args: {},
  returns: adminAuthStateValidator,
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx)

    if (!user) {
      return { status: "signed-out" as const }
    }

    const adminUser = {
      email: user.email,
      id: user._id,
      name: user.name,
    }

    if (hasAdminRole(user.role) || adminUserIds().includes(user._id)) {
      return {
        status: "admin" as const,
        user: adminUser,
      }
    }

    return {
      status: "forbidden" as const,
      user: adminUser,
    }
  },
})
