import { WishlistHeartButton } from "@/components/wishlist-heart-button"
import { catalogBackHrefSearch } from "@/lib/catalog-back-state"
import { Link } from "@tanstack/react-router"
import { cn } from "@workspace/ui/lib/utils"
import {
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

import {
  ProductCardGalleryControls,
  ProductImageAdminControls,
  ProductVisibilityIconButton,
} from "./product-media-controls"
import type {
  ProductCardMediaChrome,
  StorefrontMode,
  StorefrontProduct,
} from "./types"

export function ProductMedia<TProduct extends StorefrontProduct>({
  product,
  mode,
  backHref,
  mediaChrome,
  isFavorite,
  onToggleFavorite,
  onDeleteProduct,
  onToggleProductVisibility,
  canMovePrevious,
  canMoveNext,
  onMovePrevious,
  onMoveNext,
}: {
  product: TProduct
  mode: StorefrontMode
  backHref: string
  mediaChrome: ProductCardMediaChrome
  isFavorite: boolean
  onToggleFavorite: () => void
  onDeleteProduct?: (product: TProduct) => void
  onToggleProductVisibility?: (product: TProduct) => void
  canMovePrevious?: boolean
  canMoveNext?: boolean
  onMovePrevious?: () => void
  onMoveNext?: () => void
}) {
  const gallery = useProductMediaGallery(product, mediaChrome)

  if (mode === "admin") {
    return (
      <AdminProductMedia
        product={product}
        gallery={gallery}
        onDeleteProduct={onDeleteProduct}
        onToggleProductVisibility={onToggleProductVisibility}
        canMovePrevious={canMovePrevious}
        canMoveNext={canMoveNext}
        onMovePrevious={onMovePrevious}
        onMoveNext={onMoveNext}
      />
    )
  }

  return (
    <PublicProductMedia
      product={product}
      backHref={backHref}
      gallery={gallery}
      isFavorite={isFavorite}
      mediaChrome={mediaChrome}
      onToggleFavorite={onToggleFavorite}
    />
  )
}

type ImageSlideDirection = "next" | "previous" | "none"

type ProductMediaGallery = {
  displayImageUrl: string | null
  imageGalleryControlsEnabled: boolean
  imageSlideDirection: ImageSlideDirection
  onMouseEnter: () => void
  onMouseLeave: (event: ReactMouseEvent<HTMLDivElement>) => void
  onShowNextImage: () => void
  onShowPreviousImage: () => void
}

function useProductMediaGallery(
  product: StorefrontProduct,
  mediaChrome: ProductCardMediaChrome
): ProductMediaGallery {
  const imageUrls = productCardImageUrls(product)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [imageSlideDirection, setImageSlideDirection] =
    useState<ImageSlideDirection>("none")
  const hasMultipleImages = imageUrls.length > 1
  const displayImageIndex = hasMultipleImages ? activeImageIndex : 0
  const displayImageUrl = imageUrls[displayImageIndex] ?? imageUrls[0] ?? null
  const hoverImageUrl = imageUrls[1] ?? null

  usePreloadProductCardImage(hoverImageUrl)

  const handleMouseEnter = useCallback(() => {
    if (hasMultipleImages) {
      setImageSlideDirection("next")
      setActiveImageIndex(1)
    }
  }, [hasMultipleImages])
  const handleMouseLeave = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      const activeElement = document.activeElement

      if (
        activeElement instanceof HTMLElement &&
        event.currentTarget.contains(activeElement)
      ) {
        activeElement.blur()
      }

      setImageSlideDirection("none")
      setActiveImageIndex(0)
    },
    []
  )
  const handleShowPreviousImage = useCallback(() => {
    setImageSlideDirection("previous")
    setActiveImageIndex((currentIndex) =>
      productGalleryIndexByOffset({
        currentIndex,
        imageCount: imageUrls.length,
        offset: -1,
      })
    )
  }, [imageUrls.length])
  const handleShowNextImage = useCallback(() => {
    setImageSlideDirection("next")
    setActiveImageIndex((currentIndex) =>
      productGalleryIndexByOffset({
        currentIndex,
        imageCount: imageUrls.length,
        offset: 1,
      })
    )
  }, [imageUrls.length])

  return {
    displayImageUrl,
    imageGalleryControlsEnabled: mediaChrome === "full" && hasMultipleImages,
    imageSlideDirection,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onShowNextImage: handleShowNextImage,
    onShowPreviousImage: handleShowPreviousImage,
  }
}

function usePreloadProductCardImage(imageUrl: string | null) {
  useEffect(() => {
    if (!imageUrl) {
      return undefined
    }

    let isCancelled = false
    let image: HTMLImageElement | null = null
    const preload = () => {
      if (isCancelled) {
        return
      }

      image = new Image()
      image.decoding = "async"
      image.setAttribute("fetchpriority", "low")
      image.src = imageUrl
    }
    const idleWindow = window as Window &
      typeof globalThis & {
        cancelIdleCallback?: (handle: number) => void
        requestIdleCallback?: (
          callback: () => void,
          options?: { timeout?: number }
        ) => number
      }

    if (idleWindow.requestIdleCallback) {
      const idleId = idleWindow.requestIdleCallback(preload, { timeout: 1200 })

      return () => {
        isCancelled = true
        image = null
        idleWindow.cancelIdleCallback?.(idleId)
      }
    }

    const timeoutId = window.setTimeout(preload, 300)

    return () => {
      isCancelled = true
      image = null
      window.clearTimeout(timeoutId)
    }
  }, [imageUrl])
}

