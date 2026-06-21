import { convexQuery } from "@convex-dev/react-query"
import { api } from "@workspace/backend/api"
import type { GenericId } from "convex/values"

export type CategoryId = GenericId<"catalogCategories">
export type ProductRouteMode = "admin" | "public"

export function catalogQueryOptions() {
  return convexQuery(api.shop.listCatalog)
}

export function categoryPageQueryOptions(categoryId: CategoryId) {
  return convexQuery(api.shop.getCategoryPage, { categoryId })
}

export function categoryPathPageQueryOptions(path: string) {
  return convexQuery(api.shop.getCategoryPageByPath, { path })
}

export function productDetailQueryOptions(
  mode: ProductRouteMode,
  slug: string
) {
  return convexQuery(
    mode === "admin" ? api.shop.getAdminProduct : api.shop.getProduct,
    { slug }
  )
}
