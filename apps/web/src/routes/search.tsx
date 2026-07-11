import { MissingBackend } from "@/components/missing-backend"
import { SearchContent } from "@/components/search-content"
import { hasConvexUrl } from "@/lib/shop"
import { catalogQueryOptions } from "@/lib/shop-queries"
import { createFileRoute } from "@tanstack/react-router"

type SearchParams = {
  q?: string
}

export const Route = createFileRoute("/search")({
  validateSearch: validateSearchParams,
  loader: async ({ context: { queryClient } }) => {
    if (!hasConvexUrl()) {
      return
    }

    await queryClient.ensureQueryData(catalogQueryOptions())
  },
  component: SearchPage,
})

function validateSearchParams(search: Record<string, unknown>): SearchParams {
  const query = typeof search.q === "string" ? search.q.trim() : ""

  return query ? { q: query } : {}
}

function SearchPage() {
  const search = Route.useSearch()

  if (!hasConvexUrl()) {
    return <MissingBackend />
  }

  return <SearchContent initialQuery={search.q ?? ""} />
}
