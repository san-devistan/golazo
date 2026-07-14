import type { ProductId as CustomerProductId } from "@/lib/customer-state"
import { cn } from "@workspace/ui/lib/utils"
import { useMemo } from "react"

import { interleaveProductGroups, isHiddenCategory } from "./catalog"
import { CategorySectionAdminControls } from "./category-admin-controls"
import { CategoryHeadingLink } from "./category-elements"
import { HOME_FEATURED_PRODUCT_LIMIT } from "./constants"
import { AdminEmptyCollectionState } from "./empty-states"
import { ProductGrid } from "./product-grid"
import { ProductOneLineScroll } from "./product-one-line"
import type {
  CollectionProducts,
  HomeCatalogSection,
  StorefrontCategory,
  StorefrontMode,
  StorefrontProduct,
} from "./types"

export function HomeCatalogContent<
  TCategory extends StorefrontCategory,
  TProduct extends StorefrontProduct<CustomerProductId, TCategory["_id"]>,
>({
  mode,
  currentPageHref,
  sections,
  hideEmptyCollections,
  onAddToCategory,
  onEditCategory,
  onToggleCategoryVisibility,
  onEditProduct,
  onDeleteProduct,
  onToggleProductVisibility,
  onReorderProducts,
}: {
  mode: StorefrontMode
  currentPageHref: string
  sections: Array<HomeCatalogSection<TCategory, TProduct>>
  hideEmptyCollections: boolean
  onAddToCategory?: (category: TCategory) => void
  onEditCategory?: (category: TCategory) => void
  onToggleCategoryVisibility?: (category: TCategory) => void
  onEditProduct?: (product: TProduct) => void
  onDeleteProduct?: (product: TProduct) => void
  onToggleProductVisibility?: (product: TProduct) => void
  onReorderProducts?: (
    categoryId: TProduct["categoryId"],
    orderedProductIds: Array<TProduct["_id"]>
  ) => void
}) {
  return (
    <div className="space-y-16">
      {sections.map((section) =>
        section.type === "group" ? (
          <HomeCatalogGroupSection
            key={section.group._id}
            mode={mode}
            currentPageHref={currentPageHref}
            group={section.group}
            collections={section.collections}
            hideEmptyCollections={hideEmptyCollections}
            onAddToCategory={onAddToCategory}
            onEditCategory={onEditCategory}
            onToggleCategoryVisibility={onToggleCategoryVisibility}
            onEditProduct={onEditProduct}
            onDeleteProduct={onDeleteProduct}
            onToggleProductVisibility={onToggleProductVisibility}
          />
        ) : (
          <HomeCatalogCollectionSection
            key={section.collection._id}
            mode={mode}
            currentPageHref={currentPageHref}
            collection={section.collection}
            products={section.products}
            hideWhenEmpty={hideEmptyCollections}
            onAddToCategory={onAddToCategory}
            onEditCategory={onEditCategory}
            onToggleCategoryVisibility={onToggleCategoryVisibility}
            onEditProduct={onEditProduct}
            onDeleteProduct={onDeleteProduct}
            onToggleProductVisibility={onToggleProductVisibility}
            onReorderProducts={onReorderProducts}
          />
        )
      )}
    </div>
  )
}

function HomeCatalogGroupSection<
  TCategory extends StorefrontCategory,
  TProduct extends StorefrontProduct<CustomerProductId, TCategory["_id"]>,
>({
  mode,
  currentPageHref,
  group,
  collections,
  hideEmptyCollections,
  onAddToCategory,
  onEditCategory,
  onToggleCategoryVisibility,
  onEditProduct,
  onDeleteProduct,
  onToggleProductVisibility,
}: {
  mode: StorefrontMode
  currentPageHref: string
  group: TCategory
  collections: Array<CollectionProducts<TCategory, TProduct>>
  hideEmptyCollections: boolean
  onAddToCategory?: (category: TCategory) => void
  onEditCategory?: (category: TCategory) => void
  onToggleCategoryVisibility?: (category: TCategory) => void
  onEditProduct?: (product: TProduct) => void
  onDeleteProduct?: (product: TProduct) => void
  onToggleProductVisibility?: (product: TProduct) => void
}) {
  const isAdmin = mode === "admin"
  const visibleCollections = hideEmptyCollections
    ? collections.filter((collection) => collection.products.length > 0)
    : collections
  const groupProducts = interleaveProductGroups(visibleCollections)

  if (groupProducts.length === 0 && !isAdmin) {
    return null
  }

  return (
    <section>
      <HomeCatalogHeading
        category={group}
        isAdmin={isAdmin}
        mode={mode}
        onAddToCategory={onAddToCategory}
        onEditCategory={onEditCategory}
        onToggleCategoryVisibility={onToggleCategoryVisibility}
      />
      {groupProducts.length > 0 ? (
        <ProductOneLineScroll
          ariaLabel={`${group.name} products`}
          currentPageHref={currentPageHref}
          mode={mode}
          products={groupProducts}
          onEditProduct={onEditProduct}
          onDeleteProduct={onDeleteProduct}
          onToggleProductVisibility={onToggleProductVisibility}
        />
      ) : (
        <AdminEmptyCollectionState
          label={
            visibleCollections.length === 0 ? "No collections" : "No products"
          }
        />
      )}
    </section>
  )
}

