import { MissingBackend } from "@/components/missing-backend"
import { SearchContent } from "@/components/search-content"
import { hasConvexUrl } from "@/lib/shop"
import { catalogQueryOptions } from "@/lib/shop-queries"
import { createFileRoute } from "@tanstack/react-router"

type ProductsSearch = {
  q?: string
}

export const Route = createFileRoute("/products/")({
  validateSearch: validateProductsSearch,
  loader: async ({ context: { queryClient } }) => {
    if (!hasConvexUrl()) {
      return
    }

    await queryClient.ensureQueryData(catalogQueryOptions())
  },
  component: ProductsPage,
})

function validateProductsSearch(
  search: Record<string, unknown>
): ProductsSearch {
  const query = typeof search.q === "string" ? search.q.trim() : ""

  return query ? { q: query } : {}
}

function ProductsPage() {
  const search = Route.useSearch()

  if (!hasConvexUrl()) {
    return <MissingBackend />
  }

  return <SearchContent initialQuery={search.q ?? ""} />
}
