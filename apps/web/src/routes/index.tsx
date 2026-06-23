import { CatalogHome } from "@/components/catalog-home"
import { MissingBackend } from "@/components/missing-backend"
import { hasConvexUrl } from "@/lib/shop"
import { catalogQueryOptions } from "@/lib/shop-queries"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/")({
  loader: async ({ context: { queryClient } }) => {
    if (!hasConvexUrl()) {
      return
    }

    await queryClient.ensureQueryData(catalogQueryOptions())
  },
  component: HomePage,
})

function HomePage() {
  if (!hasConvexUrl()) {
    return <MissingBackend showAdminLink />
  }

  return <CatalogHome />
}
