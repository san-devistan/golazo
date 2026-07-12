import { OneLineScroll } from "@/components/one-line-scroll"
import { ShopFooter } from "@/components/shop-footer"
import { ShopHeader } from "@/components/shop-header"
import { ShopHierarchyNav } from "@/components/shop-hierarchy-nav"
import {
  SHOP_UNDERLINE_LINK_CLASS_NAME,
  ShopUnderlineText,
} from "@/components/shop-underline-text"
import { WishlistHeartButton } from "@/components/wishlist-heart-button"
import { catalogBackHrefSearch } from "@/lib/catalog-back-state"
import {
  catalogProductsHref,
  catalogRootHref,
  categoryHref,
} from "@/lib/catalog-navigation"
import {
  type CustomerProductSnapshot,
  type ProductId as CustomerProductId,
  useCustomerState,
} from "@/lib/customer-state"
import { useMoneyFormatter } from "@/lib/preferences"
import { sortBySortOrder } from "@/lib/shop"
import { Link } from "@tanstack/react-router"
import { Button } from "@workspace/ui/components/button"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  useCarousel,
} from "@workspace/ui/components/carousel"
import { cn } from "@workspace/ui/lib/utils"
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  EyeIcon,
  EyeOffIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  XIcon,
} from "lucide-react"
import {
  type ReactNode,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

export type StorefrontMode = "admin" | "public"

export type StorefrontCategory<CategoryId extends string = string> = {
  _id: CategoryId
  name: string
  kind?: "collection" | "group"
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
  imageUrls?: Array<string>
  sortOrder?: number
  status?: string
}

export type ProductCardTextDensity = "default" | "compact"
export type ProductCardMediaChrome = "full" | "minimal"

const PRODUCT_CARD_TEXT_CLASSES = {
  default: {
    body: "grid grid-cols-[minmax(0,1fr)_max-content] items-center gap-x-3 gap-y-2 px-2 py-3",
    name: "line-clamp-2 min-w-0 font-oswald text-[0.95rem] leading-[1.1] font-bold tracking-normal uppercase",
    price:
      "shrink-0 font-oswald text-sm leading-none font-medium tracking-normal",
  },
  compact: {
    body: "grid grid-cols-[minmax(0,1fr)_max-content] items-center gap-x-2 gap-y-1.5 px-1.5 py-2",
    name: "line-clamp-2 min-w-0 font-oswald text-[0.8125rem] leading-[1.08] font-semibold tracking-normal uppercase",
    price:
      "shrink-0 font-oswald text-xs leading-none font-medium tracking-normal",
  },
} satisfies Record<
  ProductCardTextDensity,
  { body: string; name: string; price: string }
>

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
const GOLAZO_HERO_PRODUCTS_LIMIT = 24
const GOLAZO_HERO_MARQUEE_PASSES = ["primary", "duplicate"] as const

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
      type: "homeCatalog"
      sections: Array<HomeCatalogSection<TCategory, TProduct>>
      hideEmptyCollections: boolean
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

type HomeCatalogSection<
  TCategory extends StorefrontCategory,
  TProduct extends StorefrontProduct<CustomerProductId, TCategory["_id"]>,
> =
  | {
      type: "collection"
      collection: TCategory
      products: Array<TProduct>
    }
  | {
      type: "group"
      group: TCategory
      collections: Array<CollectionProducts<TCategory, TProduct>>
    }

type CollectionProducts<
  TCategory extends StorefrontCategory,
  TProduct extends StorefrontProduct<CustomerProductId, TCategory["_id"]>,
> = {
  collection: TCategory
  products: Array<TProduct>
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

function GolazoHomeHero({
  currentPageHref,
  mode,
  products,
}: {
  currentPageHref: string
  mode: StorefrontMode
  products: Array<StorefrontProduct>
}) {
  const formatPrice = useMoneyFormatter()
  const marqueeDurationSeconds = Math.max(products.length * 4, 20)
  const marqueeStyle = useMemo(
    () => ({ animationDuration: `${marqueeDurationSeconds}s` }),
    [marqueeDurationSeconds]
  )

  return (
    <section className="overflow-hidden py-14">
      <div className="mx-auto max-w-[1536px] px-4 sm:px-6 lg:px-10">
        <p className="mb-3 text-xs tracking-[0.18em] text-black/55 uppercase">
          2026 World Cup Collection
        </p>
        <h1 className="font-oswald text-6xl leading-[0.85] font-bold tracking-normal uppercase sm:text-7xl lg:text-8xl xl:text-[7rem]">
          World Cup 26
        </h1>
        <div className="mt-6 flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <p className="max-w-[44ch] text-lg leading-7 text-black/55">
            Every national kit for 2026: engineered for the pitch, built for the
            streets.
          </p>
          <Link
            to={catalogProductsHref(mode)}
            className={SHOP_UNDERLINE_LINK_CLASS_NAME}
          >
            <ShopUnderlineText variant="action">See all</ShopUnderlineText>
          </Link>
        </div>
      </div>

      {products.length > 0 && (
        <div
          className="mt-10 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]"
          aria-label="World Cup 26 jerseys"
        >
          <div
            className="flex w-max motion-safe:[animation-iteration-count:infinite] motion-safe:[animation-name:golazo-marquee] motion-safe:[animation-timing-function:linear] motion-reduce:[animation:none] motion-reduce:overflow-x-auto"
            style={marqueeStyle}
          >
            {GOLAZO_HERO_MARQUEE_PASSES.map((pass) =>
              products.map((product) => (
                <GolazoHeroProductCard
                  key={`${pass}-${product._id}`}
                  product={product}
                  currentPageHref={currentPageHref}
                  duplicate={pass === "duplicate"}
                  formatPrice={formatPrice}
                />
              ))
            )}
          </div>
        </div>
      )}
    </section>
  )
}

function GolazoHeroProductCard({
  currentPageHref,
  duplicate,
  formatPrice,
  product,
}: {
  currentPageHref: string
  duplicate: boolean
  formatPrice: (amountCents: number, sourceCurrency?: string) => string
  product: StorefrontProduct
}) {
  const productParams = useMemo(
    () => ({ slug: product.slug ?? "" }),
    [product.slug]
  )
  const content = (
    <span className="relative block aspect-[3/4] overflow-hidden bg-[#edf0f2]">
      {product.imageUrl ? (
        <img
          src={product.imageUrl}
          alt={duplicate ? "" : product.name}
          loading={duplicate ? "lazy" : "eager"}
          className="size-full object-cover object-top transition duration-500 group-hover:scale-[1.05]"
        />
      ) : (
        <span className="flex size-full items-center justify-center px-5 text-center text-sm font-semibold text-black/45">
          Image produit
        </span>
      )}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-black/65 to-transparent"
      />
      <span className="absolute inset-x-0 bottom-0 z-10 flex items-baseline justify-between gap-3 p-4 text-white">
        <span className="min-w-0 font-oswald text-sm leading-none font-bold tracking-normal uppercase">
          {product.name}
        </span>
        <span className="shrink-0 text-sm">
          {formatPrice(product.basePriceCents, product.currency)}
        </span>
      </span>
    </span>
  )

  if (!product.slug) {
    return (
      <span
        className="group mr-4 w-[150px] shrink-0 text-current no-underline sm:w-[220px] lg:w-[280px]"
        aria-hidden={duplicate}
      >
        {content}
      </span>
    )
  }

  return (
    <Link
      to="/products/$slug"
      params={productParams}
      search={catalogBackHrefSearch(currentPageHref)}
      className="group mr-4 w-[150px] shrink-0 text-current no-underline outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#111] sm:w-[220px] lg:w-[280px]"
      aria-hidden={duplicate}
      tabIndex={duplicate ? -1 : undefined}
    >
      {content}
    </Link>
  )
}

function StorefrontMainContent<
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

function HomeCatalogContent<
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
      {products.length > 0 ? (
        <ProductOneLineScroll
          ariaLabel={`${collection.name} products`}
          currentPageHref={currentPageHref}
          mode={mode}
          products={products}
          onEditProduct={onEditProduct}
          onDeleteProduct={onDeleteProduct}
          onToggleProductVisibility={onToggleProductVisibility}
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
      <Link
        to={categoryHref(category, mode)}
        className={cn(
          SHOP_UNDERLINE_LINK_CLASS_NAME,
          isAdmin && isHidden && "opacity-40 grayscale"
        )}
      >
        <ShopUnderlineText>{category.name}</ShopUnderlineText>
      </Link>
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

function ProductOneLineScroll<TProduct extends StorefrontProduct>({
  ariaLabel,
  currentPageHref,
  mode,
  products,
  onEditProduct,
  onDeleteProduct,
  onToggleProductVisibility,
}: {
  ariaLabel: string
  currentPageHref: string
  mode: StorefrontMode
  products: Array<TProduct>
  onEditProduct?: (product: TProduct) => void
  onDeleteProduct?: (product: TProduct) => void
  onToggleProductVisibility?: (product: TProduct) => void
}) {
  const customerState = useCustomerState()

  return (
    <OneLineScroll
      ariaLabel={ariaLabel}
      contentClassName="gap-4"
      scrollDistance={PRODUCT_LANE_DESKTOP_SCROLL_SIZE * 280}
    >
      {products.map((product) => (
        <div
          key={product._id}
          className="w-[min(72vw,17.5rem)] shrink-0 sm:w-[16rem] lg:w-[17.5rem]"
        >
          <ProductCard
            product={product}
            currentPageHref={currentPageHref}
            mode={mode}
            customerState={customerState}
            className="group h-full outline-[1.5px] outline-transparent transition focus-within:outline-[#111] hover:outline-[#111]"
            onEditProduct={onEditProduct}
            onDeleteProduct={onDeleteProduct}
            onToggleProductVisibility={onToggleProductVisibility}
          />
        </div>
      ))}
    </OneLineScroll>
  )
}

function AdminEmptyCollectionState({ label }: { label: string }) {
  return (
    <div className="border border-dashed border-[#d9d9d9] bg-[#fafafa] px-4 py-6 text-sm font-semibold text-[#777]">
      {label}
    </div>
  )
}

function CategoryPageHeading<TCategory extends StorefrontCategory>({
  categories,
  currentCategory,
  kicker,
  mode,
  productSearch,
  showProductSearch,
  subtitle,
  title,
  onProductSearchChange,
}: {
  categories: Array<TCategory>
  currentCategory: TCategory
  kicker?: string
  mode: StorefrontMode
  productSearch: string
  showProductSearch: boolean
  subtitle?: string
  title: string
  onProductSearchChange: (value: string) => void
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:items-start">
      <div className="grid min-w-0 gap-4">
        <ShopHierarchyNav
          mode={mode}
          categories={categories}
          currentCategory={currentCategory}
          className="min-w-0"
        />
        {showProductSearch && (
          <CategoryProductSearch
            value={productSearch}
            onChange={onProductSearchChange}
          />
        )}
      </div>
      <div className="flex shrink-0 flex-col items-start gap-3 text-left lg:items-end lg:text-right">
        {kicker && (
          <p className="text-xs font-bold tracking-[0.18em] uppercase">
            {kicker}
          </p>
        )}
        <h1 className="font-oswald text-4xl leading-[0.92] font-bold tracking-normal uppercase sm:text-5xl">
          {title}
        </h1>
        {subtitle && (
          <p className="max-w-xl text-sm leading-6 text-[#555]">{subtitle}</p>
        )}
      </div>
    </div>
  )
}

function CategoryProductSearch({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const hasSearch = value.trim().length > 0
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onChange(event.target.value)
    },
    [onChange]
  )
  const handleClear = useCallback(() => {
    onChange("")
  }, [onChange])

  return (
    <div className="grid gap-2">
      <div className="relative">
        <label className="sr-only" htmlFor="collection-product-search">
          Search products
        </label>
        <input
          id="collection-product-search"
          type="text"
          value={value}
          placeholder="Search products"
          className="h-[42px] w-full border border-black/15 bg-white px-3.5 pr-11 text-sm outline-none placeholder:text-black/55 focus:border-[#111]"
          onChange={handleChange}
        />
        {hasSearch ? (
          <button
            type="button"
            aria-label="Clear product search"
            className="absolute inset-y-0 right-0 grid w-[42px] place-items-center text-black/55 transition hover:text-[#111] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#111]"
            onClick={handleClear}
          >
            <XIcon className="size-4" />
          </button>
        ) : (
          <SearchIcon
            aria-hidden="true"
            className="absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-black/55"
          />
        )}
      </div>
    </div>
  )
}

function StorefrontPageHeading({
  isAdmin,
  kicker,
  subtitle,
  title,
}: {
  isAdmin: boolean
  kicker?: string
  subtitle?: string
  title?: string
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

function ProductSection<TProduct extends StorefrontProduct>({
  categoryId,
  currentPageHref,
  className,
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
  className?: string
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
    <section className={className}>
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
    <div className="grid grid-cols-2 gap-x-6 gap-y-9 lg:grid-cols-4">
      {products.map((product, index) => (
        <ProductGridCard
          key={product._id}
          product={product}
          products={products}
          index={index}
          categoryId={categoryId}
          currentPageHref={currentPageHref}
          mode={mode}
          customerState={customerState}
          onEditProduct={onEditProduct}
          onDeleteProduct={onDeleteProduct}
          onToggleProductVisibility={onToggleProductVisibility}
          onReorderProducts={onReorderProducts}
        />
      ))}
    </div>
  )
}

function ProductGridCard<TProduct extends StorefrontProduct>({
  product,
  products,
  index,
  categoryId,
  currentPageHref,
  mode,
  customerState,
  onEditProduct,
  onDeleteProduct,
  onToggleProductVisibility,
  onReorderProducts,
}: {
  product: TProduct
  products: Array<TProduct>
  index: number
  categoryId: TProduct["categoryId"]
  currentPageHref: string
  mode: StorefrontMode
  customerState: ReturnType<typeof useCustomerState>
  onEditProduct?: (product: TProduct) => void
  onDeleteProduct?: (product: TProduct) => void
  onToggleProductVisibility?: (product: TProduct) => void
  onReorderProducts?: (
    categoryId: TProduct["categoryId"],
    orderedProductIds: Array<TProduct["_id"]>
  ) => void
}) {
  const handleMovePrevious = useCallback(() => {
    onReorderProducts?.(
      categoryId,
      moveByOffset(products, index, -1).map((item) => item._id)
    )
  }, [categoryId, index, onReorderProducts, products])
  const handleMoveNext = useCallback(() => {
    onReorderProducts?.(
      categoryId,
      moveByOffset(products, index, 1).map((item) => item._id)
    )
  }, [categoryId, index, onReorderProducts, products])

  return (
    <ProductCard
      product={product}
      currentPageHref={currentPageHref}
      mode={mode}
      customerState={customerState}
      className="group min-w-0 outline-[1.5px] outline-transparent transition focus-within:outline-[#111] hover:outline-[#111]"
      onEditProduct={onEditProduct}
      onDeleteProduct={onDeleteProduct}
      onToggleProductVisibility={onToggleProductVisibility}
      canMovePrevious={index > 0}
      canMoveNext={index < products.length - 1}
      onMovePrevious={onReorderProducts ? handleMovePrevious : undefined}
      onMoveNext={onReorderProducts ? handleMoveNext : undefined}
    />
  )
}

function CategoryProductSections<
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
        <Link
          to={categoryHref(category, mode)}
          className={cn(
            SHOP_UNDERLINE_LINK_CLASS_NAME,
            isAdmin && isHidden && "opacity-40 grayscale"
          )}
        >
          <ShopUnderlineText>{category.name}</ShopUnderlineText>
        </Link>
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
          currentPageHref={currentPageHref}
          mode={mode}
          products={products}
          onEditProduct={onEditProduct}
          onDeleteProduct={onDeleteProduct}
          onToggleProductVisibility={onToggleProductVisibility}
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

function CategorySectionAdminControls<TCategory extends StorefrontCategory>({
  category,
  onAddToCategory,
  onEditCategory,
  onToggleCategoryVisibility,
  canMovePrevious,
  canMoveNext,
  onMovePrevious,
  onMoveNext,
}: {
  category: TCategory
  onAddToCategory?: (category: TCategory) => void
  onEditCategory?: (category: TCategory) => void
  onToggleCategoryVisibility?: (category: TCategory) => void
  canMovePrevious: boolean
  canMoveNext: boolean
  onMovePrevious?: () => void
  onMoveNext?: () => void
}) {
  const showOrderControls = onMovePrevious || onMoveNext
  const nodeLabel = catalogNodeLabel(category)
  const handleEdit = useCallback(() => {
    onEditCategory?.(category)
  }, [category, onEditCategory])
  const handleAdd = useCallback(() => {
    onAddToCategory?.(category)
  }, [category, onAddToCategory])

  return (
    <div className="absolute top-0 right-0 flex items-center gap-1">
      {nodeLabel === "collection" && onAddToCategory && (
        <CategoryAddButton label="+ products" onClick={handleAdd} />
      )}
      {onEditCategory && (
        <CardIconButton
          title={`Edit ${nodeLabel}`}
          variant="outline"
          onClick={handleEdit}
        >
          <PencilIcon />
        </CardIconButton>
      )}
      {onToggleCategoryVisibility && (
        <CategoryLineVisibilityButton
          category={category}
          onToggleCategoryVisibility={onToggleCategoryVisibility}
        />
      )}
      {showOrderControls && (
        <>
          <AdminOrderIconButton
            direction="up"
            label={`Move ${nodeLabel} up`}
            disabled={!canMovePrevious}
            onClick={onMovePrevious}
          />
          <AdminOrderIconButton
            direction="down"
            label={`Move ${nodeLabel} down`}
            disabled={!canMoveNext}
            onClick={onMoveNext}
          />
        </>
      )}
    </div>
  )
}

function CategoryLane<TCategory extends StorefrontCategory>({
  mode,
  categories,
  onAddToCategory,
  onEditCategory,
  onToggleCategoryVisibility,
  onReorderCategories,
}: {
  mode: StorefrontMode
  categories: Array<TCategory>
  onAddToCategory?: (category: TCategory) => void
  onEditCategory?: (category: TCategory) => void
  onToggleCategoryVisibility?: (category: TCategory) => void
  onReorderCategories?: (orderedCategoryIds: Array<TCategory["_id"]>) => void
}) {
  const isAdmin = mode === "admin"

  return (
    <div className="grid gap-x-2 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
      {categories.map((category, index) => (
        <CategoryLaneCard
          key={category._id}
          category={category}
          categories={categories}
          index={index}
          isAdmin={isAdmin}
          mode={mode}
          onAddToCategory={onAddToCategory}
          onEditCategory={onEditCategory}
          onToggleCategoryVisibility={onToggleCategoryVisibility}
          onReorderCategories={onReorderCategories}
        />
      ))}
    </div>
  )
}

function CategoryLaneCard<TCategory extends StorefrontCategory>({
  category,
  categories,
  index,
  isAdmin,
  mode,
  onAddToCategory,
  onEditCategory,
  onToggleCategoryVisibility,
  onReorderCategories,
}: {
  category: TCategory
  categories: Array<TCategory>
  index: number
  isAdmin: boolean
  mode: StorefrontMode
  onAddToCategory?: (category: TCategory) => void
  onEditCategory?: (category: TCategory) => void
  onToggleCategoryVisibility?: (category: TCategory) => void
  onReorderCategories?: (orderedCategoryIds: Array<TCategory["_id"]>) => void
}) {
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
  const handleEdit = useCallback(() => {
    onEditCategory?.(category)
  }, [category, onEditCategory])
  const handleAdd = useCallback(() => {
    onAddToCategory?.(category)
  }, [category, onAddToCategory])
  const nodeLabel = catalogNodeLabel(category)
  const isHidden = isHiddenCategory(category)

  return (
    <article className="group relative min-w-0 outline-none">
      <Link to={categoryHref(category, mode)} className="block">
        <div
          className={cn(
            "flex aspect-[4/5] items-end bg-[#ededed] p-5 transition group-hover:bg-[#e3e3e3]",
            isAdmin && isHidden && "bg-[#d8d8d8] opacity-45 grayscale"
          )}
        >
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
                label={`Move ${nodeLabel} left`}
                disabled={index === 0}
                onClick={handleMovePrevious}
              />
              <AdminOrderIconButton
                direction="right"
                label={`Move ${nodeLabel} right`}
                disabled={index === categories.length - 1}
                onClick={handleMoveNext}
              />
            </>
          )}
          {onAddToCategory && (
            <CardIconButton
              title={`Add to ${nodeLabel}`}
              variant="outline"
              onClick={handleAdd}
            >
              <PlusIcon />
            </CardIconButton>
          )}
          <CardIconButton
            title={`Edit ${nodeLabel}`}
            variant="outline"
            onClick={handleEdit}
          >
            <PencilIcon />
          </CardIconButton>
        </CardAdminOverlay>
      )}
    </article>
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

  if (mode === "public") {
    return (
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
    )
  }

  return (
    <Carousel opts={PRODUCT_LANE_CAROUSEL_OPTS} className="relative">
      <CarouselContent className="-ml-2 md:-ml-3">
        {products.map((product, index) => (
          <CarouselItem
            key={product._id}
            className="basis-[78%] pl-2 sm:basis-[44%] md:basis-[31.5%] md:pl-3 lg:basis-[23.5%]"
          >
            <ProductLaneCard
              product={product}
              products={products}
              index={index}
              categoryId={categoryId}
              currentPageHref={currentPageHref}
              mode={mode}
              customerState={customerState}
              onEditProduct={onEditProduct}
              onDeleteProduct={onDeleteProduct}
              onToggleProductVisibility={onToggleProductVisibility}
              onReorderProducts={onReorderProducts}
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

function ProductLaneCard<TProduct extends StorefrontProduct>({
  product,
  products,
  index,
  categoryId,
  currentPageHref,
  mode,
  customerState,
  onEditProduct,
  onDeleteProduct,
  onToggleProductVisibility,
  onReorderProducts,
}: {
  product: TProduct
  products: Array<TProduct>
  index: number
  categoryId: TProduct["categoryId"]
  currentPageHref: string
  mode: StorefrontMode
  customerState: ReturnType<typeof useCustomerState>
  onEditProduct?: (product: TProduct) => void
  onDeleteProduct?: (product: TProduct) => void
  onToggleProductVisibility?: (product: TProduct) => void
  onReorderProducts?: (
    categoryId: TProduct["categoryId"],
    orderedProductIds: Array<TProduct["_id"]>
  ) => void
}) {
  const handleMovePrevious = useCallback(() => {
    onReorderProducts?.(
      categoryId,
      moveByOffset(products, index, -1).map((item) => item._id)
    )
  }, [categoryId, index, onReorderProducts, products])
  const handleMoveNext = useCallback(() => {
    onReorderProducts?.(
      categoryId,
      moveByOffset(products, index, 1).map((item) => item._id)
    )
  }, [categoryId, index, onReorderProducts, products])

  return (
    <ProductCard
      product={product}
      currentPageHref={currentPageHref}
      mode={mode}
      customerState={customerState}
      className="group h-full outline-[1.5px] outline-transparent transition focus-within:outline-[#111] hover:outline-[#111]"
      onEditProduct={onEditProduct}
      onDeleteProduct={onDeleteProduct}
      onToggleProductVisibility={onToggleProductVisibility}
      canMovePrevious={index > 0}
      canMoveNext={index < products.length - 1}
      onMovePrevious={onReorderProducts ? handleMovePrevious : undefined}
      onMoveNext={onReorderProducts ? handleMoveNext : undefined}
    />
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
  const thumbStyle = useMemo(
    () => ({ width: `${scrollbarState.thumbWidth}%` }),
    [scrollbarState.thumbWidth]
  )

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
          style={thumbStyle}
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

export function ProductCard<TProduct extends StorefrontProduct>({
  product,
  currentPageHref,
  mode,
  customerState,
  className,
  textDensity = "default",
  mediaChrome = "full",
  onEditProduct,
}: {
  product: TProduct
  currentPageHref: string
  mode: StorefrontMode
  customerState: ReturnType<typeof useCustomerState>
  className?: string
  textDensity?: ProductCardTextDensity
  mediaChrome?: ProductCardMediaChrome
  onEditProduct?: (product: TProduct) => void
  onDeleteProduct?: (product: TProduct) => void
  onToggleProductVisibility?: (product: TProduct) => void
  canMovePrevious?: boolean
  canMoveNext?: boolean
  onMovePrevious?: () => void
  onMoveNext?: () => void
}) {
  const productSnapshot = useMemo(
    () => customerProductSnapshot(product),
    [product]
  )
  const isFavorite = customerState.isWishlistProduct(productSnapshot.productId)
  const formatPrice = useMoneyFormatter()
  const textClasses = PRODUCT_CARD_TEXT_CLASSES[textDensity]
  const handleToggleFavorite = useCallback(() => {
    void customerState.toggleWishlist(productSnapshot).catch(() => undefined)
  }, [customerState, productSnapshot])
  const handleEditProduct = useCallback(() => {
    onEditProduct?.(product)
  }, [onEditProduct, product])
  const handleAdminKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLElement>) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return
      }

      event.preventDefault()
      handleEditProduct()
    },
    [handleEditProduct]
  )
  const opensAdminEditor = mode === "admin" && Boolean(onEditProduct)
  const isHidden = mode === "admin" && isHiddenProduct(product)

  return (
    <article
      className={cn(
        className,
        isHidden && "opacity-45 grayscale",
        opensAdminEditor && "cursor-pointer"
      )}
      role={opensAdminEditor ? "button" : undefined}
      tabIndex={opensAdminEditor ? 0 : undefined}
      aria-label={opensAdminEditor ? `Edit ${product.name}` : undefined}
      onClick={opensAdminEditor ? handleEditProduct : undefined}
      onKeyDown={opensAdminEditor ? handleAdminKeyDown : undefined}
    >
      <ProductMedia
        product={product}
        mode={mode}
        backHref={currentPageHref}
        mediaChrome={mediaChrome}
        isFavorite={isFavorite}
        onToggleFavorite={handleToggleFavorite}
      />
      <div className={textClasses.body}>
        <h3 className={textClasses.name}>{product.name}</h3>
        <div className={textClasses.price}>
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
  mediaChrome,
  isFavorite,
  onToggleFavorite,
}: {
  product: TProduct
  mode: StorefrontMode
  backHref: string
  mediaChrome: ProductCardMediaChrome
  isFavorite: boolean
  onToggleFavorite: () => void
}) {
  const imageUrls = productCardImageUrls(product)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [imageSlideDirection, setImageSlideDirection] = useState<
    "next" | "previous" | "none"
  >("none")
  const hasMultipleImages = imageUrls.length > 1
  const imagePreviewEnabled = hasMultipleImages
  const imageGalleryControlsEnabled =
    mediaChrome === "full" && hasMultipleImages
  const displayImageIndex = imagePreviewEnabled ? activeImageIndex : 0
  const displayImageUrl = imageUrls[displayImageIndex] ?? imageUrls[0] ?? null
  const handleMouseEnter = useCallback(() => {
    if (imagePreviewEnabled) {
      setImageSlideDirection("next")
      setActiveImageIndex(1)
    }
  }, [imagePreviewEnabled])
  const handleMouseLeave = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      const activeElement = document.activeElement

      if (
        activeElement instanceof HTMLElement &&
        event.currentTarget.contains(activeElement)
      ) {
        activeElement.blur()
      }

      setImageSlideDirection("none")
      setActiveImageIndex(0)
    },
    []
  )
  const handleShowPreviousImage = useCallback(() => {
    setImageSlideDirection("previous")
    setActiveImageIndex((currentIndex) =>
      productGalleryIndexByOffset({
        currentIndex,
        imageCount: imageUrls.length,
        offset: -1,
      })
    )
  }, [imageUrls.length])
  const handleShowNextImage = useCallback(() => {
    setImageSlideDirection("next")
    setActiveImageIndex((currentIndex) =>
      productGalleryIndexByOffset({
        currentIndex,
        imageCount: imageUrls.length,
        offset: 1,
      })
    )
  }, [imageUrls.length])
  const productParams = useMemo(
    () => ({ slug: product.slug ?? "" }),
    [product.slug]
  )
  const handleToggleFavoriteClick = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      event.stopPropagation()
      onToggleFavorite()
    },
    [onToggleFavorite]
  )
  const mediaContent = (
    <>
      {displayImageUrl ? (
        <img
          key={displayImageUrl}
          src={displayImageUrl}
          alt={product.name}
          className={cn(
            "size-full object-cover object-top",
            imageSlideDirection !== "none" &&
              "motion-safe:animate-[product-card-image-slide_360ms_ease-out]",
            imageSlideDirection === "previous" &&
              "motion-safe:[animation-direction:reverse]"
          )}
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
      <div className="relative aspect-[3/4] overflow-hidden bg-[#edf0f2]">
        {mediaContent}
      </div>
    )
  }

  return (
    <div
      className="relative aspect-[3/4] overflow-hidden bg-[#edf0f2]"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {product.slug ? (
        <Link
          to="/products/$slug"
          params={productParams}
          search={catalogBackHrefSearch(backHref)}
          className="block size-full"
        >
          {mediaContent}
        </Link>
      ) : (
        mediaContent
      )}
      {imageGalleryControlsEnabled && (
        <ProductCardGalleryControls
          onPrevious={handleShowPreviousImage}
          onNext={handleShowNextImage}
        />
      )}
      {mediaChrome === "full" && (
        <WishlistHeartButton
          isFavorite={isFavorite}
          favoriteLabel="Remove from favorites"
          unfavoriteLabel="Add to favorites"
          className={cn(
            "absolute top-2.5 right-2.5 z-10 size-8 border-0 bg-transparent p-0 transition hover:scale-110 hover:bg-transparent hover:opacity-100 focus-visible:ring-2",
            isFavorite ? "opacity-100" : "opacity-65"
          )}
          iconClassName="size-5"
          onClick={handleToggleFavoriteClick}
        />
      )}
    </div>
  )
}

function ProductCardGalleryControls({
  onNext,
  onPrevious,
}: {
  onNext: () => void
  onPrevious: () => void
}) {
  return (
    <div className="pointer-events-none absolute inset-x-2 top-1/2 z-20 flex -translate-y-1/2 items-center justify-between opacity-0 transition group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100">
      <ProductCardGalleryButton
        label="Show previous image"
        onClick={onPrevious}
      >
        <ArrowLeftIcon className="size-4" />
      </ProductCardGalleryButton>
      <ProductCardGalleryButton label="Show next image" onClick={onNext}>
        <ArrowRightIcon className="size-4" />
      </ProductCardGalleryButton>
    </div>
  )
}

function ProductCardGalleryButton({
  children,
  label,
  onClick,
}: {
  children: ReactNode
  label: string
  onClick: () => void
}) {
  const handleMouseDown = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      event.preventDefault()
    },
    []
  )
  const handleClick = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      event.preventDefault()
      event.stopPropagation()
      if (event.detail > 0) {
        event.currentTarget.blur()
        window.requestAnimationFrame(() => {
          const activeElement = document.activeElement

          if (activeElement instanceof HTMLElement) {
            activeElement.blur()
          }
        })
      }
      onClick()
    },
    [onClick]
  )

  return (
    <button
      type="button"
      aria-label={label}
      className="grid size-9 place-items-center bg-transparent text-[#111] transition hover:text-black/55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111]"
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      {children}
    </button>
  )
}

