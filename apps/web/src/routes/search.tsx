import { createFileRoute, redirect } from "@tanstack/react-router"

type SearchSearch = {
  q?: string
}

export const Route = createFileRoute("/search")({
  validateSearch: validateSearchSearch,
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/products",
      search,
    })
  },
})

function validateSearchSearch(search: Record<string, unknown>): SearchSearch {
  const query = typeof search.q === "string" ? search.q.trim() : ""

  return query ? { q: query } : {}
}
