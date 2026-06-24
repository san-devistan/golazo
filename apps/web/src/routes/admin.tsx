import { AdminCatalogWorkspace } from "@/components/admin-catalog-workspace"
import { hasConvexUrl } from "@/lib/shop"
import { Outlet, createFileRoute, useLocation } from "@tanstack/react-router"
import { Toaster } from "@workspace/ui/components/sonner"

export const Route = createFileRoute("/admin")({ component: AdminLayout })

function AdminLayout() {
  const location = useLocation()
  let content: React.ReactNode

  if (location.pathname === "/admin" || location.pathname === "/admin/") {
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
