import { ShopHeader } from "@/components/shop-header"
import { ShopHierarchyNav } from "@/components/shop-hierarchy-nav"
import { WishlistHeartButton } from "@/components/wishlist-heart-button"
import { catalogBackHrefSearch } from "@/lib/catalog-back-state"
import { catalogRootHref, categoryHref } from "@/lib/catalog-navigation"
import {
  type CustomerProductSnapshot,
  type ProductId as CustomerProductId,
  useCustomerState,
} from "@/lib/customer-state"
import { formatPrice, sortBySortOrder } from "@/lib/shop"
import { Link } from "@tanstack/react-router"
/* eslint-disable max-lines, react-perf/jsx-no-new-function-as-prop, react-perf/jsx-no-new-object-as-prop */
import { Button } from "@workspace/ui/components/button"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  useCarousel,
} from "@workspace/ui/components/carousel"
import { buttonVariants } from "@workspace/ui/lib/button-variants"
import { cn } from "@workspace/ui/lib/utils"
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  ClipboardListIcon,
  EyeIcon,
  EyeOffIcon,
  FolderPlusIcon,
  MailIcon,
  PackagePlusIcon,
  PencilIcon,
  SettingsIcon,
  Trash2Icon,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

export type StorefrontMode = "admin" | "public"

export type StorefrontCategory<CategoryId extends string = string> = {
  _id: CategoryId
  name: string
  parentId: CategoryId | null
  path?: string
  depth?: number
  sortOrder: number
  isActive?: boolean
}

export type StorefrontProduct<
  TProductId extends string = CustomerProductId,
  CategoryId extends string = string,
> = {
  _id: TProductId
  categoryId: CategoryId
  name: string
  slug?: string
  description: string
  basePriceCents: number
  currency: string
  imageUrl: string | null
  sortOrder?: number
  status?: string
}

const PRODUCT_LANE_DESKTOP_SCROLL_SIZE = 4
const PRODUCT_LANE_CAROUSEL_OPTS = {
  align: "start",
  containScroll: "trimSnaps",
  slidesToScroll: 1,
  breakpoints: {
    "(min-width: 640px)": { slidesToScroll: 2 },
    "(min-width: 768px)": { slidesToScroll: 3 },
    "(min-width: 1024px)": {
      slidesToScroll: PRODUCT_LANE_DESKTOP_SCROLL_SIZE,
    },
  },
} as const
const CATEGORY_CAROUSEL_PRIORITY_VISIBLE_PRODUCT_COUNT =
  PRODUCT_LANE_DESKTOP_SCROLL_SIZE

type ShopStorefrontProps<
  TCategory extends StorefrontCategory,
  TProduct extends StorefrontProduct<CustomerProductId, TCategory["_id"]>,
> = {
  mode: StorefrontMode
  categories: Array<TCategory>
  currentCategory?: TCategory | null
  childCategories: Array<TCategory>
  products: Array<TProduct>
  title?: string
  subtitle?: string
  kicker?: string
  isLoading?: boolean
  canAddProduct?: boolean
  onAddCategory?: () => void
  onAddProduct?: () => void
  onEditCategory?: (category: TCategory) => void
  onDeleteCategory?: (category: TCategory) => void
  onToggleCategoryVisibility?: (category: TCategory) => void
  onEditProduct?: (product: TProduct) => void
  onDeleteProduct?: (product: TProduct) => void
  onToggleProductVisibility?: (product: TProduct) => void
  onReorderCategories?: (orderedCategoryIds: Array<TCategory["_id"]>) => void
  onReorderProducts?: (
    categoryId: TProduct["categoryId"],
    orderedProductIds: Array<TProduct["_id"]>
  ) => void
}

type StorefrontContentState<
  TCategory extends StorefrontCategory,
  TProduct extends StorefrontProduct<CustomerProductId, TCategory["_id"]>,
> =
  | {
      type: "loading"
    }
  | {
      type: "category"
      currentCategory: TCategory
      categoryProductSections: Array<{
        category: TCategory
        products: Array<TProduct>
      }>
      directProducts: Array<TProduct>
    }
  | {
      type: "empty"
    }
  | {
      type: "categoryProductSections"
      categoryProductSections: Array<{
        category: TCategory
        products: Array<TProduct>
      }>
      hideEmptySections: boolean
    }
  | {
      type: "categoryLane"
      visibleCategories: Array<TCategory>
    }

function moveByOffset<T>(items: Array<T>, index: number, offset: number) {
  const targetIndex = index + offset

  if (index < 0 || targetIndex < 0 || targetIndex >= items.length) {
    return items
  }

  const nextItems = Array.from(items)
  const [movedItem] = nextItems.splice(index, 1)

  if (!movedItem) {
    return items
  }

  nextItems.splice(targetIndex, 0, movedItem)
  return nextItems
}

function buildStorefrontContentState<
  TCategory extends StorefrontCategory,
  TProduct extends StorefrontProduct<CustomerProductId, TCategory["_id"]>,
