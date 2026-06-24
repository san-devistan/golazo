import { redirect } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"

type AdminAuthState = {
  isAuthenticated: boolean
  isConfigured: boolean
}

type AdminLoginInput = {
  password: string
}

type AdminLoginResult =
  | { status: "authenticated" }
  | { status: "invalid-password" }
  | { status: "not-configured" }

const ADMIN_LOGIN_REDIRECT_FALLBACK = "/admin"

export const getAdminAuthState = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdminAuthState> => {
    const { readAdminAuthState } = await import("./admin-auth.server")

    return readAdminAuthState()
  }
)

export const loginAdmin = createServerFn({ method: "POST" })
  .validator(validateAdminLoginInput)
  .handler(async ({ data }): Promise<AdminLoginResult> => {
    const { authenticateAdminPassword } = await import("./admin-auth.server")

    return authenticateAdminPassword(data.password)
  })

export async function requireAdminAuth(redirectTo: string) {
  const authState = await getAdminAuthState()

  if (!authState.isAuthenticated) {
    throw redirect({
      to: "/admin",
      search: {
        redirect:
          normalizeAdminRedirect(redirectTo) ?? ADMIN_LOGIN_REDIRECT_FALLBACK,
      },
    })
  }

  return authState
}

export function normalizeAdminRedirect(value: unknown) {
  if (typeof value !== "string") {
    return null
  }

  if (
    value.startsWith("/admin") ||
    (value.startsWith("/products/") && value.includes("mode=admin"))
  ) {
    return value
  }

  return null
}

function validateAdminLoginInput(input: unknown): AdminLoginInput {
  if (!input || typeof input !== "object") {
    throw new Error("Password is required.")
  }

  const password = (input as { password?: unknown }).password

  if (typeof password !== "string" || password.length === 0) {
    throw new Error("Password is required.")
  }

  return { password }
}