function ProductMediaImage({
  imageSlideDirection,
  imageUrl,
  productName,
}: {
  imageSlideDirection: ImageSlideDirection
  imageUrl: string | null
  productName: string
}) {
  if (!imageUrl) {
    return (
      <div className="flex size-full items-center justify-center px-6 text-center text-sm font-semibold text-[#777]">
        Image produit
      </div>
    )
  }

  return (
    <img
      key={imageUrl}
      src={imageUrl}
      alt={productName}
      className={cn(
        "size-full object-cover object-top",
        imageSlideDirection !== "none" &&
          "motion-safe:animate-[product-card-image-slide_360ms_ease-out]",
        imageSlideDirection === "previous" &&
          "motion-safe:[animation-direction:reverse]"
      )}
    />
  )
}

function AdminProductMedia<TProduct extends StorefrontProduct>({
  product,
  gallery,
  onDeleteProduct,
  onToggleProductVisibility,
  canMovePrevious,
  canMoveNext,
  onMovePrevious,
  onMoveNext,
}: {
  product: TProduct
  gallery: ProductMediaGallery
  onDeleteProduct?: (product: TProduct) => void
  onToggleProductVisibility?: (product: TProduct) => void
  canMovePrevious?: boolean
  canMoveNext?: boolean
  onMovePrevious?: () => void
  onMoveNext?: () => void
}) {
  return (
    <div className="relative aspect-[3/4] overflow-hidden bg-[#edf0f2]">
      <ProductMediaImage
        imageSlideDirection={gallery.imageSlideDirection}
        imageUrl={gallery.displayImageUrl}
        productName={product.name}
      />
      {onToggleProductVisibility && (
        <ProductVisibilityIconButton
          product={product}
          className="top-2 right-auto left-2 group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100"
          onToggleProductVisibility={onToggleProductVisibility}
        />
      )}
      <ProductImageAdminControls
        product={product}
        onDeleteProduct={onDeleteProduct}
        canMovePrevious={canMovePrevious}
        canMoveNext={canMoveNext}
        onMovePrevious={onMovePrevious}
        onMoveNext={onMoveNext}
      />
    </div>
  )
}

function PublicProductMedia({
  product,
  backHref,
  gallery,
  isFavorite,
  mediaChrome,
  onToggleFavorite,
}: {
  product: StorefrontProduct
  backHref: string
  gallery: ProductMediaGallery
  isFavorite: boolean
  mediaChrome: ProductCardMediaChrome
  onToggleFavorite: () => void
}) {
  const productParams = useMemo(
    () => ({ slug: product.slug ?? "" }),
    [product.slug]
  )
  const handleToggleFavoriteClick = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      event.stopPropagation()
      onToggleFavorite()
    },
    [onToggleFavorite]
  )

  return (
    <div
      className="relative aspect-[3/4] overflow-hidden bg-[#edf0f2]"
      onMouseEnter={gallery.onMouseEnter}
      onMouseLeave={gallery.onMouseLeave}
    >
      {product.slug ? (
        <Link
          to="/products/$slug"
          params={productParams}
          search={catalogBackHrefSearch(backHref)}
          className="block size-full"
        >
          <ProductMediaImage
            imageSlideDirection={gallery.imageSlideDirection}
            imageUrl={gallery.displayImageUrl}
            productName={product.name}
          />
        </Link>
      ) : (
        <ProductMediaImage
          imageSlideDirection={gallery.imageSlideDirection}
          imageUrl={gallery.displayImageUrl}
          productName={product.name}
        />
      )}
      {gallery.imageGalleryControlsEnabled && (
        <ProductCardGalleryControls
          onPrevious={gallery.onShowPreviousImage}
          onNext={gallery.onShowNextImage}
        />
      )}
      {mediaChrome === "full" && (
        <WishlistHeartButton
          isFavorite={isFavorite}
          favoriteLabel="Remove from favorites"
          unfavoriteLabel="Add to favorites"
          className={cn(
            "absolute top-2.5 right-2.5 z-10 size-8 border-0 bg-transparent p-0 transition hover:scale-110 hover:bg-transparent hover:opacity-100 focus-visible:ring-2",
            isFavorite ? "opacity-100" : "opacity-65"
          )}
          iconClassName="size-5"
          onClick={handleToggleFavoriteClick}
        />
      )}
    </div>
  )
}

function productCardImageUrls(product: StorefrontProduct) {
  const imageUrls = new Set<string>()

  if (product.imageUrl) {
    imageUrls.add(product.imageUrl)
  }

  for (const imageUrl of product.imageUrls ?? []) {
    imageUrls.add(imageUrl)
  }

  return Array.from(imageUrls)
}

function productGalleryIndexByOffset({
  currentIndex,
  imageCount,
  offset,
}: {
  currentIndex: number
  imageCount: number
  offset: number
}) {
  if (imageCount <= 0) {
    return 0
  }

  return (currentIndex + offset + imageCount) % imageCount
}
