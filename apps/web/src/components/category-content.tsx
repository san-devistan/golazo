import { CategoryUnavailableState } from "@/components/category-unavailable-state"
import {
  ShopStorefront,
  type StorefrontCategory,
  type StorefrontProduct,
} from "@/components/shop-storefront"
import { sortBySortOrder } from "@/lib/shop"
import { categoryPageQueryOptions, type CategoryId } from "@/lib/shop-queries"
import { useSuspenseQuery } from "@tanstack/react-query"
import { useMemo } from "react"

const EMPTY_CATEGORIES: Array<StorefrontCategory> = []
const EMPTY_PRODUCTS: Array<StorefrontProduct> = []

function CategoryContent({ categoryId }: { categoryId: CategoryId }) {
  const { data } = useSuspenseQuery(categoryPageQueryOptions(categoryId))
  const categories = data?.categories ?? EMPTY_CATEGORIES
  const products = data?.products ?? EMPTY_PRODUCTS
  const currentCategory = data?.currentCategory as
    | StorefrontCategory
    | undefined

  const children = useMemo(
    () =>
      sortBySortOrder(
        categories.filter((category) => category.parentId === categoryId)
      ),
    [categories, categoryId]
  )
  if (data === null) {
    return <CategoryUnavailableState />
  }

  return (
    <ShopStorefront
      mode="public"
      categories={categories}
      currentCategory={currentCategory}
      childCategories={children}
      products={products}
      title={data.currentCategory.name}
    />
  )
}

export { CategoryContent }
