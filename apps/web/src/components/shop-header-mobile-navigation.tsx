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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible"
import { cn } from "@workspace/ui/lib/utils"
import { ChevronDownIcon } from "lucide-react"

export function ShopHeaderMobileNavigation({
  categories,
  currentCategoryId,
  currentCategoryPath,
  mode,
  onNavigate,
}: {
  categories: Array<ShopHeaderCategory>
  currentCategoryId?: string | null
  currentCategoryPath?: string | null
  mode: ShopHeaderMode
  onNavigate?: () => void
}) {
  const categoriesByParentId = groupCategoriesByParentId(categories)
  const firstLevelCategories =
    categoriesByParentId.get(null) ?? EMPTY_HEADER_CATEGORIES

  if (firstLevelCategories.length === 0) {
    return null
  }

  return (
    <nav
      aria-label="Mobile shop categories"
      className="min-h-0 flex-1 overflow-y-auto py-2"
    >
      <ul>
        {firstLevelCategories.map((category) => (
          <ShopHeaderMobileNavigationItem
            key={category._id}
            categoriesByParentId={categoriesByParentId}
            category={category}
            currentCategoryId={currentCategoryId}
            currentCategoryPath={currentCategoryPath}
            mode={mode}
            onNavigate={onNavigate}
          />
        ))}
      </ul>
    </nav>
  )
}

function ShopHeaderMobileNavigationItem({
  categoriesByParentId,
  category,
  currentCategoryId,
  currentCategoryPath,
  mode,
  onNavigate,
}: {
  categoriesByParentId: CategoriesByParentId
  category: ShopHeaderCategory
  currentCategoryId?: string | null
  currentCategoryPath?: string | null
  mode: ShopHeaderMode
  onNavigate?: () => void
}) {
  const subCategories =
    categoriesByParentId.get(category._id) ?? EMPTY_HEADER_CATEGORIES
  const isActive = isCategoryActive(
    category,
    currentCategoryId,
    currentCategoryPath
  )

  if (subCategories.length === 0) {
    return (
      <li>
        <ShopHeaderMobileCategoryLink
          category={category}
          isActive={isActive}
          mode={mode}
          onNavigate={onNavigate}
        />
      </li>
    )
  }

  return (
    <li>
      <Collapsible defaultOpen={false}>
        <CollapsibleTrigger
          type="button"
          className={cn(
            "flex min-h-12 w-full items-center gap-3 border-b border-border px-4 py-3 text-left font-oswald text-xl leading-none font-black tracking-normal uppercase transition-all outline-none hover:bg-muted focus:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-1",
            isActive && "underline underline-offset-4"
          )}
        >
          <span className="min-w-0 flex-1 truncate">{category.name}</span>
          <ChevronDownIcon className="size-5 shrink-0" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ul className="border-b border-border/70 bg-muted/35 py-1">
            <ShopHeaderMobileSubcategoryItem
              category={category}
              currentCategoryId={currentCategoryId}
              currentCategoryPath={currentCategoryPath}
              label="Tout voir"
              mode={mode}
              onNavigate={onNavigate}
            />
            {subCategories.map((subCategory) => (
              <ShopHeaderMobileSubcategoryItem
                key={subCategory._id}
                category={subCategory}
                currentCategoryId={currentCategoryId}
                currentCategoryPath={currentCategoryPath}
                mode={mode}
                onNavigate={onNavigate}
              />
            ))}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </li>
  )
}

function ShopHeaderMobileSubcategoryItem({
  category,
  currentCategoryId,
  currentCategoryPath,
  label,
  mode,
  onNavigate,
}: {
  category: ShopHeaderCategory
  currentCategoryId?: string | null
  currentCategoryPath?: string | null
  label?: string
  mode: ShopHeaderMode
  onNavigate?: () => void
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
          "flex min-h-10 items-center px-7 py-2 text-sm font-semibold transition-all outline-none hover:bg-background focus:bg-background focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-1",
          isActive && "bg-background"
        )}
        onClick={onNavigate}
      >
        <span className="min-w-0 truncate">{label ?? category.name}</span>
      </Link>
    </li>
  )
}

function ShopHeaderMobileCategoryLink({
  category,
  isActive,
  mode,
  onNavigate,
}: {
  category: ShopHeaderCategory
  isActive: boolean
  mode: ShopHeaderMode
  onNavigate?: () => void
}) {
  return (
    <Link
      to={categoryHref(category, mode)}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex min-h-12 items-center border-b border-border px-4 py-3 font-oswald text-xl leading-none font-black tracking-normal uppercase transition-all outline-none hover:bg-muted focus:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-1",
        isActive && "underline underline-offset-4"
      )}
      onClick={onNavigate}
    >
      <span className="min-w-0 truncate">{category.name}</span>
    </Link>
  )
}