>({
  categoryProductSections,
  currentCategory,
  directProducts,
  hasCategories,
  hasCategoryProductPreviews,
  hideEmptySections,
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
  canAddProduct = false,
  onAddCategory,
  onAddProduct,
  onEditCategory,
  onDeleteCategory,
  onToggleCategoryVisibility,
  onEditProduct,
  onDeleteProduct,
  onToggleProductVisibility,
  onReorderCategories,
  onReorderProducts,
}: ShopStorefrontProps<TCategory, TProduct>) {
  const visibleCategories = useMemo(
    () => sortBySortOrder(childCategories),
    [childCategories]
  )
  const directProducts = useMemo(
    () =>
      currentCategory
        ? sortProducts(
            products.filter(
              (product) => product.categoryId === currentCategory._id
            )
          )
        : [],
    [currentCategory, products]
  )
  const categoryProductSections = useMemo(
    () =>
      buildCategoryProductSections({
        categories,
        products,
        sectionCategories: visibleCategories,
      }),
    [categories, products, visibleCategories]
  )
  const hasCategories = visibleCategories.length > 0
  const isAdmin = mode === "admin"
  const hasCategoryProductPreviews = categoryProductSections.some(
    (section) => section.products.length > 0
  )
  const currentPageHref = currentCategory
    ? categoryHref(currentCategory, mode)
    : catalogRootHref(mode)
  const contentState = buildStorefrontContentState({
    categoryProductSections,
    currentCategory,
    directProducts,
    hasCategories,
    hasCategoryProductPreviews,
    hideEmptySections: !isAdmin,
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
      />

      <section className="mx-auto max-w-[1536px] px-4 pt-6 pb-10 sm:px-6 lg:px-10">
        {currentCategory?.path ? (
          <CategoryPageHeading
            canAddProduct={canAddProduct}
            categories={categories}
            currentCategory={currentCategory}
            isAdmin={isAdmin}
            kicker={kicker}
            mode={mode}
            subtitle={subtitle}
            title={title ?? currentCategory.name}
            onAddCategory={onAddCategory}
            onAddProduct={onAddProduct}
            onDeleteCategory={onDeleteCategory}
          />
        ) : (
          <StorefrontPageHeading
            canAddProduct={canAddProduct}
            currentCategory={currentCategory}
            isAdmin={isAdmin}
            kicker={kicker}
            subtitle={subtitle}
            title={title}
            onAddCategory={onAddCategory}
            onAddProduct={onAddProduct}
            onDeleteCategory={onDeleteCategory}
          />
        )}

        <StorefrontMainContent
          mode={mode}
          currentPageHref={currentPageHref}
          contentState={contentState}
          onEditCategory={onEditCategory}
          onDeleteCategory={onDeleteCategory}
          onToggleCategoryVisibility={onToggleCategoryVisibility}
          onEditProduct={onEditProduct}
          onDeleteProduct={onDeleteProduct}
          onToggleProductVisibility={onToggleProductVisibility}
          onReorderCategories={onReorderCategories}
          onReorderProducts={onReorderProducts}
        />
      </section>
    </main>
  )
}

function StorefrontMainContent<
  TCategory extends StorefrontCategory,
  TProduct extends StorefrontProduct<CustomerProductId, TCategory["_id"]>,
>({
  mode,
  currentPageHref,
  contentState,
  onEditCategory,
  onDeleteCategory,
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
  onEditCategory?: (category: TCategory) => void
  onDeleteCategory?: (category: TCategory) => void
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
        onEditCategory={onEditCategory}
        onDeleteCategory={onDeleteCategory}
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

  if (contentState.type === "categoryProductSections") {
    return (
      <CategoryProductSections
        mode={mode}
        currentPageHref={currentPageHref}
        sections={contentState.categoryProductSections}
        onEditCategory={onEditCategory}
        onDeleteCategory={onDeleteCategory}
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
      onEditCategory={onEditCategory}
      onDeleteCategory={onDeleteCategory}
      onToggleCategoryVisibility={onToggleCategoryVisibility}
      onReorderCategories={onReorderCategories}
    />
  )
}

function CategoryPageHeading<TCategory extends StorefrontCategory>({
  canAddProduct,
  categories,
  currentCategory,
  isAdmin,
  kicker,
  mode,
  subtitle,
  title,
  onAddCategory,
  onAddProduct,
  onDeleteCategory,
}: {
  canAddProduct: boolean
  categories: Array<TCategory>
  currentCategory: TCategory
  isAdmin: boolean
  kicker?: string
  mode: StorefrontMode
  subtitle?: string
  title: string
  onAddCategory?: () => void
  onAddProduct?: () => void
  onDeleteCategory?: (category: TCategory) => void
}) {
  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
      <ShopHierarchyNav
        mode={mode}
        categories={categories}
        currentCategory={currentCategory}
        className="min-w-0"
      />
      <div className="flex shrink-0 flex-col items-end gap-3 text-right lg:max-w-[48rem]">
        {kicker && (
          <p className="text-xs font-bold tracking-[0.18em] uppercase">
            {kicker}
          </p>
        )}
        <h1 className="font-oswald text-4xl leading-none font-black tracking-tight uppercase sm:text-5xl lg:text-6xl">
          {title}
        </h1>
        {subtitle && (
          <p className="max-w-xl text-sm leading-6 text-[#555]">{subtitle}</p>
        )}
        {isAdmin && (
          <AdminPageActions
            canAddProduct={canAddProduct}
            currentCategory={currentCategory}
            onAddCategory={onAddCategory}
            onAddProduct={onAddProduct}
            onDeleteCategory={onDeleteCategory}
          />
        )}
      </div>
    </div>
  )
}

function StorefrontPageHeading<TCategory extends StorefrontCategory>({
  canAddProduct,
  currentCategory,
  isAdmin,
  kicker,
  subtitle,
  title,
  onAddCategory,
  onAddProduct,
  onDeleteCategory,
}: {
  canAddProduct: boolean
  currentCategory?: TCategory | null
  isAdmin: boolean
  kicker?: string
  subtitle?: string
  title?: string
  onAddCategory?: () => void
  onAddProduct?: () => void
  onDeleteCategory?: (category: TCategory) => void
}) {
  const hasCopy = Boolean(kicker) || Boolean(title) || Boolean(subtitle)

  if (!hasCopy && !isAdmin) {
    return null
  }

  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      {hasCopy && (
        <div>
          {kicker && (
            <p className="mb-2 text-xs font-bold tracking-[0.18em] uppercase">
              {kicker}
            </p>
          )}
          {title && (
            <h1 className="max-w-4xl font-oswald text-4xl font-black tracking-tight uppercase sm:text-5xl lg:text-6xl">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#555]">
              {subtitle}
            </p>
          )}
        </div>
      )}
      {isAdmin && (
        <AdminPageActions
          canAddProduct={canAddProduct}
          currentCategory={currentCategory}
          onAddCategory={onAddCategory}
          onAddProduct={onAddProduct}
          onDeleteCategory={onDeleteCategory}
        />
      )}
    </div>
  )
}

function AdminPageActions<TCategory extends StorefrontCategory>({
  canAddProduct,
  currentCategory,
  onAddCategory,
  onAddProduct,
  onDeleteCategory,
}: {
  canAddProduct: boolean
  currentCategory?: TCategory | null
  onAddCategory?: () => void
  onAddProduct?: () => void
  onDeleteCategory?: (category: TCategory) => void
}) {
  const categoryLabel = currentCategory ? "Add sub-category" : "Add category"

  return (
    <div className="flex shrink-0 items-center gap-2">
      {onAddCategory && (
        <Button
          type="button"
          size="icon-lg"
          title={categoryLabel}
          aria-label={categoryLabel}
          onClick={onAddCategory}
          className="rounded-none bg-[#111] text-white hover:bg-[#333]"
        >
          <FolderPlusIcon />
        </Button>
      )}
      {canAddProduct && onAddProduct && (
        <Button
          type="button"
          size="icon-lg"
          title="Add product"
          aria-label="Add product"
          onClick={onAddProduct}
          className="rounded-none bg-[#111] text-white hover:bg-[#333]"
        >
          <PackagePlusIcon />
        </Button>
      )}
      {currentCategory && onDeleteCategory && (
        <Button
          type="button"
          size="icon-lg"
          variant="destructive"
          title="Delete category"
          aria-label="Delete category"
          className="rounded-none"
          onClick={() => onDeleteCategory(currentCategory)}
        >
          <Trash2Icon />
        </Button>
      )}
      <Link
        to="/admin/orders"
        title="Orders"
        aria-label="Orders"
        className={cn(
          buttonVariants({ variant: "outline", size: "icon-lg" }),
          "rounded-none"
        )}
      >
        <ClipboardListIcon />
      </Link>
      <Link
        to="/admin/emails"
        title="Email previews"
        aria-label="Email previews"
        className={cn(
          buttonVariants({ variant: "outline", size: "icon-lg" }),
          "rounded-none"
        )}
      >
        <MailIcon />
      </Link>
      <Link
        to="/admin/settings"
        title="Product settings"
        aria-label="Product settings"
        className={cn(
          buttonVariants({ variant: "outline", size: "icon-lg" }),
          "rounded-none"
        )}
      >
        <SettingsIcon />
      </Link>
    </div>
  )
}

function CardAdminOverlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-x-3 top-3 flex items-center justify-between gap-2 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100">
      <div className="pointer-events-none flex items-center gap-1 group-focus-within:pointer-events-auto group-hover:pointer-events-auto">
        {children}
      </div>
    </div>
  )
}

