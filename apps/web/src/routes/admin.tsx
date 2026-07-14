import { AdminAuthGate } from "@/components/admin-auth-gate"
import { AdminCatalogWorkspace } from "@/components/admin-catalog-workspace"
import { getAdminAuthState, normalizeAdminRedirect } from "@/lib/admin-auth"
import { hasConvexUrl } from "@/lib/shop"
import {
  Outlet,
  createFileRoute,
  redirect,
  useLocation,
} from "@tanstack/react-router"
import { Toaster } from "@workspace/ui/components/sonner"

type AdminSearch = {
  redirect?: string
}

export const Route = createFileRoute("/admin")({
  validateSearch: validateAdminSearch,
  beforeLoad: async ({ location }) => {
    const adminAuth = await getAdminAuthState()

    if (adminAuth.status !== "admin" && !isAdminEntryPath(location.pathname)) {
      throw redirect({
        to: "/admin",
        search: {
          redirect: normalizeAdminRedirect(location.href) ?? "/admin",
        },
      })
    }

    return { adminAuth }
  },
  component: AdminLayout,
})

function validateAdminSearch(search: Record<string, unknown>): AdminSearch {
  const redirectTo = normalizeAdminRedirect(search.redirect)

  return redirectTo ? { redirect: redirectTo } : {}
}

function AdminLayout() {
  const { adminAuth } = Route.useRouteContext()
  const { redirect: redirectTo } = Route.useSearch()
  const location = useLocation()
  let content: React.ReactNode

  if (adminAuth.status !== "admin") {
    content = <AdminAuthGate authState={adminAuth} redirectTo={redirectTo} />
  } else if (isAdminEntryPath(location.pathname)) {
    if (!hasConvexUrl()) {
      content = <MissingBackend />
    } else {
      content = <AdminCatalogWorkspace />
    }
  } else {
    content = <Outlet />
  }

  return (
    <>
      {content}
      <Toaster closeButton position="bottom-right" richColors theme="light" />
    </>
  )
}

function isAdminEntryPath(pathname: string) {
  return pathname === "/admin" || pathname === "/admin/"
}

function MissingBackend() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted p-6">
      <section className="w-full max-w-lg rounded-lg border bg-background p-6">
        <h1 className="text-xl font-semibold">Connect Convex first</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Set `VITE_CONVEX_URL` in `apps/web/.env.local`, then restart the web
          dev server. Cloudinary uploads use the backend Cloudinary API env
          vars.
        </p>
      </section>
    </main>
  )
}
