import {
  type CatalogNavigationCategory,
  type CatalogNavigationMode,
  buildCategoryBreadcrumbs,
  categoryBackHref,
  catalogRootHref,
} from "@/lib/catalog-navigation"
import { Link } from "@tanstack/react-router"
import { cn } from "@workspace/ui/lib/utils"
import { ArrowLeftIcon } from "lucide-react"

type HierarchyNavItem = {
  href?: string
  label: string
  path: string
}

export function ShopHierarchyNav({
  mode,
  categories,
  currentCategory,
  currentItem,
  backHref,
  className,
}: {
  mode: CatalogNavigationMode
  categories: Array<CatalogNavigationCategory>
  currentCategory: CatalogNavigationCategory
  currentItem?: {
    label: string
    path: string
  }
  backHref?: string
  className?: string
}) {
  const breadcrumbs = buildCategoryBreadcrumbs(
    categories,
    currentCategory,
    mode
  )
  const breadcrumbItems: Array<HierarchyNavItem> = [
    {
      href: catalogRootHref(mode),
      label: "Accueil",
      path: "__root",
    },
    ...breadcrumbs,
    ...(currentItem ? [currentItem] : []),
  ]

  if (breadcrumbs.length === 0 && !currentItem) {
    return null
  }

  return (
    <nav
      aria-label="Hiérarchie"
      className={cn("hidden flex-wrap items-center gap-6 lg:flex", className)}
    >
      <Link
        to={backHref ?? categoryBackHref(currentCategory, mode)}
        className="inline-flex items-center gap-1.5 text-xs leading-5 font-semibold text-[#111] lowercase transition hover:underline"
      >
        <ArrowLeftIcon className="size-3.5" />
        retour
      </Link>
      <ol className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-5 tracking-normal text-[#111] sm:text-base">
        {breadcrumbItems.map((breadcrumb, index) => {
          const isCurrent = index === breadcrumbItems.length - 1

          return (
            <li
              key={breadcrumb.path}
              className="flex min-w-0 items-center gap-2"
            >
              {index > 0 && <span aria-hidden="true">/</span>}
              {isCurrent ? (
                <span aria-current="page" className="truncate">
                  {breadcrumb.label}
                </span>
              ) : breadcrumb.href ? (
                <Link to={breadcrumb.href} className="truncate underline">
                  {breadcrumb.label}
                </Link>
              ) : (
                <span className="truncate">{breadcrumb.label}</span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
