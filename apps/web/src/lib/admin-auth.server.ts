import * as serverOnly from "@tanstack/react-start/server-only"
import { api } from "@workspace/backend/api"

import { fetchAuthQuery } from "./auth-server"

void serverOnly

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

export async function readAdminAuthState(): Promise<AdminAuthState> {
  return await fetchAuthQuery(api.auth.getCurrentAdminState)
}
