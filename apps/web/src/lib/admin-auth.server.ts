// eslint-disable-next-line import/no-unassigned-import -- Marks this module as server-only for TanStack Start.
import "@tanstack/react-start/server-only"
import { useSession, type SessionConfig } from "@tanstack/react-start/server"
import { createHash, timingSafeEqual } from "node:crypto"

const ADMIN_PASSWORD_ENV_NAME = "ADMIN_PASSWORD"
const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12
const ADMIN_SESSION_NAME = "__golazo_admin"

type AdminSessionData = {
  authenticatedAt: number
  isAuthenticated: true
}

export type AdminAuthState = {
  isAuthenticated: boolean
  isConfigured: boolean
}

type AdminLoginResult =
  | { status: "authenticated" }
  | { status: "invalid-password" }
  | { status: "not-configured" }

export async function readAdminAuthState(): Promise<AdminAuthState> {
  if (!readAdminPassword()) {
    return { isAuthenticated: false, isConfigured: false }
  }

  const session = await useAdminSession()

  return {
    isAuthenticated: session.data.isAuthenticated === true,
    isConfigured: true,
  }
}

export async function authenticateAdminPassword(
  password: string
): Promise<AdminLoginResult> {
  const adminPassword = readAdminPassword()

  if (!adminPassword) {
    return { status: "not-configured" }
  }

  if (!isEqualSecret(password, adminPassword)) {
    return { status: "invalid-password" }
  }

  const session = await useAdminSession()
  await session.update({
    authenticatedAt: Date.now(),
    isAuthenticated: true,
  })

  return { status: "authenticated" }
}

function readAdminPassword() {
  return process.env[ADMIN_PASSWORD_ENV_NAME]?.trim() ?? ""
}

function useAdminSession() {
  return useSession<AdminSessionData>(adminSessionConfig())
}

function adminSessionConfig(): SessionConfig {
  return {
    cookie: {
      httpOnly: true,
      maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    name: ADMIN_SESSION_NAME,
    password: adminSessionPassword(),
    sessionHeader: false,
  }
}

function adminSessionPassword() {
  return createHash("sha256")
    .update(`golazo-admin-session:${readAdminPassword()}`)
    .digest("hex")
}

function isEqualSecret(input: string, expected: string) {
  const inputBuffer = Buffer.from(input)
  const expectedBuffer = Buffer.from(expected)

  return (
    inputBuffer.length === expectedBuffer.length &&
    timingSafeEqual(inputBuffer, expectedBuffer)
  )
}
