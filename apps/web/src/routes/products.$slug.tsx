import { ProductDetailPage } from "@/components/product-detail-page"
import { requireAdminAuth } from "@/lib/admin-auth"
import { readCatalogBackHrefSearch } from "@/lib/catalog-back-state"
import { hasConvexUrl } from "@/lib/shop"
import {
  productDetailQueryOptions,
  type ProductRouteMode,
} from "@/lib/shop-queries"
import { createFileRoute } from "@tanstack/react-router"

export { ProductDetailPage } from "@/components/product-detail-page"

export const Route = createFileRoute("/products/$slug")({
  validateSearch: validateProductSearch,
  loaderDeps: ({ search }) => ({ mode: productRouteMode(search) }),
  beforeLoad: async ({ location, search }) => {
    if (productRouteMode(search) === "admin") {
      await requireAdminAuth(location.href)
    }
  },
  loader: async ({ params, deps, context: { queryClient } }) => {
    if (!hasConvexUrl()) {
      return
    }

    await queryClient.ensureQueryData(
      productDetailQueryOptions(deps.mode, params.slug)
    )
  },
  component: ProductPage,
})

type ProductSearch = {
  back?: string
  mode?: "admin"
}

function validateProductSearch(search: Record<string, unknown>): ProductSearch {
  const back = readCatalogBackHrefSearch(search)

  return {
    ...(back ? { back } : {}),
    ...(search.mode === "admin" ? { mode: "admin" } : {}),
  }
}

function productRouteMode(search: ProductSearch): ProductRouteMode {
  return search.mode === "admin" ? "admin" : "public"
}

function ProductPage() {
  const { slug } = Route.useParams()
  const mode = productRouteMode(Route.useSearch())

  return <ProductDetailPage mode={mode} slug={slug} />
}
