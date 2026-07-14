import type { ProductCardTextDensity } from "./types"

export const PRODUCT_CARD_TEXT_CLASSES = {
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

export const PRODUCT_LANE_DESKTOP_SCROLL_SIZE = 4
export const PRODUCT_LANE_CAROUSEL_OPTS = {
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
export const CATEGORY_CAROUSEL_PRIORITY_VISIBLE_PRODUCT_COUNT =
  PRODUCT_LANE_DESKTOP_SCROLL_SIZE
export const GOLAZO_HERO_PRODUCTS_LIMIT = 24
export const GOLAZO_HERO_MARQUEE_PASSES = ["primary", "duplicate"] as const
export const HOME_FEATURED_PRODUCT_LIMIT = 24
