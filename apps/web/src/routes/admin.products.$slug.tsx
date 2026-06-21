import { readCatalogBackHrefSearch } from "@/lib/catalog-back-state"
import { hasConvexUrl } from "@/lib/shop"
import { productDetailQueryOptions } from "@/lib/shop-queries"
import { ProductDetailPage } from "@/routes/products.$slug"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/admin/products/$slug")({
  validateSearch: validateAdminProductSearch,
  loader: async ({ params, context: { queryClient } }) => {
    if (!hasConvexUrl()) {
      return
    }

    await queryClient.ensureQueryData(
      productDetailQueryOptions("admin", params.slug)
    )
  },
  component: AdminProductPage,
})

function validateAdminProductSearch(search: Record<string, unknown>) {
  const back = readCatalogBackHrefSearch(search)

  return back ? { back } : {}
}

function AdminProductPage() {
  const { slug } = Route.useParams()

  return <ProductDetailPage mode="admin" slug={slug} />
}