function HomeCatalogCollectionSection<
  TCategory extends StorefrontCategory,
  TProduct extends StorefrontProduct<CustomerProductId, TCategory["_id"]>,
>({
  mode,
  currentPageHref,
  collection,
  products,
  hideWhenEmpty,
  onAddToCategory,
  onEditCategory,
  onToggleCategoryVisibility,
  onEditProduct,
  onDeleteProduct,
  onToggleProductVisibility,
  onReorderProducts,
}: {
  mode: StorefrontMode
  currentPageHref: string
  collection: TCategory
  products: Array<TProduct>
  hideWhenEmpty: boolean
  onAddToCategory?: (category: TCategory) => void
  onEditCategory?: (category: TCategory) => void
  onToggleCategoryVisibility?: (category: TCategory) => void
  onEditProduct?: (product: TProduct) => void
  onDeleteProduct?: (product: TProduct) => void
  onToggleProductVisibility?: (product: TProduct) => void
  onReorderProducts?: (
    categoryId: TProduct["categoryId"],
    orderedProductIds: Array<TProduct["_id"]>
  ) => void
}) {
  if (products.length === 0 && hideWhenEmpty) {
    return null
  }

  return (
    <section>
      <HomeCatalogHeading
        category={collection}
        isAdmin={mode === "admin"}
        mode={mode}
        onAddToCategory={onAddToCategory}
        onEditCategory={onEditCategory}
        onToggleCategoryVisibility={onToggleCategoryVisibility}
      />
      {products.length > 0 && mode === "public" ? (
        <HomeFeaturedProductGrid
          categoryId={collection._id}
          currentPageHref={currentPageHref}
          mode={mode}
          products={products}
          onEditProduct={onEditProduct}
          onDeleteProduct={onDeleteProduct}
          onToggleProductVisibility={onToggleProductVisibility}
          onReorderProducts={onReorderProducts}
        />
      ) : products.length > 0 ? (
        <ProductOneLineScroll
          ariaLabel={`${collection.name} products`}
          categoryId={collection._id}
          currentPageHref={currentPageHref}
          mode={mode}
          products={products}
          onEditProduct={onEditProduct}
          onDeleteProduct={onDeleteProduct}
          onToggleProductVisibility={onToggleProductVisibility}
          onReorderProducts={onReorderProducts}
        />
      ) : (
        <AdminEmptyCollectionState label="No products" />
      )}
    </section>
  )
}

function HomeCatalogHeading<TCategory extends StorefrontCategory>({
  category,
  isAdmin,
  mode,
  onAddToCategory,
  onEditCategory,
  onToggleCategoryVisibility,
}: {
  category: TCategory
  isAdmin: boolean
  mode: StorefrontMode
  onAddToCategory?: (category: TCategory) => void
  onEditCategory?: (category: TCategory) => void
  onToggleCategoryVisibility?: (category: TCategory) => void
}) {
  const isHidden = isHiddenCategory(category)

  return (
    <div
      className={cn(
        "group/section relative mb-5 flex min-w-0 items-center justify-start gap-4",
        isAdmin && "pr-10 sm:pr-40"
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
          canMovePrevious={false}
          canMoveNext={false}
        />
      )}
    </div>
  )
}

function HomeFeaturedProductGrid<TProduct extends StorefrontProduct>({
  categoryId,
  currentPageHref,
  mode,
  products,
  onEditProduct,
  onDeleteProduct,
  onToggleProductVisibility,
  onReorderProducts,
}: {
  categoryId?: TProduct["categoryId"]
  currentPageHref: string
  mode: StorefrontMode
  products: Array<TProduct>
  onEditProduct?: (product: TProduct) => void
  onDeleteProduct?: (product: TProduct) => void
  onToggleProductVisibility?: (product: TProduct) => void
  onReorderProducts?: (
    categoryId: TProduct["categoryId"],
    orderedProductIds: Array<TProduct["_id"]>
  ) => void
}) {
  const featuredProducts = useMemo(
    () => products.slice(0, HOME_FEATURED_PRODUCT_LIMIT),
    [products]
  )

  return (
    <ProductGrid
      categoryId={categoryId}
      currentPageHref={currentPageHref}
      mode={mode}
      products={featuredProducts}
      onEditProduct={onEditProduct}
      onDeleteProduct={onDeleteProduct}
      onToggleProductVisibility={onToggleProductVisibility}
      onReorderProducts={onReorderProducts}
    />
  )
}
