import { AdminCatalogWorkspace } from "@/components/admin-catalog-workspace"
import { normalizeCatalogPath } from "@/lib/catalog-navigation"
import { hasConvexUrl } from "@/lib/shop"
import { createFileRoute } from "@tanstack/react-router"
/* eslint-disable no-underscore-dangle */

export const Route = createFileRoute("/admin/$")({
  component: AdminCategoryPathPage,
})

function AdminCategoryPathPage() {
  const params = Route.useParams() as { _splat?: string }
  const categoryPath = normalizeCatalogPath(params._splat ?? "")

  if (!hasConvexUrl()) {
    return <MissingBackend />
  }

  return <AdminCatalogWorkspace categoryPath={categoryPath} />
}

function MissingBackend() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted p-6">
      <section className="w-full max-w-lg rounded-lg border bg-background p-6">
        <h1 className="text-xl font-semibold">Connect Convex first</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Set `VITE_CONVEX_URL` in `apps/web/.env.local`, then restart the web
          dev server.
        </p>
      </section>
    </main>
  )
}
