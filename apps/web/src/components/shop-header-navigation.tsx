import { OneLineScroll } from "@/components/one-line-scroll"
import {
  SearchProductCard,
  type SearchProduct,
} from "@/components/search-product-card"
import {
  EMPTY_HEADER_CATEGORIES,
  EMPTY_HEADER_PRODUCTS,
  groupCategoriesByParentId,
  groupHeaderProductsByCategoryId,
  headerProductsForCategoryTree,
  isCategoryActive,
  type CategoriesByParentId,
  type ProductsByCategoryId,
  type ShopHeaderCategory,
  type ShopHeaderMode,
  type ShopHeaderProduct,
} from "@/components/shop-header-navigation-data"
import { categoryHref } from "@/lib/catalog-navigation"
import { Link } from "@tanstack/react-router"
import { cn } from "@workspace/ui/lib/utils"
import { useCallback, useMemo, useRef, useState } from "react"

const HEADER_FLYOUT_SCROLL_DISTANCE = 196 * 4

export function ShopHeaderNavigation({
  categories,
  currentCategoryId,
  currentCategoryPath,
  mode,
  products = EMPTY_HEADER_PRODUCTS,
  className,
}: {
  categories: Array<ShopHeaderCategory>
  currentCategoryId?: string | null
  currentCategoryPath?: string | null
  mode: ShopHeaderMode
  products?: Array<ShopHeaderProduct>
  className?: string
}) {
  const categoriesByParentId = useMemo(
    () => groupCategoriesByParentId(categories),
    [categories]
  )
  const productsByCategoryId = useMemo(
    () => groupHeaderProductsByCategoryId(products),
    [products]
  )
  const closeDropdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  )
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null)
  const firstLevelCategories =
    categoriesByParentId.get(null) ?? EMPTY_HEADER_CATEGORIES
  const cancelCloseDropdown = useCallback(() => {
    if (!closeDropdownTimerRef.current) {
      return
    }

    clearTimeout(closeDropdownTimerRef.current)
    closeDropdownTimerRef.current = null
  }, [])
  const openDropdown = useCallback(
    (categoryId: string) => {
      cancelCloseDropdown()
      setOpenCategoryId(categoryId)
    },
    [cancelCloseDropdown]
  )
  const scheduleCloseDropdown = useCallback(() => {
    cancelCloseDropdown()
    closeDropdownTimerRef.current = setTimeout(() => {
      setOpenCategoryId(null)
      closeDropdownTimerRef.current = null
    }, 180)
  }, [cancelCloseDropdown])

  if (firstLevelCategories.length === 0) {
    return null
  }

  return (
    <nav
      aria-label="Shop categories"
      className={cn(
        "relative order-3 min-w-0 basis-full lg:order-none lg:flex-1 lg:basis-auto",
        className
      )}
    >
      <ul className="pointer-events-auto flex max-w-full flex-wrap justify-center gap-1">
        {firstLevelCategories.map((category) => (
          <ShopHeaderNavigationItem
            key={category._id}
            categoriesByParentId={categoriesByParentId}
            category={category}
            currentCategoryId={currentCategoryId}
            currentCategoryPath={currentCategoryPath}
            isOpen={openCategoryId === category._id}
            mode={mode}
            onCancelClose={cancelCloseDropdown}
            onClose={scheduleCloseDropdown}
            onOpenCategory={openDropdown}
            productsByCategoryId={productsByCategoryId}
          />
        ))}
      </ul>
    </nav>
  )
}

