import {
  SearchProductCard,
  type SearchProduct,
} from "@/components/search-product-card"
import { ShopFooter } from "@/components/shop-footer"
import { ShopHeader, type ShopHeaderCategory } from "@/components/shop-header"
import { catalogQueryOptions } from "@/lib/shop-queries"
import { useSuspenseQuery } from "@tanstack/react-query"
import { Link, useNavigate } from "@tanstack/react-router"
import { ArrowLeftIcon, SearchIcon, XIcon } from "lucide-react"
import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useMemo,
  useState,
} from "react"

const EMPTY_CATEGORIES: Array<ShopHeaderCategory> = []
const EMPTY_PRODUCTS: Array<SearchProduct> = []

export function SearchContent({ initialQuery }: { initialQuery: string }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState(initialQuery)
  const { data } = useSuspenseQuery(catalogQueryOptions())
  const categories: Array<ShopHeaderCategory> =
    data.categories ?? EMPTY_CATEGORIES
  const products: Array<SearchProduct> = data.products ?? EMPTY_PRODUCTS
  const results = useMemo(
    () => searchProducts({ categories, products, query }),
    [categories, products, query]
  )
  const backHref = query ? `/search?q=${encodeURIComponent(query)}` : "/search"
  const hasSearch = query.trim().length > 0

  const handleQueryChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value)
    },
    []
  )
  const handleClearSearch = useCallback(() => {
    setQuery("")
  }, [])
  const handleSearchSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const nextQuery = query.trim()

      void navigate({
        to: "/search",
        search: nextQuery ? { q: nextQuery } : {},
      })
    },
    [navigate, query]
  )

  return (
    <main className="min-h-svh bg-white text-[#111]">
      <ShopHeader categories={categories} products={products} />
      <section className="mx-auto max-w-[1536px] px-4 pt-8 pb-16 sm:px-6 lg:px-10">
        <div className="mb-8 grid gap-5 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:items-start">
          <div className="grid gap-4">
            <SearchBreadcrumbs />
            <form
              aria-label="Search products"
              className="relative"
              onSubmit={handleSearchSubmit}
            >
              <label className="sr-only" htmlFor="products-search">
                Search products
              </label>
              <input
                id="products-search"
                type="text"
                name="q"
                value={query}
                placeholder="Search products"
                className="h-[42px] w-full border border-black/15 bg-white px-3.5 pr-11 text-sm outline-none placeholder:text-black/55 focus:border-[#111]"
                onChange={handleQueryChange}
              />
              {hasSearch ? (
                <SearchClearButton onClick={handleClearSearch} />
              ) : (
                <SearchPlaceholderIcon />
              )}
            </form>
            <p className="text-sm text-black/55" aria-live="polite">
              {results.length} {results.length === 1 ? "product" : "products"}{" "}
              found
            </p>
          </div>
          <h1 className="font-oswald text-4xl leading-[0.92] font-bold tracking-normal uppercase sm:text-5xl lg:justify-self-end lg:text-right">
            Products
          </h1>
        </div>

        {results.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-9 lg:grid-cols-4">
            {results.map((product) => (
              <SearchProductCard
                key={product._id}
                backHref={backHref}
                product={product}
              />
            ))}
          </div>
        ) : (
          <div className="border border-[#dfdfdf] bg-[#f6f6f6] p-10 text-center">
            <h2 className="font-oswald text-2xl font-bold uppercase">
              No products found
            </h2>
          </div>
        )}
      </section>
      <ShopFooter categories={categories} />
    </main>
  )
}

function SearchBreadcrumbs() {
  return (
    <nav
      aria-label="Hiérarchie"
      className="hidden flex-wrap items-center gap-6 lg:flex"
    >
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-xs leading-5 font-semibold text-[#111] lowercase transition hover:underline"
      >
        <ArrowLeftIcon className="size-3.5" />
        retour
      </Link>
      <ol className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-5 tracking-normal text-[#111] sm:text-base">
        <li className="flex min-w-0 items-center gap-2">
          <Link to="/" className="truncate underline">
            Accueil
          </Link>
        </li>
        <li className="flex min-w-0 items-center gap-2">
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="truncate">
            Products
          </span>
        </li>
      </ol>
    </nav>
  )
}

function SearchClearButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="Clear product search"
      className="absolute inset-y-0 right-0 grid w-[42px] place-items-center text-black/55 transition hover:text-[#111] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#111]"
      onClick={onClick}
    >
      <XIcon className="size-4" />
    </button>
  )
}

function SearchPlaceholderIcon() {
  return (
    <SearchIcon
      aria-hidden="true"
      className="absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-black/55"
    />
  )
}

function searchProducts({
  categories,
  products,
  query,
}: {
  categories: Array<ShopHeaderCategory>
  products: Array<SearchProduct>
  query: string
}) {
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) {
    return products
  }

  const categoryNameById = new Map(
    categories.map((category) => [category._id, category.name.toLowerCase()])
  )

  return products.filter((product) => {
    const categoryName = categoryNameById.get(product.categoryId) ?? ""

    return (
      product.name.toLowerCase().includes(normalizedQuery) ||
      product.description?.toLowerCase().includes(normalizedQuery) ||
      categoryName.includes(normalizedQuery)
    )
  })
}