function productCardImageUrls(product: StorefrontProduct) {
  const imageUrls = new Set<string>()

  if (product.imageUrl) {
    imageUrls.add(product.imageUrl)
  }

  for (const imageUrl of product.imageUrls ?? []) {
    imageUrls.add(imageUrl)
  }

  return Array.from(imageUrls)
}

function productGalleryIndexByOffset({
  currentIndex,
  imageCount,
  offset,
}: {
  currentIndex: number
  imageCount: number
  offset: number
}) {
  if (imageCount <= 0) {
    return 0
  }

  return (currentIndex + offset + imageCount) % imageCount
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
  const handleClick = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      event.stopPropagation()
      onClick?.()
    },
    [onClick]
  )

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      title={label}
      aria-label={label}
      disabled={disabled || !onClick}
      className="rounded-none bg-white shadow-sm hover:bg-[#f1f1f1]"
      onClick={handleClick}
    >
      <Icon />
    </Button>
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
  const nodeLabel = catalogNodeLabel(category)
  const title = isVisible ? `Hide ${nodeLabel}` : `Show ${nodeLabel}`
  const handleToggle = useCallback(() => {
    onToggleCategoryVisibility(category)
  }, [category, onToggleCategoryVisibility])

  return (
    <VisibilityIconButton
      isVisible={isVisible}
      title={title}
      className={className}
      onClick={handleToggle}
    />
  )
}

