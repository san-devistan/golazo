import { ShopHierarchyNav } from "@/components/shop-hierarchy-nav"
import { SearchIcon, XIcon } from "lucide-react"
import { type ChangeEvent, useCallback } from "react"

import { CategoryLogo } from "./category-elements"
import type { StorefrontCategory, StorefrontMode } from "./types"

export function CategoryPageHeading<TCategory extends StorefrontCategory>({
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
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
      <div className="order-2 grid w-full max-w-md min-w-0 gap-4 lg:order-1 lg:w-[440px] lg:max-w-none lg:shrink-0">
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
      <div className="order-1 flex min-w-0 flex-col items-start gap-3 text-left lg:order-2 lg:flex-1 lg:items-end lg:text-right">
        {kicker && (
          <p className="text-xs font-bold tracking-[0.18em] uppercase">
            {kicker}
          </p>
        )}
        <div className="flex min-w-0 items-center gap-1 lg:justify-end">
          <CategoryLogo
            category={currentCategory}
            className="size-14 sm:size-16"
          />
          <h1 className="max-w-4xl min-w-0 font-oswald text-4xl leading-[0.92] font-bold tracking-normal break-words uppercase sm:text-5xl">
            {title}
          </h1>
        </div>
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

export function StorefrontPageHeading({
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
