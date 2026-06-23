import { CategoryPathContent } from "@/components/category-path-content"
import { MissingBackend } from "@/components/missing-backend"
import { normalizeCatalogPath } from "@/lib/catalog-navigation"
import { hasConvexUrl } from "@/lib/shop"
import { categoryPathPageQueryOptions } from "@/lib/shop-queries"
import { createFileRoute } from "@tanstack/react-router"
/* eslint-disable no-underscore-dangle */

export const Route = createFileRoute("/$")({
  loader: async ({ params, context: { queryClient } }) => {
    if (!hasConvexUrl()) {
      return
    }

    const pathParams = params as { _splat?: string }
    const path = normalizeCatalogPath(pathParams._splat ?? "")

    await queryClient.ensureQueryData(categoryPathPageQueryOptions(path))
  },
  component: CategoryPathPage,
})

function CategoryPathPage() {
  const params = Route.useParams() as { _splat?: string }
  const path = normalizeCatalogPath(params._splat ?? "")

  if (!hasConvexUrl()) {
    return <MissingBackend />
  }

  return <CategoryPathContent path={path} />
}