function CategoryLineVisibilityButton<TCategory extends StorefrontCategory>({
  category,
  onToggleCategoryVisibility,
}: {
  category: TCategory
  onToggleCategoryVisibility: (category: TCategory) => void
}) {
  const isVisible = category.isActive ?? true
  const nodeLabel = catalogNodeLabel(category)
  const title = isVisible ? `Hide ${nodeLabel}` : `Show ${nodeLabel}`
  const Icon = isVisible ? EyeIcon : EyeOffIcon
  const handleToggle = useCallback(() => {
    onToggleCategoryVisibility(category)
  }, [category, onToggleCategoryVisibility])

  return (
    <CardIconButton title={title} variant="outline" onClick={handleToggle}>
      <Icon />
    </CardIconButton>
  )
}

function CategoryAddButton({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      title={label}
      aria-label={label}
      className="h-7 rounded-none bg-white px-2 shadow-sm hover:bg-[#f1f1f1]"
      onClick={onClick}
    >
      <PlusIcon />
      <span className="font-oswald text-xs leading-none font-bold tracking-normal uppercase">
        {label.replace("+ ", "")}
      </span>
    </Button>
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
  const handleClick = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      event.stopPropagation()
      onClick()
    },
    [onClick]
  )

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
      onClick={handleClick}
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

