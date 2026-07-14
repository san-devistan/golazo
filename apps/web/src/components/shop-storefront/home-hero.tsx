import {
  ShopUnderlineText,
  SHOP_UNDERLINE_LINK_CLASS_NAME,
} from "@/components/shop-underline-text"
import { catalogBackHrefSearch } from "@/lib/catalog-back-state"
import { catalogProductsHref } from "@/lib/catalog-navigation"
import { useMoneyFormatter } from "@/lib/preferences"
import { Link } from "@tanstack/react-router"
import { useMemo } from "react"

import { GOLAZO_HERO_MARQUEE_PASSES } from "./constants"
import type { StorefrontMode, StorefrontProduct } from "./types"

export function GolazoHomeHero({
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