function ShopHeaderNavigationItem({
  categoriesByParentId,
  category,
  currentCategoryId,
  currentCategoryPath,
  isOpen,
  mode,
  onCancelClose,
  onClose,
  onOpenCategory,
  productsByCategoryId,
}: {
  categoriesByParentId: CategoriesByParentId
  category: ShopHeaderCategory
  currentCategoryId?: string | null
  currentCategoryPath?: string | null
  isOpen: boolean
  mode: ShopHeaderMode
  onCancelClose: () => void
  onClose: () => void
  onOpenCategory: (categoryId: string) => void
  productsByCategoryId: ProductsByCategoryId
}) {
  const handleOpen = useCallback(() => {
    onOpenCategory(category._id)
  }, [category._id, onOpenCategory])
  const subCategories =
    categoriesByParentId.get(category._id) ?? EMPTY_HEADER_CATEGORIES
  const productPreview = useMemo(
    () =>
      mode === "public"
        ? headerProductsForCategoryTree({
            category,
            categoriesByParentId,
            productsByCategoryId,
          }).slice(0, 12)
        : EMPTY_HEADER_PRODUCTS,
    [categoriesByParentId, category, mode, productsByCategoryId]
  )
  const hasDropdown = subCategories.length > 0 || productPreview.length > 0
  const isActive = isCategoryActive(
    category,
    currentCategoryId,
    currentCategoryPath
  )

  return (
    <li className="group flex h-[68px] items-center">
      <ShopHeaderCategoryLink
        category={category}
        isActive={isActive}
        mode={mode}
        onBlur={onClose}
        onFocus={handleOpen}
        onMouseEnter={handleOpen}
        onMouseLeave={onClose}
      />

      {hasDropdown && (
        <ShopHeaderCategoryDropdown
          categoriesByParentId={categoriesByParentId}
          category={category}
          currentCategoryId={currentCategoryId}
          currentCategoryPath={currentCategoryPath}
          isOpen={isOpen}
          mode={mode}
          onCancelClose={onCancelClose}
          onClose={onClose}
          products={productPreview}
        />
      )}
    </li>
  )
}