function interleaveProductGroups<TProduct>(
  groups: Array<{ products: Array<TProduct> }>
) {
  const maxProductCount = Math.max(
    0,
    ...groups.map((group) => group.products.length)
  )
  const products: Array<TProduct> = []

  for (let productIndex = 0; productIndex < maxProductCount; productIndex++) {
    for (const group of groups) {
      const product = group.products[productIndex]

      if (product) {
        products.push(product)
      }
    }
  }

  return products
}

function buildHomeCatalogSections<
  TCategory extends StorefrontCategory,
  TProduct extends StorefrontProduct<CustomerProductId, TCategory["_id"]>,
>({
  categories,
  products,
  rootCategories,
  hideEmptyCollections,
}: {
  categories: Array<TCategory>
  products: Array<TProduct>
  rootCategories: Array<TCategory>
  hideEmptyCollections: boolean
}): Array<HomeCatalogSection<TCategory, TProduct>> {
  const childrenByParentId = categoriesByParentId(categories)
  const productsByCategoryId = productsByCategory(products)

  return rootCategories.flatMap(
    (category): Array<HomeCatalogSection<TCategory, TProduct>> => {
      const childCategories = sortBySortOrder(
        childrenByParentId.get(category._id) ?? []
      )

      if (categoryCatalogKind(category, childCategories) === "group") {
        const collections = childCategories.flatMap((collection) => {
          if (categoryCatalogKind(collection) === "group") {
            return []
          }

          const collectionProducts =
            productsByCategoryId.get(collection._id) ?? []

          return hideEmptyCollections && collectionProducts.length === 0
            ? []
            : [{ collection, products: collectionProducts }]
        })

        return hideEmptyCollections && collections.length === 0
          ? []
          : [{ type: "group", group: category, collections }]
      }

      const collectionProducts = productsByCategoryId.get(category._id) ?? []

      return hideEmptyCollections && collectionProducts.length === 0
        ? []
        : [
            {
              type: "collection",
              collection: category,
              products: collectionProducts,
            },
          ]
    }
  )
}

