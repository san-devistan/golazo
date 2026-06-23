import { CategoryContent } from "@/components/category-content"
import { MissingBackend } from "@/components/missing-backend"
import { hasConvexUrl } from "@/lib/shop"
import { categoryPageQueryOptions, type CategoryId } from "@/lib/shop-queries"
import { createFileRoute } from "@tanstack/react-router"
/* eslint-disable typescript/no-unsafe-type-assertion */

export const Route = createFileRoute("/categories/$categoryId")({
  loader: async ({ params, context: { queryClient } }) => {
    if (!hasConvexUrl()) {
      return
    }

    await queryClient.ensureQueryData(
      categoryPageQueryOptions(params.categoryId as CategoryId)
    )
  },
  component: CategoryPage,
})

function CategoryPage() {
  const { categoryId } = Route.useParams()

  if (!hasConvexUrl()) {
    return <MissingBackend />
  }

  return <CategoryContent categoryId={categoryId as CategoryId} />
}
