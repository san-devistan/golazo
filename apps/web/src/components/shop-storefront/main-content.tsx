import type { ProductId as CustomerProductId } from "@/lib/customer-state"

import {
  CategoryPageContent,
  CategoryProductSections,
} from "./category-content"
import { CategoryLane } from "./category-lane"
import { EmptyShelf, StorefrontSkeleton } from "./empty-states"
import { HomeCatalogContent } from "./home-catalog"
import type {
  StorefrontCategory,
  StorefrontContentState,
  StorefrontMode,
  StorefrontProduct,
} from "./types"

export function StorefrontMainContent<
  TCategory extends StorefrontCategory,
  TProduct extends StorefrontProduct<CustomerProductId, TCategory["_id"]>,
>({
  mode,
  currentPageHref,
  contentState,
  onAddToCategory,
  onEditCategory,
  onToggleCategoryVisibility,
  onEditProduct,
  onDeleteProduct,
  onToggleProductVisibility,
  onReorderCategories,
  onReorderProducts,
}: {
  mode: StorefrontMode
  currentPageHref: string
  contentState: StorefrontContentState<TCategory, TProduct>
  onAddToCategory?: (category: TCategory) => void
  onEditCategory?: (category: TCategory) => void
  onToggleCategoryVisibility?: (category: TCategory) => void
  onEditProduct?: (product: TProduct) => void
  onDeleteProduct?: (product: TProduct) => void
  onToggleProductVisibility?: (product: TProduct) => void
  onReorderCategories?: (orderedCategoryIds: Array<TCategory["_id"]>) => void
  onReorderProducts?: (
    categoryId: TProduct["categoryId"],
    orderedProductIds: Array<TProduct["_id"]>
  ) => void
}) {
  if (contentState.type === "loading") {
    return <StorefrontSkeleton />
  }

  if (contentState.type === "category") {
    return (
      <CategoryPageContent
        mode={mode}
        currentCategory={contentState.currentCategory}
        currentPageHref={currentPageHref}
        directProducts={contentState.directProducts}
        categoryProductSections={contentState.categoryProductSections}
        onAddToCategory={onAddToCategory}
        onEditCategory={onEditCategory}
        onToggleCategoryVisibility={onToggleCategoryVisibility}
        onEditProduct={onEditProduct}
        onDeleteProduct={onDeleteProduct}
        onToggleProductVisibility={onToggleProductVisibility}
        onReorderCategories={onReorderCategories}
        onReorderProducts={onReorderProducts}
      />
    )
  }

  if (contentState.type === "empty") {
    return <EmptyShelf isCategoryPage={false} />
  }

  if (contentState.type === "homeCatalog") {
    return (
      <HomeCatalogContent
        mode={mode}
        currentPageHref={currentPageHref}
        sections={contentState.sections}
        hideEmptyCollections={contentState.hideEmptyCollections}
        onAddToCategory={onAddToCategory}
        onEditCategory={onEditCategory}
        onToggleCategoryVisibility={onToggleCategoryVisibility}
        onEditProduct={onEditProduct}
        onDeleteProduct={onDeleteProduct}
        onToggleProductVisibility={onToggleProductVisibility}
        onReorderProducts={onReorderProducts}
      />
    )
  }

  if (contentState.type === "categoryProductSections") {
    return (
      <CategoryProductSections
        mode={mode}
        currentPageHref={currentPageHref}
        sections={contentState.categoryProductSections}
        onAddToCategory={onAddToCategory}
        onEditCategory={onEditCategory}
        onToggleCategoryVisibility={onToggleCategoryVisibility}
        onEditProduct={onEditProduct}
        onDeleteProduct={onDeleteProduct}
        onToggleProductVisibility={onToggleProductVisibility}
        onReorderCategories={onReorderCategories}
        hideEmptySections={contentState.hideEmptySections}
      />
    )
  }

  return (
    <CategoryLane
      mode={mode}
      categories={contentState.visibleCategories}
      onAddToCategory={onAddToCategory}
      onEditCategory={onEditCategory}
      onToggleCategoryVisibility={onToggleCategoryVisibility}
      onReorderCategories={onReorderCategories}
    />
  )
}