function CardIconButton({
  title,
  variant = "outline",
  onClick,
  children,
}: {
  title: string
  variant?: React.ComponentProps<typeof Button>["variant"]
  onClick?: () => void
  children: React.ReactNode
}) {
  return (
    <Button
      type="button"
      size="icon-sm"
      variant={variant}
      title={title}
      aria-label={title}
      className="rounded-none bg-white shadow-sm hover:bg-[#f1f1f1]"
      onClick={onClick}
    >
      {children}
    </Button>
  )
}

function CategoryPageContent<
  TCategory extends StorefrontCategory,
  TProduct extends StorefrontProduct<CustomerProductId, TCategory["_id"]>,
>({
  mode,
  currentCategory,
  currentPageHref,
  directProducts,
  categoryProductSections,
  onEditCategory,
  onDeleteCategory,
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
  onEditCategory?: (category: TCategory) => void
  onDeleteCategory?: (category: TCategory) => void
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
  const showDirectProducts =
    hasDirectProducts && (mode === "admin" || !hasCategorySections)

  if (!showDirectProducts && !hasCategorySections) {
    return <EmptyShelf isCategoryPage />
  }

  return (
    <div className="space-y-12">
      {showDirectProducts && (
        <ProductSection
          categoryId={currentCategory._id}
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
          onEditCategory={onEditCategory}
          onDeleteCategory={onDeleteCategory}
          onToggleCategoryVisibility={onToggleCategoryVisibility}
          onEditProduct={onEditProduct}
          onDeleteProduct={onDeleteProduct}
          onToggleProductVisibility={onToggleProductVisibility}
          onReorderCategories={onReorderCategories}
          onReorderProducts={onReorderProducts}
        />
      )}
    </div>
  )
}

function ProductSection<TProduct extends StorefrontProduct>({
  categoryId,
  currentPageHref,
  mode,
  products,
  title,
  onEditProduct,
  onDeleteProduct,
  onToggleProductVisibility,
  onReorderProducts,
}: {
  categoryId: TProduct["categoryId"]
  currentPageHref: string
  mode: StorefrontMode
  products: Array<TProduct>
  title?: string
  onEditProduct?: (product: TProduct) => void
  onDeleteProduct?: (product: TProduct) => void
  onToggleProductVisibility?: (product: TProduct) => void
  onReorderProducts?: (
    categoryId: TProduct["categoryId"],
    orderedProductIds: Array<TProduct["_id"]>
  ) => void
}) {
  return (
    <section>
      {title && (
        <h2 className="mb-5 text-2xl font-black tracking-normal uppercase">
          {title}
        </h2>
      )}
      <ProductGrid
        categoryId={categoryId}
        currentPageHref={currentPageHref}
        mode={mode}
        products={products}
        onEditProduct={onEditProduct}
        onDeleteProduct={onDeleteProduct}
        onToggleProductVisibility={onToggleProductVisibility}
        onReorderProducts={onReorderProducts}
      />
    </section>
  )
}

function ProductGrid<TProduct extends StorefrontProduct>({
  categoryId,
  currentPageHref,
  mode,
  products,
  onEditProduct,
  onDeleteProduct,
  onToggleProductVisibility,
  onReorderProducts,
}: {
  categoryId: TProduct["categoryId"]
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
  const customerState = useCustomerState()

  return (
    <div className="grid gap-x-2 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
      {products.map((product, index) => (
        <ProductCard
          key={product._id}
          product={product}
          currentPageHref={currentPageHref}
          mode={mode}
          customerState={customerState}
          className="group min-w-0 border border-transparent pb-3 transition focus-within:border-[#111] hover:border-[#111]"
          onEditProduct={onEditProduct}
          onDeleteProduct={onDeleteProduct}
          onToggleProductVisibility={onToggleProductVisibility}
          canMovePrevious={index > 0}
          canMoveNext={index < products.length - 1}
          onMovePrevious={
            onReorderProducts
              ? () =>
                  onReorderProducts(
                    categoryId,
                    moveByOffset(products, index, -1).map((item) => item._id)
                  )
              : undefined
          }
          onMoveNext={
            onReorderProducts
              ? () =>
                  onReorderProducts(
                    categoryId,
                    moveByOffset(products, index, 1).map((item) => item._id)
                  )
              : undefined
          }
        />
      ))}
    </div>
  )
}

function CategoryProductSections<
  TCategory extends StorefrontCategory,
  TProduct extends StorefrontProduct<CustomerProductId, TCategory["_id"]>,
>({
  mode,
  currentPageHref,
  sections,
  onEditCategory,
  onDeleteCategory,
  onToggleCategoryVisibility,
  onEditProduct,
  onDeleteProduct,
  onToggleProductVisibility,
  onReorderCategories,
  onReorderProducts,
  hideEmptySections = false,
}: {
  mode: StorefrontMode
  currentPageHref: string
  sections: Array<{
    category: TCategory
    products: Array<TProduct>
  }>
  onEditCategory?: (category: TCategory) => void
  onDeleteCategory?: (category: TCategory) => void
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
}) {
  const isAdmin = mode === "admin"
  const visibleSections =
    hideEmptySections && !isAdmin
      ? sections.filter((section) => section.products.length > 0)
      : sections

  return (
    <div className="space-y-12">
      {visibleSections.map(({ category, products }, index) => (
        <section key={category._id}>
          <div
            className={cn(
              "group/section relative mb-5 flex min-w-0 items-center justify-end gap-4",
              isAdmin && "pr-10 sm:pr-48"
            )}
          >
            <Link
              to={categoryHref(category, mode)}
              className="inline-flex max-w-full min-w-0 items-center gap-3 border-b-4 border-transparent pb-1 text-right transition outline-none hover:border-current focus-visible:border-current focus-visible:ring-2 focus-visible:ring-[#111]/30"
            >
              <h2 className="truncate font-oswald text-4xl leading-none font-black tracking-tight uppercase sm:text-5xl">
                {category.name}
              </h2>
              <ArrowRightIcon className="size-7 shrink-0" />
            </Link>
            {isAdmin && (
              <CategorySectionAdminControls
                category={category}
                onEditCategory={onEditCategory}
                onDeleteCategory={onDeleteCategory}
                onToggleCategoryVisibility={onToggleCategoryVisibility}
                canMovePrevious={index > 0}
                canMoveNext={index < visibleSections.length - 1}
                onMovePrevious={
                  onReorderCategories
                    ? () =>
                        onReorderCategories(
                          moveByOffset(
                            visibleSections.map((section) => section.category),
                            index,
                            -1
                          ).map((item) => item._id)
                        )
                    : undefined
                }
                onMoveNext={
                  onReorderCategories
                    ? () =>
                        onReorderCategories(
                          moveByOffset(
                            visibleSections.map((section) => section.category),
                            index,
                            1
                          ).map((item) => item._id)
                        )
                    : undefined
                }
              />
            )}
          </div>

          {products.length > 0 ? (
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
                Aucun produit
              </div>
            )
          )}
        </section>
      ))}
    </div>
  )
}

function CategorySectionAdminControls<TCategory extends StorefrontCategory>({
  category,
  onEditCategory,
  onDeleteCategory,
  onToggleCategoryVisibility,
  canMovePrevious,
  canMoveNext,
  onMovePrevious,
  onMoveNext,
}: {
  category: TCategory
  onEditCategory?: (category: TCategory) => void
  onDeleteCategory?: (category: TCategory) => void
  onToggleCategoryVisibility?: (category: TCategory) => void
  canMovePrevious: boolean
  canMoveNext: boolean
  onMovePrevious?: () => void
  onMoveNext?: () => void
}) {
  const showOrderControls = onMovePrevious || onMoveNext

  return (
    <>
      {onToggleCategoryVisibility && (
        <CategoryVisibilityIconButton
          category={category}
          className="group-focus-within/section:pointer-events-auto group-focus-within/section:opacity-100 group-hover/section:pointer-events-auto group-hover/section:opacity-100"
          onToggleCategoryVisibility={onToggleCategoryVisibility}
        />
      )}
      <div
        className={cn(
          "pointer-events-none absolute top-0 flex items-center gap-1 opacity-0 transition group-focus-within/section:pointer-events-auto group-focus-within/section:opacity-100 group-hover/section:pointer-events-auto group-hover/section:opacity-100",
          onToggleCategoryVisibility ? "right-10" : "right-0"
        )}
      >
        {showOrderControls && (
          <>
            <AdminOrderIconButton
              direction="up"
              label="Move category up"
              disabled={!canMovePrevious}
              onClick={onMovePrevious}
            />
            <AdminOrderIconButton
              direction="down"
              label="Move category down"
              disabled={!canMoveNext}
              onClick={onMoveNext}
            />
          </>
        )}
        <CardIconButton
          title="Edit category"
          variant="outline"
          onClick={() => onEditCategory?.(category)}
        >
          <PencilIcon />
        </CardIconButton>
        <CardIconButton
          title="Delete category"
          variant="destructive"
          onClick={() => onDeleteCategory?.(category)}
        >
          <Trash2Icon />
        </CardIconButton>
      </div>
    </>
  )
}

function CategoryLane<TCategory extends StorefrontCategory>({
  mode,
  categories,
  onEditCategory,
  onDeleteCategory,
  onToggleCategoryVisibility,
  onReorderCategories,
}: {
  mode: StorefrontMode
  categories: Array<TCategory>
  onEditCategory?: (category: TCategory) => void
  onDeleteCategory?: (category: TCategory) => void
  onToggleCategoryVisibility?: (category: TCategory) => void
  onReorderCategories?: (orderedCategoryIds: Array<TCategory["_id"]>) => void
}) {
  const isAdmin = mode === "admin"

  return (
    <div className="grid gap-x-2 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
      {categories.map((category, index) => (
        <article
          key={category._id}
          className="group relative min-w-0 outline-none"
        >
          <Link to={categoryHref(category, mode)} className="block">
            <div className="flex aspect-[4/5] items-end bg-[#ededed] p-5 transition group-hover:bg-[#e3e3e3]">
              <div>
                <h2 className="font-oswald text-3xl leading-none font-black tracking-tight uppercase">
                  {category.name}
                </h2>
              </div>
              <ArrowRightIcon className="absolute right-5 bottom-5 size-5 transition group-hover:translate-x-1" />
            </div>
          </Link>
          {isAdmin && onToggleCategoryVisibility && (
            <CategoryVisibilityIconButton
              category={category}
              className="group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100"
              onToggleCategoryVisibility={onToggleCategoryVisibility}
            />
          )}
          {isAdmin && (
            <CardAdminOverlay>
              {onReorderCategories && (
                <>
                  <AdminOrderIconButton
                    direction="left"
                    label="Move category left"
                    disabled={index === 0}
                    onClick={() =>
                      onReorderCategories(
                        moveByOffset(categories, index, -1).map(
                          (item) => item._id
                        )
                      )
                    }
                  />
                  <AdminOrderIconButton
                    direction="right"
                    label="Move category right"
                    disabled={index === categories.length - 1}
                    onClick={() =>
                      onReorderCategories(
                        moveByOffset(categories, index, 1).map(
                          (item) => item._id
                        )
                      )
                    }
                  />
                </>
              )}
              <CardIconButton
                title="Edit category"
                variant="outline"
                onClick={() => onEditCategory?.(category)}
              >
                <PencilIcon />
              </CardIconButton>
              <CardIconButton
                title="Delete category"
                variant="destructive"
                onClick={() => onDeleteCategory?.(category)}
              >
                <Trash2Icon />
              </CardIconButton>
            </CardAdminOverlay>
          )}
        </article>
      ))}
    </div>
  )
}

function ProductLane<TProduct extends StorefrontProduct>({
  categoryId,
  currentPageHref,
  mode,
  products,
  onEditProduct,
  onDeleteProduct,
  onToggleProductVisibility,
  onReorderProducts,
}: {
  categoryId: TProduct["categoryId"]
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
  const customerState = useCustomerState()

  return (
    <Carousel opts={PRODUCT_LANE_CAROUSEL_OPTS} className="relative">
      <CarouselContent className="-ml-2 md:-ml-3">
        {products.map((product, index) => (
          <CarouselItem
            key={product._id}
            className="basis-[78%] pl-2 sm:basis-[44%] md:basis-[31.5%] md:pl-3 lg:basis-[23.5%]"
          >
            <ProductCard
              product={product}
              currentPageHref={currentPageHref}
              mode={mode}
              customerState={customerState}
              className="group h-full border border-transparent pb-3 transition focus-within:border-[#111] hover:border-[#111]"
              onEditProduct={onEditProduct}
              onDeleteProduct={onDeleteProduct}
              onToggleProductVisibility={onToggleProductVisibility}
              canMovePrevious={index > 0}
              canMoveNext={index < products.length - 1}
              onMovePrevious={
                onReorderProducts
                  ? () =>
                      onReorderProducts(
                        categoryId,
                        moveByOffset(products, index, -1).map(
                          (item) => item._id
                        )
                      )
                  : undefined
              }
              onMoveNext={
                onReorderProducts
                  ? () =>
                      onReorderProducts(
                        categoryId,
                        moveByOffset(products, index, 1).map((item) => item._id)
                      )
                  : undefined
              }
            />
          </CarouselItem>
        ))}
      </CarouselContent>
      <ProductCarouselScrollbar />
      <ProductCarouselArrow direction="previous" />
      <ProductCarouselArrow direction="next" />
    </Carousel>
  )
}

function ProductCarouselScrollbar() {
  const { api } = useCarousel()
  const trackRef = useRef<HTMLDivElement | null>(null)
  const thumbRef = useRef<HTMLDivElement | null>(null)
  const thumbWidthRef = useRef(100)
  const [scrollbarState, setScrollbarState] = useState({
    isScrollable: false,
    thumbWidth: 100,
  })

  const updateThumbPosition = useCallback(() => {
    const track = trackRef.current
    const thumb = thumbRef.current

    if (!api || !track || !thumb) {
      return
    }

    const progress = clampCarouselProgress(api.scrollProgress())
    const thumbWidthPx = (track.clientWidth * thumbWidthRef.current) / 100
    const travelPx = Math.max(track.clientWidth - thumbWidthPx, 0)

    thumb.style.transform = `translate3d(${progress * travelPx}px, 0, 0)`
  }, [api])

  const syncScrollbarMetrics = useCallback(() => {
    if (!api) {
      return
    }

    const scrollSnapCount = api.scrollSnapList().length
    const thumbWidth = Math.max(18, 100 / Math.max(scrollSnapCount, 1))
    const isScrollable =
      scrollSnapCount > 1 || api.canScrollPrev() || api.canScrollNext()

    thumbWidthRef.current = thumbWidth
    setScrollbarState((current) =>
      current.isScrollable === isScrollable && current.thumbWidth === thumbWidth
        ? current
        : { isScrollable, thumbWidth }
    )
  }, [api])
  const updateThumbPositionRef = useRef(updateThumbPosition)
  const syncScrollbarMetricsRef = useRef(syncScrollbarMetrics)

  useEffect(() => {
    updateThumbPositionRef.current = updateThumbPosition
    syncScrollbarMetricsRef.current = syncScrollbarMetrics
  }, [syncScrollbarMetrics, updateThumbPosition])

  useEffect(() => {
    if (!api) {
      return undefined
    }

    const handleMetricsChange = () => {
      syncScrollbarMetricsRef.current()
    }
    const handlePositionChange = () => {
      updateThumbPositionRef.current()
    }

    handleMetricsChange()
    handlePositionChange()
    api.on("reInit", handleMetricsChange)
    api.on("scroll", handlePositionChange)
    api.on("select", handlePositionChange)

    return () => {
      api.off("reInit", handleMetricsChange)
      api.off("scroll", handlePositionChange)
      api.off("select", handlePositionChange)
    }
  }, [api])

  useEffect(() => {
    updateThumbPosition()
  }, [
    scrollbarState.isScrollable,
    scrollbarState.thumbWidth,
    updateThumbPosition,
  ])

  if (!scrollbarState.isScrollable) {
    return null
  }

  return (
    <div
      aria-hidden="true"
      className="mt-4 h-1.5 bg-[#e5e5e5]"
      data-slot="carousel-scrollbar"
    >
      <div
        ref={trackRef}
        className="relative h-full overflow-hidden bg-[#e5e5e5]"
        data-slot="carousel-scrollbar-track"
      >
        <div
          ref={thumbRef}
          className="absolute top-0 left-0 h-full bg-[#111] will-change-transform"
          data-slot="carousel-scrollbar-thumb"
          style={{
            width: `${scrollbarState.thumbWidth}%`,
          }}
        />
      </div>
    </div>
  )
}

function clampCarouselProgress(value: number) {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.min(Math.max(value, 0), 1)
}

function ProductCard<TProduct extends StorefrontProduct>({
  product,
  currentPageHref,
  mode,
  customerState,
  className,
  onEditProduct,
  onDeleteProduct,
  onToggleProductVisibility,
  canMovePrevious,
  canMoveNext,
  onMovePrevious,
  onMoveNext,
}: {
  product: TProduct
  currentPageHref: string
  mode: StorefrontMode
  customerState: ReturnType<typeof useCustomerState>
  className?: string
  onEditProduct?: (product: TProduct) => void
  onDeleteProduct?: (product: TProduct) => void
  onToggleProductVisibility?: (product: TProduct) => void
  canMovePrevious?: boolean
  canMoveNext?: boolean
  onMovePrevious?: () => void
  onMoveNext?: () => void
}) {
  const productSnapshot = customerProductSnapshot(product)
  const isFavorite = customerState.isWishlistProduct(productSnapshot.productId)

  return (
    <article className={className}>
      <ProductMedia
        product={product}
        mode={mode}
        backHref={currentPageHref}
        isFavorite={isFavorite}
        onToggleFavorite={() => {
          void customerState
            .toggleWishlist(productSnapshot)
            .catch(() => undefined)
        }}
        onEditProduct={onEditProduct}
        onDeleteProduct={onDeleteProduct}
        onToggleProductVisibility={onToggleProductVisibility}
        canMovePrevious={canMovePrevious}
        canMoveNext={canMoveNext}
        onMovePrevious={onMovePrevious}
        onMoveNext={onMoveNext}
      />
      <div className="mt-3 flex items-start justify-between gap-3 px-2">
        <h3 className="line-clamp-2 min-w-0 flex-1 font-oswald text-lg leading-5 font-semibold tracking-tight uppercase">
          {product.name}
        </h3>
        <div className="shrink-0 font-oswald text-sm font-medium">
          {formatPrice(product.basePriceCents, product.currency)}
        </div>
      </div>
    </article>
  )
}

function ProductCarouselArrow({
  direction,
}: {
  direction: "previous" | "next"
}) {
  const { canScrollNext, canScrollPrev, scrollNext, scrollPrev } = useCarousel()
  const isNext = direction === "next"
  const canScroll = isNext ? canScrollNext : canScrollPrev

  if (!canScroll) {
    return null
  }

  return (
    <button
      type="button"
      aria-label={isNext ? "Show next products" : "Show previous products"}
      className={cn(
        "absolute top-[42%] z-20 flex size-12 -translate-y-1/2 items-center justify-center border border-[#111] bg-white text-[#111] transition hover:bg-[#111] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111]",
        isNext ? "right-3" : "left-3"
      )}
      onClick={isNext ? scrollNext : scrollPrev}
    >
      {isNext ? (
        <ArrowRightIcon className="size-5" />
      ) : (
        <ArrowLeftIcon className="size-5" />
      )}
    </button>
  )
}

function customerProductSnapshot(
  product: StorefrontProduct
): CustomerProductSnapshot {
  return {
    productId: product._id,
    name: product.name,
    slug: product.slug ?? product._id,
    imageUrl: product.imageUrl,
    basePriceCents: product.basePriceCents,
    currency: product.currency,
  }
}

function ProductMedia<TProduct extends StorefrontProduct>({
  product,
  mode,
  backHref,
  isFavorite,
  onToggleFavorite,
  onEditProduct,
  onDeleteProduct,
  onToggleProductVisibility,
  canMovePrevious,
  canMoveNext,
  onMovePrevious,
  onMoveNext,
}: {
  product: TProduct
  mode: StorefrontMode
  backHref: string
  isFavorite: boolean
  onToggleFavorite: () => void
  onEditProduct?: (product: TProduct) => void
  onDeleteProduct?: (product: TProduct) => void
  onToggleProductVisibility?: (product: TProduct) => void
  canMovePrevious?: boolean
  canMoveNext?: boolean
  onMovePrevious?: () => void
  onMoveNext?: () => void
}) {
  const mediaContent = (
    <>
      {product.imageUrl ? (
        <img
          src={product.imageUrl}
          alt={product.name}
          className="size-full object-contain transition duration-300 hover:scale-[1.03]"
        />
      ) : (
        <div className="flex size-full items-center justify-center px-6 text-center text-sm font-semibold text-[#777]">
          Image produit
        </div>
      )}
    </>
  )

  if (mode === "admin") {
    return (
      <div className="relative aspect-square overflow-hidden bg-[#eceff1]">
        {product.slug ? (
          <Link
            to="/admin/products/$slug"
            params={{ slug: product.slug }}
            search={catalogBackHrefSearch(backHref)}
            className="block size-full"
          >
            {mediaContent}
          </Link>
        ) : (
          mediaContent
        )}
        {onToggleProductVisibility && (
          <ProductVisibilityIconButton
            product={product}
            className="top-2 right-auto left-2"
            onToggleProductVisibility={onToggleProductVisibility}
          />
        )}
        <ProductImageAdminControls
          product={product}
          onEditProduct={onEditProduct}
          onDeleteProduct={onDeleteProduct}
          canMovePrevious={canMovePrevious}
          canMoveNext={canMoveNext}
          onMovePrevious={onMovePrevious}
          onMoveNext={onMoveNext}
        />
      </div>
    )
  }

  return (
    <div className="relative aspect-square overflow-hidden bg-[#eceff1]">
      {product.slug ? (
        <Link
          to="/products/$slug"
          params={{ slug: product.slug }}
          search={catalogBackHrefSearch(backHref)}
          className="block size-full"
        >
          {mediaContent}
        </Link>
      ) : (
        mediaContent
      )}
      <WishlistHeartButton
        isFavorite={isFavorite}
        favoriteLabel="Remove from favorites"
        unfavoriteLabel="Add to favorites"
        className="absolute top-3 right-3 z-10 size-6 border-0 bg-transparent p-0 hover:bg-transparent focus-visible:ring-2"
        iconClassName="size-5"
        onClick={(event) => {
          event.stopPropagation()
          onToggleFavorite()
        }}
      />
    </div>
  )
}

function ProductImageAdminControls<TProduct extends StorefrontProduct>({
  product,
  onEditProduct,
  onDeleteProduct,
  canMovePrevious,
  canMoveNext,
  onMovePrevious,
  onMoveNext,
}: {
  product: TProduct
  onEditProduct?: (product: TProduct) => void
  onDeleteProduct?: (product: TProduct) => void
  canMovePrevious?: boolean
  canMoveNext?: boolean
  onMovePrevious?: () => void
  onMoveNext?: () => void
}) {
  const showOrderControls = onMovePrevious || onMoveNext

  return (
    <>
      {onDeleteProduct && (
        <div className="pointer-events-none absolute top-2 right-2 z-10 opacity-0 transition group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100">
          <CardIconButton
            title="Delete product"
            variant="destructive"
            onClick={() => onDeleteProduct(product)}
          >
            <Trash2Icon />
          </CardIconButton>
        </div>
      )}
      {onEditProduct && (
        <div className="pointer-events-none absolute bottom-2 left-2 z-10 opacity-0 transition group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100">
          <CardIconButton
            title="Edit product"
            variant="outline"
            onClick={() => onEditProduct(product)}
          >
            <PencilIcon />
          </CardIconButton>
        </div>
      )}
      {showOrderControls && (
        <div className="pointer-events-none absolute right-2 bottom-2 z-10 flex items-center gap-1 opacity-0 transition group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100">
          <AdminOrderIconButton
            direction="left"
            label="Move product left"
            disabled={!canMovePrevious}
            onClick={onMovePrevious}
          />
          <AdminOrderIconButton
            direction="right"
            label="Move product right"
            disabled={!canMoveNext}
            onClick={onMoveNext}
          />
        </div>
      )}
    </>
  )
}

function AdminOrderIconButton({
  direction,
  label,
  disabled,
  onClick,
}: {
  direction: "up" | "down" | "left" | "right"
  label: string
  disabled: boolean
  onClick?: () => void
}) {
  const Icon =
    direction === "up"
      ? ArrowUpIcon
      : direction === "down"
        ? ArrowDownIcon
        : direction === "left"
          ? ArrowLeftIcon
          : ArrowRightIcon

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      title={label}
      aria-label={label}
      disabled={disabled || !onClick}
      className="rounded-none bg-white shadow-sm hover:bg-[#f1f1f1]"
      onClick={(event) => {
        event.stopPropagation()
        onClick?.()
      }}
    >
      <Icon />
    </Button>
  )
}

function ProductVisibilityIconButton<TProduct extends StorefrontProduct>({
  product,
  className,
  onToggleProductVisibility,
}: {
  product: TProduct
  className?: string
  onToggleProductVisibility: (product: TProduct) => void
}) {
  const isVisible = product.status === "published"
  const title = isVisible ? "Hide product" : "Publish product"

  return (
    <VisibilityIconButton
      isVisible={isVisible}
      title={title}
      className={cn(
        "group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100",
        className
      )}
      onClick={() => onToggleProductVisibility(product)}
    />
  )
}

function CategoryVisibilityIconButton<TCategory extends StorefrontCategory>({
  category,
  className,
  onToggleCategoryVisibility,
}: {
  category: TCategory
  className?: string
  onToggleCategoryVisibility: (category: TCategory) => void
}) {
  const isVisible = category.isActive ?? true
  const title = isVisible ? "Hide category" : "Show category"

  return (
    <VisibilityIconButton
      isVisible={isVisible}
      title={title}
      className={className}
      onClick={() => onToggleCategoryVisibility(category)}
    />
  )
}

function VisibilityIconButton({
  isVisible,
  title,
  className,
  onClick,
}: {
  isVisible: boolean
  title: string
  className?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      className={cn(
        "pointer-events-none absolute top-0 right-0 z-10 flex size-9 items-center justify-center bg-white/85 text-[#111] opacity-0 shadow-sm transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111]",
        isVisible && "bg-[#111] text-white hover:bg-[#222]",
        className
      )}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
    >
      {isVisible ? (
        <EyeIcon className="size-5" />
      ) : (
        <EyeOffIcon className="size-5" />
      )}
    </button>
  )
}

function sortProducts<TProduct extends StorefrontProduct>(
  products: Array<TProduct>
) {
  return Array.from(products).toSorted((first, second) => {
    const firstOrder = first.sortOrder ?? Number.MAX_SAFE_INTEGER
    const secondOrder = second.sortOrder ?? Number.MAX_SAFE_INTEGER

    if (firstOrder !== secondOrder) {
      return firstOrder - secondOrder
    }

    return first.name.localeCompare(second.name)
  })
}

function buildCategoryProductSections<
  TCategory extends StorefrontCategory,
  TProduct extends StorefrontProduct<CustomerProductId, TCategory["_id"]>,
>({
  categories,
  products,
  sectionCategories,
}: {
  categories: Array<TCategory>
  products: Array<TProduct>
  sectionCategories: Array<TCategory>
}) {
  const childrenByParentId = new Map<
    TCategory["_id"] | null,
    Array<TCategory>
  >()
  const productsByCategoryId = new Map<TCategory["_id"], Array<TProduct>>()
  const orderedProductsByCategoryId = new Map<
    TCategory["_id"],
    Array<TProduct>
  >()

  for (const category of categories) {
    const siblings = childrenByParentId.get(category.parentId) ?? []
    siblings.push(category)
    childrenByParentId.set(category.parentId, siblings)
  }

  for (const product of products) {
    const categoryProducts = productsByCategoryId.get(product.categoryId) ?? []
    categoryProducts.push(product)
    productsByCategoryId.set(product.categoryId, categoryProducts)
  }

  for (const [categoryId, categoryProducts] of productsByCategoryId) {
    productsByCategoryId.set(categoryId, sortProducts(categoryProducts))
  }

  function childCategories(categoryId: TCategory["_id"]) {
    return sortBySortOrder(childrenByParentId.get(categoryId) ?? [])
  }

  function orderedProductsForCategory(category: TCategory): Array<TProduct> {
    const cachedProducts = orderedProductsByCategoryId.get(category._id)

    if (cachedProducts) {
      return cachedProducts
    }

    const directProducts = productsByCategoryId.get(category._id) ?? []
    const childProductGroups = childCategories(category._id).flatMap(
      (child) => {
        const childProducts = orderedProductsForCategory(child)

        return childProducts.length > 0 ? [{ products: childProducts }] : []
      }
    )

    if (childProductGroups.length === 0) {
      orderedProductsByCategoryId.set(category._id, directProducts)

      return directProducts
    }

    const productGroups =
      directProducts.length > 0
        ? [{ products: directProducts }, ...childProductGroups]
        : childProductGroups
    const orderedProducts = prioritizeCategoryProductGroups(productGroups)

    orderedProductsByCategoryId.set(category._id, orderedProducts)

    return orderedProducts
  }

  return sectionCategories.map((category) => ({
    category,
    products: orderedProductsForCategory(category),
  }))
}

function prioritizeCategoryProductGroups<TProduct>(
  groups: Array<{ products: Array<TProduct> }>
) {
  const priorityCounts = categoryProductPriorityCounts(groups)

  return [
    ...groups.flatMap((group, index) =>
      group.products.slice(0, priorityCounts[index] ?? 0)
    ),
    ...groups.flatMap((group, index) =>
      group.products.slice(priorityCounts[index] ?? 0)
    ),
  ]
}

function categoryProductPriorityCounts(
  groups: Array<{ products: { length: number } }>
) {
  const counts = groups.map(() => 0)
  let remainingPriorityProducts = Math.min(
    CATEGORY_CAROUSEL_PRIORITY_VISIBLE_PRODUCT_COUNT,
    groups.reduce((total, group) => total + group.products.length, 0)
  )

  while (remainingPriorityProducts > 0) {
    let allocatedInPass = false

    for (const [index, group] of groups.entries()) {
      const currentCount = counts[index] ?? 0

      if (
        remainingPriorityProducts > 0 &&
        currentCount < group.products.length
      ) {
        counts[index] = currentCount + 1
        remainingPriorityProducts -= 1
        allocatedInPass = true
      }
    }

    if (!allocatedInPass) {
      break
    }
  }

  return counts
}

function StorefrontSkeleton() {
  return (
    <div className="grid gap-x-2 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
      {[0, 1, 2, 3].map((item) => (
        <div key={item}>
          <div className="aspect-square animate-pulse bg-[#eceff1]" />
          <div className="mt-3 h-4 w-24 animate-pulse bg-[#eceff1]" />
          <div className="mt-2 h-4 w-40 animate-pulse bg-[#eceff1]" />
        </div>
      ))}
    </div>
  )
}

function EmptyShelf({ isCategoryPage }: { isCategoryPage: boolean }) {
  return (
    <div className="border border-[#d9d9d9] bg-[#f5f5f5] p-10 text-center">
      <h2 className="text-2xl font-black tracking-normal uppercase">
        {isCategoryPage
          ? "Aucun produit ou sous-catégorie pour le moment"
          : "Aucune catégorie pour le moment"}
      </h2>
    </div>
  )
}
