import { CategoryUnavailableState } from "@/components/category-unavailable-state"
import {
  ShopStorefront,
  type StorefrontCategory,
  type StorefrontProduct,
} from "@/components/shop-storefront"
import { sortBySortOrder } from "@/lib/shop"
import { categoryPathPageQueryOptions } from "@/lib/shop-queries"
import { useSuspenseQuery } from "@tanstack/react-query"
import { useMemo } from "react"

const EMPTY_CATEGORIES: Array<StorefrontCategory> = []
const EMPTY_PRODUCTS: Array<StorefrontProduct> = []

function CategoryPathContent({ path }: { path: string }) {
  const { data } = useSuspenseQuery(categoryPathPageQueryOptions(path))
  const categories = data?.categories ?? EMPTY_CATEGORIES
  const products = data?.products ?? EMPTY_PRODUCTS
  const currentCategory = data?.currentCategory ?? null

  const children = useMemo(
    () =>
      currentCategory
        ? sortBySortOrder(
            categories.filter(
              (category) => category.parentId === currentCategory._id
            )
          )
        : EMPTY_CATEGORIES,
    [categories, currentCategory]
  )

  if (!currentCategory) {
    return <CategoryUnavailableState />
  }

  return (
    <ShopStorefront
      mode="public"
      categories={categories}
      currentCategory={currentCategory}
      childCategories={children}
      products={products}
      title={currentCategory.name}
    />
  )
}

export { CategoryPathContent }
