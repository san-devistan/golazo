import { Link } from "@tanstack/react-router"
/* eslint-disable no-underscore-dangle, react-perf/jsx-no-new-object-as-prop */
import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import {
  HeartIcon,
  SearchIcon,
  SettingsIcon,
  ShoppingBagIcon,
  UserIcon,
} from "lucide-react"

export type ShopHeaderCategory = {
  _id: string
  name: string
  parentId: string | null
  sortOrder: number
}

function sortCategories<T extends ShopHeaderCategory>(categories: Array<T>) {
  return Array.from(categories).toSorted((first, second) => {
    if (first.sortOrder !== second.sortOrder) {
      return first.sortOrder - second.sortOrder
    }

    return first.name.localeCompare(second.name)
  })
}

export function ShopHeader({
  categories,
  currentCategoryId,
  adminMode = false,
}: {
  categories: Array<ShopHeaderCategory>
  currentCategoryId?: string | null
  adminMode?: boolean
}) {
  const firstLevelCategories = sortCategories(
    categories.filter((category) => category.parentId === null)
  )
  const categoryRoute = adminMode
    ? "/admin/categories/$categoryId"
    : "/categories/$categoryId"

  return (
    <header className="sticky top-0 z-40 border-b border-[#d9d9d9] bg-white text-[#111]">
      <div className="mx-auto flex max-w-[1536px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-10">
        <Link
          to={adminMode ? "/admin" : "/"}
          className="flex min-w-0 items-center gap-3"
        >
          <span className="grid size-10 place-items-center bg-[#111] text-sm font-black text-white">
            GK
          </span>
          <span className="hidden truncate text-sm font-black tracking-normal uppercase sm:inline">
            Golazo Kit Room
          </span>
        </Link>

        <nav className="hidden min-w-0 flex-1 justify-center gap-7 md:flex">
          <Link
            to={adminMode ? "/admin" : "/"}
            className="text-sm font-black hover:underline"
          >
            Maillots
          </Link>
          {firstLevelCategories.map((category) => {
            const secondLevelCategories = sortCategories(
              categories.filter((item) => item.parentId === category._id)
            )
            const isActive = currentCategoryId === category._id

            return (
              <div key={category._id} className="group relative">
                <Link
                  to={categoryRoute}
                  params={{ categoryId: category._id }}
                  className={cn(
                    "block max-w-36 truncate py-2 text-sm font-black hover:underline",
                    isActive && "underline underline-offset-4"
                  )}
                >
                  {category.name}
                </Link>

                {secondLevelCategories.length > 0 && (
                  <div className="invisible absolute top-full left-0 z-50 w-64 translate-y-2 border border-[#d9d9d9] bg-white p-2 opacity-0 shadow-xl transition group-hover:visible group-hover:translate-y-1 group-hover:opacity-100">
                    {secondLevelCategories.map((child) => (
                      <Link
                        key={child._id}
                        to={categoryRoute}
                        params={{ categoryId: child._id }}
                        className="block px-3 py-2 text-sm font-semibold hover:bg-[#f1f1f1]"
                      >
                        {child.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        <div className="flex min-w-0 items-center gap-2">
          <div className="hidden h-9 w-52 items-center bg-[#f1f1f1] px-3 lg:flex">
            <input
              aria-label="Search products"
              placeholder="Rechercher"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
            <SearchIcon className="size-5" />
          </div>
          <button type="button" className="grid size-9 place-items-center">
            <UserIcon className="size-5" />
          </button>
          <button type="button" className="grid size-9 place-items-center">
            <HeartIcon className="size-5" />
          </button>
          <button type="button" className="grid size-9 place-items-center">
            <ShoppingBagIcon className="size-5" />
          </button>
          <Link
            to="/admin"
            className={buttonVariants({
              variant: adminMode ? "default" : "outline",
              size: "sm",
            })}
          >
            <SettingsIcon />
            Admin
          </Link>
        </div>
      </div>
    </header>
  )
}
