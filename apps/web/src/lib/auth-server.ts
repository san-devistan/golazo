import { convexBetterAuthReactStart } from "@convex-dev/better-auth/react-start"

function requireServerEnv(name: string) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`${name} is not set.`)
  }

  return value
}

export const { fetchAuthQuery, handler } = convexBetterAuthReactStart({
  convexUrl: requireServerEnv("VITE_CONVEX_URL"),
  convexSiteUrl: requireServerEnv("VITE_CONVEX_SITE_URL"),
})
