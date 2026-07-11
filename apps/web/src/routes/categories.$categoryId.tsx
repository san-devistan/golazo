import { CategoryContent } from "@/components/category-content"
import { MissingBackend } from "@/components/missing-backend"
import { categoryIdFromRouteParam } from "@/lib/route-params"
import { hasConvexUrl } from "@/lib/shop"
import { categoryPageQueryOptions } from "@/lib/shop-queries"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/categories/$categoryId")({
  loader: async ({ params, context: { queryClient } }) => {
    if (!hasConvexUrl()) {
      return
    }

    await queryClient.ensureQueryData(
      categoryPageQueryOptions(categoryIdFromRouteParam(params.categoryId))
    )
  },
  component: CategoryPage,
})

function CategoryPage() {
  const { categoryId } = Route.useParams()

  if (!hasConvexUrl()) {
    return <MissingBackend />
  }

  return <CategoryContent categoryId={categoryIdFromRouteParam(categoryId)} />
}