function ShopHeaderCategoryDropdown({
  categoriesByParentId,
  category,
  currentCategoryId,
  currentCategoryPath,
  isOpen,
  mode,
  onCancelClose,
  onClose,
  products,
}: {
  categoriesByParentId: CategoriesByParentId
  category: ShopHeaderCategory
  currentCategoryId?: string | null
  currentCategoryPath?: string | null
  isOpen: boolean
  mode: ShopHeaderMode
  onCancelClose: () => void
  onClose: () => void
  products: Array<ShopHeaderProduct>
}) {
  const subCategories =
    categoriesByParentId.get(category._id) ?? EMPTY_HEADER_CATEGORIES
  const hasProducts = products.length > 0

  return (
    <div
      className={cn(
        "pointer-events-none invisible z-50 translate-y-1 pt-3 opacity-0 transition group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:visible group-hover:translate-y-0 group-hover:opacity-100",
        isOpen && "pointer-events-auto visible translate-y-0 opacity-100",
        hasProducts
          ? "fixed top-[99px] left-0 w-screen pt-0"
          : "absolute top-full left-1/2 w-60 -translate-x-1/2"
      )}
      onMouseEnter={onCancelClose}
      onMouseLeave={onClose}
    >
      <div
        className={cn(
          "border border-[#dfdfdf] bg-white text-[#111] shadow-[0_18px_40px_rgb(0_0_0/0.08)]",
          hasProducts ? "mx-auto w-full max-w-[1536px] p-4" : "p-2"
        )}
      >
        <div
          className={cn(
            "grid gap-4",
            hasProducts &&
              subCategories.length > 0 &&
              "grid-cols-[180px_minmax(0,1fr)]"
          )}
        >
          {subCategories.length > 0 && (
            <ShopHeaderSubcategoryList
              categoriesByParentId={categoriesByParentId}
              category={category}
              currentCategoryId={currentCategoryId}
              currentCategoryPath={currentCategoryPath}
              mode={mode}
            />
          )}
          {hasProducts && (
            <ShopHeaderProductPreviewGrid
              category={category}
              mode={mode}
              products={products}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function ShopHeaderSubcategoryList({
  categoriesByParentId,
  category,
  currentCategoryId,
  currentCategoryPath,
  mode,
}: {
  categoriesByParentId: CategoriesByParentId
  category: ShopHeaderCategory
  currentCategoryId?: string | null
  currentCategoryPath?: string | null
  mode: ShopHeaderMode
}) {
  const subCategories =
    categoriesByParentId.get(category._id) ?? EMPTY_HEADER_CATEGORIES

  return (
    <ul className="grid gap-1">
      {subCategories.map((subCategory) => (
        <ShopHeaderSubcategoryItem
          key={subCategory._id}
          category={subCategory}
          currentCategoryId={currentCategoryId}
          currentCategoryPath={currentCategoryPath}
          mode={mode}
        />
      ))}
    </ul>
  )
}

function ShopHeaderSubcategoryItem({
  category,
  currentCategoryId,
  currentCategoryPath,
  mode,
}: {
  category: ShopHeaderCategory
  currentCategoryId?: string | null
  currentCategoryPath?: string | null
  mode: ShopHeaderMode
}) {
  const isActive = isCategoryActive(
    category,
    currentCategoryId,
    currentCategoryPath
  )

  return (
    <li>
      <Link
        to={categoryHref(category, mode)}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "flex items-center p-3 text-sm font-semibold transition-all outline-none hover:bg-[#f6f6f6] focus:bg-[#f6f6f6] focus-visible:ring-2 focus-visible:ring-[#111]/30 focus-visible:outline-none",
          isActive && "bg-[#f6f6f6]"
        )}
      >
        <span className="w-full truncate">{category.name}</span>
      </Link>
    </li>
  )
}

function ShopHeaderCategoryLink({
  category,
  isActive,
  mode,
  onBlur,
  onFocus,
  onMouseEnter,
  onMouseLeave,
}: {
  category: ShopHeaderCategory
  isActive: boolean
  mode: ShopHeaderMode
  onBlur: () => void
  onFocus: () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
}) {
  return (
    <Link
      to={categoryHref(category, mode)}
      aria-current={isActive ? "page" : undefined}
      onBlur={onBlur}
      onFocus={onFocus}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        "relative inline-flex h-9 max-w-40 items-center justify-center rounded-none px-4 py-1.5 font-oswald text-sm font-bold tracking-normal uppercase transition-all outline-none after:absolute after:right-4 after:bottom-0 after:left-4 after:h-px after:origin-center after:scale-x-0 after:bg-current after:opacity-0 after:transition hover:after:scale-x-100 hover:after:opacity-100 focus-visible:ring-2 focus-visible:ring-[#111]/30 focus-visible:outline-none focus-visible:after:scale-x-100 focus-visible:after:opacity-100",
        isActive && "after:scale-x-100 after:opacity-100"
      )}
    >
      <ShopHeaderCategoryLabel>{category.name}</ShopHeaderCategoryLabel>
    </Link>
  )
}

function ShopHeaderCategoryLabel({ children }: { children: string }) {
  return <span className="block max-w-32 truncate">{children}</span>
}

function ShopHeaderProductPreviewGrid({
  category,
  mode,
  products,
}: {
  category: ShopHeaderCategory
  mode: ShopHeaderMode
  products: Array<ShopHeaderProduct>
}) {
  const backHref = categoryHref(category, mode)

  return (
    <OneLineScroll
      ariaLabel={`${category.name} products`}
      contentClassName="gap-4"
      scrollDistance={HEADER_FLYOUT_SCROLL_DISTANCE}
    >
      {products.map((product) => (
        <div key={product._id} className="w-[180px] shrink-0">
          <SearchProductCard
            backHref={backHref}
            product={headerProductToSearchProduct(product)}
          />
        </div>
      ))}
    </OneLineScroll>
  )
}

function headerProductToSearchProduct(
  product: ShopHeaderProduct
): SearchProduct {
  return product as SearchProduct
}
