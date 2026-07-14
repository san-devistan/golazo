import type { ProductId as CustomerProductId } from "@/lib/customer-state"

import type {
  HomeCatalogSection,
  StorefrontCategory,
  StorefrontContentState,
  StorefrontProduct,
} from "./types"

export function buildStorefrontContentState<
  TCategory extends StorefrontCategory,
  TProduct extends StorefrontProduct<CustomerProductId, TCategory["_id"]>,
>({
  categoryProductSections,
  currentCategory,
  directProducts,
  hasCategories,
  hasCategoryProductPreviews,
  hideEmptySections,
  homeCatalogSections,
  isLoading,
  visibleCategories,
}: {
  categoryProductSections: Array<{
    category: TCategory
    products: Array<TProduct>
  }>
  currentCategory?: TCategory | null
  directProducts: Array<TProduct>
  hasCategories: boolean
  hasCategoryProductPreviews: boolean
  hideEmptySections: boolean
  homeCatalogSections: Array<HomeCatalogSection<TCategory, TProduct>>
  isLoading: boolean
  visibleCategories: Array<TCategory>
}): StorefrontContentState<TCategory, TProduct> {
  if (isLoading) {
    return { type: "loading" }
  }

  if (currentCategory) {
    return {
      type: "category",
      categoryProductSections,
      currentCategory,
      directProducts,
    }
  }

  if (!hasCategories) {
    return { type: "empty" }
  }

  if (homeCatalogSections.length > 0) {
    return {
      type: "homeCatalog",
      sections: homeCatalogSections,
      hideEmptyCollections: hideEmptySections,
    }
  }

  if (hasCategoryProductPreviews) {
    return {
      type: "categoryProductSections",
      categoryProductSections,
      hideEmptySections,
    }
  }

  return {
    type: "categoryLane",
    visibleCategories,
  }
}
