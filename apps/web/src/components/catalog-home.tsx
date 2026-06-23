import {
  ShopStorefront,
  type StorefrontCategory,
  type StorefrontProduct,
} from "@/components/shop-storefront"
import { sortBySortOrder } from "@/lib/shop"
import { catalogQueryOptions } from "@/lib/shop-queries"
import { useSuspenseQuery } from "@tanstack/react-query"
import { useMemo } from "react"

const EMPTY_CATEGORIES: Array<StorefrontCategory> = []
const EMPTY_PRODUCTS: Array<StorefrontProduct> = []

function CatalogHome() {
  const { data } = useSuspenseQuery(catalogQueryOptions())
  const categories: Array<StorefrontCategory> =
    data.categories ?? EMPTY_CATEGORIES
  const products: Array<StorefrontProduct> = data?.products ?? EMPTY_PRODUCTS

  const firstLevelCategories = useMemo(
    () =>
      sortBySortOrder(
        categories.filter((category) => category.parentId === null)
      ),
    [categories]
  )

  return (
    <ShopStorefront
      mode="public"
      categories={categories}
      childCategories={firstLevelCategories}
      products={products}
    />
  )
}

export { CatalogHome }
