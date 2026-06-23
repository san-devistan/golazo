import {
  EMPTY_HEADER_CATEGORIES,
  groupCategoriesByParentId,
  isCategoryActive,
  type CategoriesByParentId,
  type ShopHeaderCategory,
  type ShopHeaderMode,
} from "@/components/shop-header-navigation-data"
import { categoryHref } from "@/lib/catalog-navigation"
import { Link } from "@tanstack/react-router"
import { cn } from "@workspace/ui/lib/utils"

export type { ShopHeaderCategory } from "@/components/shop-header-navigation-data"

export function ShopHeaderNavigation({
  categories,
  currentCategoryId,
  currentCategoryPath,
  mode,
  className,
}: {
  categories: Array<ShopHeaderCategory>
  currentCategoryId?: string | null
  currentCategoryPath?: string | null
  mode: ShopHeaderMode
  className?: string
}) {
  const categoriesByParentId = groupCategoriesByParentId(categories)
  const firstLevelCategories =
    categoriesByParentId.get(null) ?? EMPTY_HEADER_CATEGORIES

  if (firstLevelCategories.length === 0) {
    return null
  }

  return (
    <nav
      aria-label="Shop categories"
      className={cn(
        "order-3 min-w-0 basis-full lg:order-none lg:flex-1 lg:basis-auto",
        className
      )}
    >
      <ul className="flex max-w-full flex-wrap justify-center gap-1">
        {firstLevelCategories.map((category) => (
          <ShopHeaderNavigationItem
            key={category._id}
            categoriesByParentId={categoriesByParentId}
            category={category}
            currentCategoryId={currentCategoryId}
            currentCategoryPath={currentCategoryPath}
            mode={mode}
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
  const isActive = isCategoryActive(
    category,
    currentCategoryId,
    currentCategoryPath
  )

  return (
    <li className="group relative">
      <ShopHeaderCategoryLink
        category={category}
        isActive={isActive}
        mode={mode}
      />

      {subCategories.length > 0 && (
        <ShopHeaderCategoryDropdown
          categoriesByParentId={categoriesByParentId}
          category={category}
          currentCategoryId={currentCategoryId}
          currentCategoryPath={currentCategoryPath}
          mode={mode}
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
  mode,
}: {
  categoriesByParentId: CategoriesByParentId
  category: ShopHeaderCategory
  currentCategoryId?: string | null
  currentCategoryPath?: string | null
  mode: ShopHeaderMode
}) {
  return (
    <div className="pointer-events-none invisible absolute top-full left-1/2 z-50 w-56 -translate-x-1/2 translate-y-1 pt-1 opacity-0 transition group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
      <div className="rounded-lg bg-popover p-1 text-popover-foreground shadow ring-1 ring-foreground/10">
        <ShopHeaderSubcategoryList
          categoriesByParentId={categoriesByParentId}
          category={category}
          currentCategoryId={currentCategoryId}
          currentCategoryPath={currentCategoryPath}
          mode={mode}
        />
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
          "flex items-center rounded-md p-3 text-sm font-semibold transition-all outline-none hover:bg-muted focus:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-1",
          isActive && "bg-muted/70"
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
}: {
  category: ShopHeaderCategory
  isActive: boolean
  mode: ShopHeaderMode
}) {
  return (
    <Link
      to={categoryHref(category, mode)}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "inline-flex h-9 max-w-40 items-center justify-center rounded-none px-3 py-1.5 text-sm font-black tracking-normal uppercase transition-all outline-none hover:bg-muted focus:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-1",
        isActive && "underline underline-offset-4"
      )}
    >
      <ShopHeaderCategoryLabel>{category.name}</ShopHeaderCategoryLabel>
    </Link>
  )
}

function ShopHeaderCategoryLabel({ children }: { children: string }) {
  return <span className="block max-w-32 truncate">{children}</span>
}
