import { useCustomerState } from "@/lib/customer-state"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  useCarousel,
} from "@workspace/ui/components/carousel"
import { cn } from "@workspace/ui/lib/utils"
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { moveByOffset } from "./catalog"
import { PRODUCT_LANE_CAROUSEL_OPTS } from "./constants"
import { ProductCard } from "./product-card"
import { ProductGrid } from "./product-grid"
import type { StorefrontMode, StorefrontProduct } from "./types"

export function ProductLane<TProduct extends StorefrontProduct>({
  categoryId,
  currentPageHref,
  mode,
  products,
  onEditProduct,
  onDeleteProduct,
  onToggleProductVisibility,
  onReorderProducts,
}: {
  categoryId: TProduct["categoryId"]
  currentPageHref: string
  mode: StorefrontMode
  products: Array<TProduct>
  onEditProduct?: (product: TProduct) => void
  onDeleteProduct?: (product: TProduct) => void
  onToggleProductVisibility?: (product: TProduct) => void
  onReorderProducts?: (
    categoryId: TProduct["categoryId"],
    orderedProductIds: Array<TProduct["_id"]>
  ) => void
}) {
  const customerState = useCustomerState()

  if (mode === "public") {
    return (
      <ProductGrid
        categoryId={categoryId}
        currentPageHref={currentPageHref}
        mode={mode}
        products={products}
        onEditProduct={onEditProduct}
        onDeleteProduct={onDeleteProduct}
        onToggleProductVisibility={onToggleProductVisibility}
        onReorderProducts={onReorderProducts}
      />
    )
  }

  return (
    <Carousel opts={PRODUCT_LANE_CAROUSEL_OPTS} className="relative">
      <CarouselContent className="-ml-2 md:-ml-3">
        {products.map((product, index) => (
          <CarouselItem
            key={product._id}
            className="basis-[78%] pl-2 sm:basis-[44%] md:basis-[31.5%] md:pl-3 lg:basis-[23.5%]"
          >
            <ProductLaneCard
              product={product}
              products={products}
              index={index}
              categoryId={categoryId}
              currentPageHref={currentPageHref}
              mode={mode}
              customerState={customerState}
              onEditProduct={onEditProduct}
              onDeleteProduct={onDeleteProduct}
              onToggleProductVisibility={onToggleProductVisibility}
              onReorderProducts={onReorderProducts}
            />
          </CarouselItem>
        ))}
      </CarouselContent>
      <ProductCarouselScrollbar />
      <ProductCarouselArrow direction="previous" />
      <ProductCarouselArrow direction="next" />
    </Carousel>
  )
}

function ProductLaneCard<TProduct extends StorefrontProduct>({
  product,
  products,
  index,
  categoryId,
  currentPageHref,
  mode,
  customerState,
  onEditProduct,
  onDeleteProduct,
  onToggleProductVisibility,
  onReorderProducts,
}: {
  product: TProduct
  products: Array<TProduct>
  index: number
  categoryId: TProduct["categoryId"]
  currentPageHref: string
  mode: StorefrontMode
  customerState: ReturnType<typeof useCustomerState>
  onEditProduct?: (product: TProduct) => void
  onDeleteProduct?: (product: TProduct) => void
  onToggleProductVisibility?: (product: TProduct) => void
  onReorderProducts?: (
    categoryId: TProduct["categoryId"],
    orderedProductIds: Array<TProduct["_id"]>
  ) => void
}) {
  const handleMovePrevious = useCallback(() => {
    onReorderProducts?.(
      categoryId,
      moveByOffset(products, index, -1).map((item) => item._id)
    )
  }, [categoryId, index, onReorderProducts, products])
  const handleMoveNext = useCallback(() => {
    onReorderProducts?.(
      categoryId,
      moveByOffset(products, index, 1).map((item) => item._id)
    )
  }, [categoryId, index, onReorderProducts, products])

  return (
    <ProductCard
      product={product}
      currentPageHref={currentPageHref}
      mode={mode}
      customerState={customerState}
      className="group h-full outline-[1.5px] outline-transparent transition focus-within:outline-[#111] hover:outline-[#111]"
      onEditProduct={onEditProduct}
      onDeleteProduct={onDeleteProduct}
      onToggleProductVisibility={onToggleProductVisibility}
      canMovePrevious={index > 0}
      canMoveNext={index < products.length - 1}
      onMovePrevious={onReorderProducts ? handleMovePrevious : undefined}
      onMoveNext={onReorderProducts ? handleMoveNext : undefined}
    />
  )
}

