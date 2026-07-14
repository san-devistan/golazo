import type { ProductId as CustomerProductId } from "@/lib/customer-state"
import { cn } from "@workspace/ui/lib/utils"
import { useCallback, useMemo } from "react"

import { moveByOffset, categoryCatalogKind, isHiddenCategory } from "./catalog"
import { CategorySectionAdminControls } from "./category-admin-controls"
import { CategoryHeadingLink } from "./category-elements"
import { EmptyShelf } from "./empty-states"
import { ProductSection } from "./product-grid"
import { ProductLane } from "./product-lane"
import { ProductOneLineScroll } from "./product-one-line"
import type {
  StorefrontCategory,
  StorefrontMode,
  StorefrontProduct,
} from "./types"

export function CategoryPageContent<
  TCategory extends StorefrontCategory,
  TProduct extends StorefrontProduct<CustomerProductId, TCategory["_id"]>,
>({
  mode,
  currentCategory,
  currentPageHref,
  directProducts,
  categoryProductSections,
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
  currentCategory: TCategory
  currentPageHref: string
  directProducts: Array<TProduct>
  categoryProductSections: Array<{
    category: TCategory
    products: Array<TProduct>
  }>
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
  const hasDirectProducts = directProducts.length > 0
  const hasCategorySections = categoryProductSections.length > 0
  const isGroupPage = categoryCatalogKind(currentCategory) === "group"
  const showDirectProducts =
    hasDirectProducts && (mode === "admin" || !hasCategorySections)
  const useProductRows = isGroupPage

  if (!showDirectProducts && !hasCategorySections) {
    return <EmptyShelf isCategoryPage />
  }

  return (
    <div className="space-y-12">
      {showDirectProducts && (
        <ProductSection
          categoryId={currentCategory._id}
          className="mt-8"
          currentPageHref={currentPageHref}
          mode={mode}
          products={directProducts}
          onEditProduct={onEditProduct}
          onDeleteProduct={onDeleteProduct}
          onToggleProductVisibility={onToggleProductVisibility}
          onReorderProducts={onReorderProducts}
        />
      )}

      {hasCategorySections && (
        <CategoryProductSections
          mode={mode}
          currentPageHref={currentPageHref}
          sections={categoryProductSections}
          onAddToCategory={onAddToCategory}
          onEditCategory={onEditCategory}
          onToggleCategoryVisibility={onToggleCategoryVisibility}
          onEditProduct={onEditProduct}
          onDeleteProduct={onDeleteProduct}
          onToggleProductVisibility={onToggleProductVisibility}
          onReorderCategories={onReorderCategories}
          onReorderProducts={onReorderProducts}
          useProductRows={useProductRows}
        />
      )}
    </div>
  )
}

export function CategoryProductSections<
  TCategory extends StorefrontCategory,
  TProduct extends StorefrontProduct<CustomerProductId, TCategory["_id"]>,
>({
  mode,
  currentPageHref,
  sections,
  onAddToCategory,
  onEditCategory,
  onToggleCategoryVisibility,
  onEditProduct,
  onDeleteProduct,
  onToggleProductVisibility,
  onReorderCategories,
  onReorderProducts,
  hideEmptySections = false,
  useProductRows = false,
}: {
  mode: StorefrontMode
  currentPageHref: string
  sections: Array<{
    category: TCategory
    products: Array<TProduct>
  }>
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
  hideEmptySections?: boolean
  useProductRows?: boolean
}) {
  const isAdmin = mode === "admin"
  const visibleSections = useMemo(
    () =>
      hideEmptySections && !isAdmin
        ? sections.filter((section) => section.products.length > 0)
        : sections,
    [hideEmptySections, isAdmin, sections]
  )

  return (
    <div className="space-y-12">
      {visibleSections.map((section, index) => (
        <CategoryProductSection
          key={section.category._id}
          section={section}
          sections={visibleSections}
          index={index}
          isAdmin={isAdmin}
          mode={mode}
          currentPageHref={currentPageHref}
          onAddToCategory={onAddToCategory}
          onEditCategory={onEditCategory}
          onToggleCategoryVisibility={onToggleCategoryVisibility}
          onEditProduct={onEditProduct}
          onDeleteProduct={onDeleteProduct}
          onToggleProductVisibility={onToggleProductVisibility}
          onReorderCategories={onReorderCategories}
          onReorderProducts={onReorderProducts}
          useProductRows={useProductRows}
        />
      ))}
    </div>
  )
}

function CategoryProductSection<
  TCategory extends StorefrontCategory,
  TProduct extends StorefrontProduct<CustomerProductId, TCategory["_id"]>,
>({
  section,
  sections,
  index,
  isAdmin,
  mode,
  currentPageHref,
  onAddToCategory,
  onEditCategory,
  onToggleCategoryVisibility,
  onEditProduct,
  onDeleteProduct,
  onToggleProductVisibility,
  onReorderCategories,
  onReorderProducts,
  useProductRows,
}: {
  section: { category: TCategory; products: Array<TProduct> }
  sections: Array<{ category: TCategory; products: Array<TProduct> }>
  index: number
  isAdmin: boolean
  mode: StorefrontMode
  currentPageHref: string
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
  useProductRows: boolean
}) {
  const categories = useMemo(
    () => sections.map((currentSection) => currentSection.category),
    [sections]
  )
  const handleMovePrevious = useCallback(() => {
    onReorderCategories?.(
      moveByOffset(categories, index, -1).map((item) => item._id)
    )
  }, [categories, index, onReorderCategories])
  const handleMoveNext = useCallback(() => {
    onReorderCategories?.(
      moveByOffset(categories, index, 1).map((item) => item._id)
    )
  }, [categories, index, onReorderCategories])
  const { category, products } = section
  const isHidden = isHiddenCategory(category)

  return (
    <section>
      <div
        className={cn(
          "group/section relative mb-7 flex min-w-0 items-center justify-start gap-4",
          isAdmin && "pr-10 sm:pr-48"
        )}
      >
        <CategoryHeadingLink
          category={category}
          mode={mode}
          isDimmed={isAdmin && isHidden}
        />
        {isAdmin && (
          <CategorySectionAdminControls
            category={category}
            onAddToCategory={onAddToCategory}
            onEditCategory={onEditCategory}
            onToggleCategoryVisibility={onToggleCategoryVisibility}
            canMovePrevious={index > 0}
            canMoveNext={index < sections.length - 1}
            onMovePrevious={
              onReorderCategories ? handleMovePrevious : undefined
            }
            onMoveNext={onReorderCategories ? handleMoveNext : undefined}
          />
        )}
      </div>
      {products.length > 0 && useProductRows ? (
        <ProductOneLineScroll
          ariaLabel={`${category.name} products`}
          categoryId={category._id}
          currentPageHref={currentPageHref}
          mode={mode}
          products={products}
          onEditProduct={onEditProduct}
          onDeleteProduct={onDeleteProduct}
          onToggleProductVisibility={onToggleProductVisibility}
          onReorderProducts={onReorderProducts}
        />
      ) : products.length > 0 ? (
        <ProductLane
          categoryId={category._id}
          currentPageHref={currentPageHref}
          mode={mode}
          products={products}
          onEditProduct={onEditProduct}
          onDeleteProduct={onDeleteProduct}
          onToggleProductVisibility={onToggleProductVisibility}
          onReorderProducts={onReorderProducts}
        />
      ) : (
        isAdmin && (
          <div className="border border-dashed border-[#d9d9d9] bg-[#fafafa] px-4 py-6 text-sm font-semibold text-[#777]">
            No products
          </div>
        )
      )}
    </section>
  )
}
