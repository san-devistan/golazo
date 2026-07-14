import { ShopFooter } from "@/components/shop-footer"
import { ShopHeader } from "@/components/shop-header"
import { catalogRootHref, categoryHref } from "@/lib/catalog-navigation"
import type { ProductId as CustomerProductId } from "@/lib/customer-state"
import { sortBySortOrder } from "@/lib/shop"
import { cn } from "@workspace/ui/lib/utils"
import { useMemo, useState } from "react"

import {
  buildCategoryProductSections,
  buildHomeCatalogSections,
  sortProducts,
} from "./catalog"
import { GOLAZO_HERO_PRODUCTS_LIMIT } from "./constants"
import { buildStorefrontContentState } from "./content-state"
import { CategoryPageHeading, StorefrontPageHeading } from "./headings"
import { GolazoHomeHero } from "./home-hero"
import { StorefrontMainContent } from "./main-content"
import type {
  ShopStorefrontProps,
  StorefrontCategory,
  StorefrontMode,
  StorefrontProduct,
} from "./types"

export function ShopStorefront<
  TCategory extends StorefrontCategory,
  TProduct extends StorefrontProduct<CustomerProductId, TCategory["_id"]>,
>({
  mode,
  categories,
  currentCategory,
  childCategories,
  products,
  title,
  subtitle,
  kicker,
  isLoading = false,
  onAddToCategory,
  onEditCategory,
  onToggleCategoryVisibility,
  onEditProduct,
  onDeleteProduct,
  onToggleProductVisibility,
  onReorderCategories,
  onReorderProducts,
}: ShopStorefrontProps<TCategory, TProduct>) {
  const [productSearch, setProductSearch] = useState("")
  const isAdmin = mode === "admin"
  const filteredProducts = useFilteredStorefrontProducts(
    products,
    productSearch
  )
  const visibleCategories = useMemo(
    () => sortBySortOrder(childCategories),
    [childCategories]
  )
  const directProducts = useMemo(
    () =>
      currentCategory
        ? sortProducts(
            filteredProducts.filter(
              (product) => product.categoryId === currentCategory._id
            )
          )
        : [],
    [currentCategory, filteredProducts]
  )
  const categoryProductSections = useMemo(
    () =>
      buildCategoryProductSections({
        categories,
        products: filteredProducts,
        sectionCategories: visibleCategories,
      }),
    [categories, filteredProducts, visibleCategories]
  )
  const homeCatalogSections = useMemo(
    () =>
      currentCategory
        ? []
        : buildHomeCatalogSections({
            categories,
            products: filteredProducts,
            rootCategories: visibleCategories,
            hideEmptyCollections: !isAdmin,
          }),
    [categories, currentCategory, filteredProducts, isAdmin, visibleCategories]
  )
  const hasCategories = visibleCategories.length > 0
  const hasCategoryProductPreviews = categoryProductSections.some(
    (section) => section.products.length > 0
  )
  const currentPageHref = currentCategory
    ? categoryHref(currentCategory, mode)
    : catalogRootHref(mode)
  const isHomePage = !currentCategory && !isAdmin
  const heroProducts = useMemo(
    () => sortProducts(products).slice(0, GOLAZO_HERO_PRODUCTS_LIMIT),
    [products]
  )
  const contentState = buildStorefrontContentState({
    categoryProductSections,
    currentCategory,
    directProducts,
    hasCategories,
    hasCategoryProductPreviews,
    hideEmptySections: !isAdmin,
    homeCatalogSections,
    isLoading,
    visibleCategories,
  })

  return (
    <main className="min-h-svh bg-white text-[#111]">
      <ShopHeader
        categories={categories}
        currentCategoryId={currentCategory?._id}
        currentCategoryPath={currentCategory?.path}
        adminMode={isAdmin}
        products={products}
      />

      <HomeHeroSlot
        show={isHomePage}
        currentPageHref={currentPageHref}
        mode={mode}
        products={heroProducts}
      />

      <section className={storefrontSectionClassName(isHomePage)}>
        {currentCategory?.path ? (
          <CategoryPageHeading
            categories={categories}
            currentCategory={currentCategory}
            kicker={kicker}
            mode={mode}
            subtitle={subtitle}
            title={title ?? currentCategory.name}
            productSearch={productSearch}
            showProductSearch={!isAdmin}
            onProductSearchChange={setProductSearch}
          />
        ) : (
          <StorefrontPageHeading
            isAdmin={isAdmin}
            kicker={kicker}
            subtitle={subtitle}
            title={title}
          />
        )}

        <div className={currentCategory?.path ? "mt-8" : undefined}>
          <StorefrontMainContent
            mode={mode}
            currentPageHref={currentPageHref}
            contentState={contentState}
            onAddToCategory={onAddToCategory}
            onEditCategory={onEditCategory}
            onToggleCategoryVisibility={onToggleCategoryVisibility}
            onEditProduct={onEditProduct}
            onDeleteProduct={onDeleteProduct}
            onToggleProductVisibility={onToggleProductVisibility}
            onReorderCategories={onReorderCategories}
            onReorderProducts={onReorderProducts}
          />
        </div>
      </section>
      {!isAdmin && <ShopFooter categories={categories} />}
    </main>
  )
}

function storefrontSectionClassName(hasHomeHero: boolean) {
  return cn(
    "mx-auto max-w-[1536px] px-4 pb-16 sm:px-6 lg:px-10",
    hasHomeHero ? "pt-14" : "pt-6"
  )
}

function HomeHeroSlot({
  currentPageHref,
  mode,
  products,
  show,
}: {
  currentPageHref: string
  mode: StorefrontMode
  products: Array<StorefrontProduct>
  show: boolean
}) {
  if (!show) {
    return null
  }

  return (
    <GolazoHomeHero
      currentPageHref={currentPageHref}
      mode={mode}
      products={products}
    />
  )
}

function useFilteredStorefrontProducts<TProduct extends StorefrontProduct>(
  products: Array<TProduct>,
  search: string
) {
  const normalizedSearch = search.trim().toLowerCase()

  return useMemo(() => {
    if (!normalizedSearch) {
      return products
    }

    return products.filter((product) =>
      product.name.toLowerCase().includes(normalizedSearch)
    )
  }, [normalizedSearch, products])
}
