import { createApi } from "@convex-dev/better-auth"
import { convex } from "@convex-dev/better-auth/plugins"
import type { BetterAuthOptions } from "better-auth/minimal"
import { admin } from "better-auth/plugins/admin"

import authConfig from "./auth.config"
import schema from "./schema"

const options = {
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  plugins: [admin(), convex({ authConfig })],
} satisfies BetterAuthOptions

export const {
  create,
  findOne,
  findMany,
  updateOne,
  updateMany,
  deleteOne,
  deleteMany,
} = createApi(schema, () => options)