function ProductCarouselScrollbar() {
  const { api } = useCarousel()
  const trackRef = useRef<HTMLDivElement | null>(null)
  const thumbRef = useRef<HTMLDivElement | null>(null)
  const thumbWidthRef = useRef(100)
  const [scrollbarState, setScrollbarState] = useState({
    isScrollable: false,
    thumbWidth: 100,
  })

  const updateThumbPosition = useCallback(() => {
    const track = trackRef.current
    const thumb = thumbRef.current

    if (!api || !track || !thumb) {
      return
    }

    const progress = clampCarouselProgress(api.scrollProgress())
    const thumbWidthPx = (track.clientWidth * thumbWidthRef.current) / 100
    const travelPx = Math.max(track.clientWidth - thumbWidthPx, 0)

    thumb.style.transform = `translate3d(${progress * travelPx}px, 0, 0)`
  }, [api])

  const syncScrollbarMetrics = useCallback(() => {
    if (!api) {
      return
    }

    const scrollSnapCount = api.scrollSnapList().length
    const thumbWidth = Math.max(18, 100 / Math.max(scrollSnapCount, 1))
    const isScrollable =
      scrollSnapCount > 1 || api.canScrollPrev() || api.canScrollNext()

    thumbWidthRef.current = thumbWidth
    setScrollbarState((current) =>
      current.isScrollable === isScrollable && current.thumbWidth === thumbWidth
        ? current
        : { isScrollable, thumbWidth }
    )
  }, [api])
  const updateThumbPositionRef = useRef(updateThumbPosition)
  const syncScrollbarMetricsRef = useRef(syncScrollbarMetrics)

  useEffect(() => {
    updateThumbPositionRef.current = updateThumbPosition
    syncScrollbarMetricsRef.current = syncScrollbarMetrics
  }, [syncScrollbarMetrics, updateThumbPosition])

  useEffect(() => {
    if (!api) {
      return undefined
    }

    const handleMetricsChange = () => {
      syncScrollbarMetricsRef.current()
    }
    const handlePositionChange = () => {
      updateThumbPositionRef.current()
    }

    handleMetricsChange()
    handlePositionChange()
    api.on("reInit", handleMetricsChange)
    api.on("scroll", handlePositionChange)
    api.on("select", handlePositionChange)

    return () => {
      api.off("reInit", handleMetricsChange)
      api.off("scroll", handlePositionChange)
      api.off("select", handlePositionChange)
    }
  }, [api])

  useEffect(() => {
    updateThumbPosition()
  }, [
    scrollbarState.isScrollable,
    scrollbarState.thumbWidth,
    updateThumbPosition,
  ])
  const thumbStyle = useMemo(
    () => ({ width: `${scrollbarState.thumbWidth}%` }),
    [scrollbarState.thumbWidth]
  )

  if (!scrollbarState.isScrollable) {
    return null
  }

  return (
    <div
      aria-hidden="true"
      className="mt-4 h-1.5 bg-[#e5e5e5]"
      data-slot="carousel-scrollbar"
    >
      <div
        ref={trackRef}
        className="relative h-full overflow-hidden bg-[#e5e5e5]"
        data-slot="carousel-scrollbar-track"
      >
        <div
          ref={thumbRef}
          className="absolute top-0 left-0 h-full bg-[#111] will-change-transform"
          data-slot="carousel-scrollbar-thumb"
          style={thumbStyle}
        />
      </div>
    </div>
  )
}

function clampCarouselProgress(value: number) {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.min(Math.max(value, 0), 1)
}

function ProductCarouselArrow({
  direction,
}: {
  direction: "previous" | "next"
}) {
  const { canScrollNext, canScrollPrev, scrollNext, scrollPrev } = useCarousel()
  const isNext = direction === "next"
  const canScroll = isNext ? canScrollNext : canScrollPrev

  if (!canScroll) {
    return null
  }

  return (
    <button
      type="button"
      aria-label={isNext ? "Show next products" : "Show previous products"}
      className={cn(
        "absolute top-[42%] z-20 flex size-12 -translate-y-1/2 items-center justify-center border border-[#111] bg-white text-[#111] transition hover:bg-[#111] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111]",
        isNext ? "right-3" : "left-3"
      )}
      onClick={isNext ? scrollNext : scrollPrev}
    >
      {isNext ? (
        <ArrowRightIcon className="size-5" />
      ) : (
        <ArrowLeftIcon className="size-5" />
      )}
    </button>
  )
}
