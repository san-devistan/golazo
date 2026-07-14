import { redirect } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"

export type AdminAuthState =
  | {
      status: "admin"
      user: AdminAuthUser
    }
  | {
      status: "forbidden"
      user: AdminAuthUser
    }
  | {
      status: "signed-out"
    }

export type AdminAuthUser = {
  email: string
  id: string
  name: string
}

const ADMIN_LOGIN_REDIRECT_FALLBACK = "/admin"

export const getAdminAuthState = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdminAuthState> => {
    const { readAdminAuthState } = await import("./admin-auth.server")

    return readAdminAuthState()
  }
)

export async function requireAdminAuth(redirectTo: string) {
  const authState = await getAdminAuthState()

  if (authState.status !== "admin") {
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