function categoriesByParentId<TCategory extends StorefrontCategory>(
  categories: Array<TCategory>
) {
  const childrenByParentId = new Map<
    TCategory["_id"] | null,
    Array<TCategory>
  >()

  for (const category of categories) {
    const siblings = childrenByParentId.get(category.parentId) ?? []
    siblings.push(category)
    childrenByParentId.set(category.parentId, siblings)
  }

  return childrenByParentId
}

function productsByCategory<TProduct extends StorefrontProduct>(
  products: Array<TProduct>
) {
  const productsByCategoryId = new Map<
    TProduct["categoryId"],
    Array<TProduct>
  >()

  for (const product of products) {
    const categoryProducts = productsByCategoryId.get(product.categoryId) ?? []
    categoryProducts.push(product)
    productsByCategoryId.set(product.categoryId, categoryProducts)
  }

  for (const [categoryId, categoryProducts] of productsByCategoryId) {
    productsByCategoryId.set(categoryId, sortProducts(categoryProducts))
  }

  return productsByCategoryId
}

function categoryCatalogKind(
  category: StorefrontCategory,
  childCategories: Array<StorefrontCategory> = []
) {
  return category.kind ?? (childCategories.length > 0 ? "group" : "collection")
}

function catalogNodeLabel(category: StorefrontCategory) {
  return categoryCatalogKind(category) === "group" ? "group" : "collection"
}

function isHiddenCategory(category: StorefrontCategory) {
  return category.isActive === false
}

function isHiddenProduct(product: StorefrontProduct) {
  return Boolean(product.status && product.status !== "published")
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
          ? "No products or collections yet"
          : "No collections or groups yet"}
      </h2>
    </div>
  )
}
