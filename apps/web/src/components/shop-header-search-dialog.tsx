import { OneLineScroll } from "@/components/one-line-scroll"
import {
  SearchProductCard,
  type SearchProduct,
} from "@/components/search-product-card"
import type { ShopHeaderProduct } from "@/components/shop-header-navigation-data"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import { SearchIcon, XIcon } from "lucide-react"
import {
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useMemo,
  useState,
} from "react"

const MAX_SEARCH_SUGGESTIONS = 24
const VISIBLE_SEARCH_SUGGESTIONS = 4
const SEARCH_SUGGESTION_SCROLL_DISTANCE = 196 * VISIBLE_SEARCH_SUGGESTIONS

export function ShopHeaderSearchDialog({
  initialQuery,
  label,
  products,
  onSearch,
}: {
  initialQuery: string
  label: string
  products: Array<ShopHeaderProduct>
  onSearch: (query: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(initialQuery)
  const suggestions = useMemo(
    () => searchSuggestions(products, query),
    [products, query]
  )
  const triggerButton = useMemo(
    () => (
      <button
        type="button"
        aria-label={label}
        className="grid size-[34px] place-items-center bg-transparent text-[#111] transition hover:opacity-65 focus-visible:ring-2 focus-visible:ring-[#111]/30 focus-visible:outline-none lg:mr-6 lg:flex lg:h-[38px] lg:w-[clamp(190px,14vw,220px)] lg:justify-start lg:gap-2.5 lg:border lg:border-black/15 lg:bg-white lg:px-3.5 lg:text-left lg:text-black/55 lg:hover:border-[#111] lg:hover:opacity-100 lg:focus-visible:ring-0 lg:focus-visible:outline-2 lg:focus-visible:outline-offset-2 lg:focus-visible:outline-[#111]"
      />
    ),
    [label]
  )

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        setQuery(initialQuery)
      }

      setOpen(nextOpen)
    },
    [initialQuery]
  )
  const handleClose = useCallback(() => {
    setOpen(false)
  }, [])
  const handleQueryChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value)
    },
    []
  )
  const commitSearch = useCallback(() => {
    const nextQuery = query.trim()

    setOpen(false)
    onSearch(nextQuery)
  }, [onSearch, query])
  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      commitSearch()
    },
    [commitSearch]
  )
  const handleQueryKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== "Enter") {
        return
      }

      event.preventDefault()
      commitSearch()
    },
    [commitSearch]
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={triggerButton}>
        <span className="hidden min-w-0 flex-1 truncate text-sm lg:block">
          {initialQuery || label}
        </span>
        <SearchIcon className="size-[18px] shrink-0" />
      </DialogTrigger>
      <DialogContent
        className="w-[min(808px,calc(100vw-2rem))] max-w-none rounded-none border border-black/20 bg-white p-0 text-[#111] shadow-[0_24px_80px_rgb(0_0_0/0.16)] ring-0 sm:max-w-none"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">{label}</DialogTitle>
        <form aria-label={label} className="grid gap-0" onSubmit={handleSubmit}>
          <div className="flex h-16 items-center gap-3 border-b border-[#dfdfdf] px-5">
            <SearchIcon className="size-5 shrink-0 text-black/45" />
            <input
              type="text"
              name="q"
              aria-label={label}
              placeholder={label}
              value={query}
              className="min-w-0 flex-1 bg-transparent text-lg outline-none placeholder:text-black/45"
              onChange={handleQueryChange}
              onKeyDown={handleQueryKeyDown}
            />
            <button
              type="submit"
              className="font-oswald text-sm font-bold text-[#111] uppercase transition hover:text-black/55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111]"
            >
              Search
            </button>
            <button
              type="button"
              aria-label="Close search"
              className="-mr-1 grid size-8 place-items-center text-[#111] transition hover:text-black/55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111]"
              onClick={handleClose}
            >
              <XIcon className="size-5" />
            </button>
          </div>

          <div className="grid min-w-0 gap-3 px-5 py-5">
            <p className="font-oswald text-sm font-bold uppercase">
              Suggestions
            </p>
            <HeaderSearchSuggestions query={query} suggestions={suggestions} />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function HeaderSearchSuggestions({
  query,
  suggestions,
}: {
  query: string
  suggestions: Array<SearchProduct>
}) {
  if (suggestions.length === 0) {
    return (
      <div className="border border-[#dfdfdf] bg-[#f6f6f6] p-5 text-sm text-black/55">
        No products found
      </div>
    )
  }

  return (
    <OneLineScroll
      ariaLabel="Search suggestions"
      contentClassName="gap-4"
      scrollDistance={SEARCH_SUGGESTION_SCROLL_DISTANCE}
    >
      {suggestions.map((product) => (
        <div key={product._id} className="w-[180px] shrink-0">
          <SearchProductCard
            backHref={searchBackHref(query)}
            mediaChrome="minimal"
            product={product}
            textDensity="compact"
          />
        </div>
      ))}
    </OneLineScroll>
  )
}

function searchBackHref(query: string) {
  const normalizedQuery = query.trim()

  return normalizedQuery
    ? `/products?q=${encodeURIComponent(normalizedQuery)}`
    : "/products"
}

function searchSuggestions(products: Array<ShopHeaderProduct>, query: string) {
  const normalizedQuery = query.trim().toLowerCase()
  const matchingProducts = normalizedQuery
    ? products.filter((product) =>
        product.name.toLowerCase().includes(normalizedQuery)
      )
    : products

  return sortProducts(matchingProducts).slice(0, MAX_SEARCH_SUGGESTIONS)
}

function sortProducts(products: Array<ShopHeaderProduct>) {
  return Array.from(products).toSorted((first, second) => {
    const firstOrder = first.sortOrder ?? Number.MAX_SAFE_INTEGER
    const secondOrder = second.sortOrder ?? Number.MAX_SAFE_INTEGER

    if (firstOrder !== secondOrder) {
      return firstOrder - secondOrder
    }

    return first.name.localeCompare(second.name)
  })
}
