import type {
  CustomerProductSnapshot,
  useCustomerState,
} from "@/lib/customer-state"
import { useMoneyFormatter } from "@/lib/preferences"
import { cn } from "@workspace/ui/lib/utils"
import { useCallback, useMemo } from "react"

import { isHiddenProduct } from "./catalog"
import { PRODUCT_CARD_TEXT_CLASSES } from "./constants"
import { ProductMedia } from "./product-media"
import type {
  ProductCardMediaChrome,
  ProductCardTextDensity,
  StorefrontMode,
  StorefrontProduct,
} from "./types"

export function ProductCard<TProduct extends StorefrontProduct>({
  product,
  currentPageHref,
  mode,
  customerState,
  className,
  textDensity = "default",
  mediaChrome = "full",
  onEditProduct,
  onDeleteProduct,
  onToggleProductVisibility,
  canMovePrevious,
  canMoveNext,
  onMovePrevious,
  onMoveNext,
}: {
  product: TProduct
  currentPageHref: string
  mode: StorefrontMode
  customerState: ReturnType<typeof useCustomerState>
  className?: string
  textDensity?: ProductCardTextDensity
  mediaChrome?: ProductCardMediaChrome
  onEditProduct?: (product: TProduct) => void
  onDeleteProduct?: (product: TProduct) => void
  onToggleProductVisibility?: (product: TProduct) => void
  canMovePrevious?: boolean
  canMoveNext?: boolean
  onMovePrevious?: () => void
  onMoveNext?: () => void
}) {
  const productSnapshot = useMemo(
    () => customerProductSnapshot(product),
    [product]
  )
  const isFavorite = customerState.isWishlistProduct(productSnapshot.productId)
  const formatPrice = useMoneyFormatter()
  const textClasses = PRODUCT_CARD_TEXT_CLASSES[textDensity]
  const handleToggleFavorite = useCallback(() => {
    void customerState.toggleWishlist(productSnapshot).catch(() => undefined)
  }, [customerState, productSnapshot])
  const handleEditProduct = useCallback(() => {
    onEditProduct?.(product)
  }, [onEditProduct, product])
  const canEditFromCard = mode === "admin" && Boolean(onEditProduct)
  const isHidden = mode === "admin" && isHiddenProduct(product)

  return (
    <article
      className={cn(
        className,
        canEditFromCard && "relative cursor-pointer",
        isHidden && "opacity-45 grayscale"
      )}
    >
      <ProductMedia
        product={product}
        mode={mode}
        backHref={currentPageHref}
        mediaChrome={mediaChrome}
        isFavorite={isFavorite}
        onToggleFavorite={handleToggleFavorite}
        onDeleteProduct={onDeleteProduct}
        onToggleProductVisibility={onToggleProductVisibility}
        canMovePrevious={canMovePrevious}
        canMoveNext={canMoveNext}
        onMovePrevious={onMovePrevious}
        onMoveNext={onMoveNext}
      />
      <div className={textClasses.body}>
        <h3 className={textClasses.name}>{product.name}</h3>
        <div className={textClasses.price}>
          {formatPrice(product.basePriceCents, product.currency)}
        </div>
      </div>
      {canEditFromCard && (
        <button
          type="button"
          aria-label={`Edit ${product.name}`}
          className="absolute inset-0 z-[1] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111]"
          onClick={handleEditProduct}
        />
      )}
    </article>
  )
}

function customerProductSnapshot(
  product: StorefrontProduct
): CustomerProductSnapshot {
  return {
    productId: product._id,
    name: product.name,
    slug: product.slug ?? product._id,
    imageUrl: product.imageUrl,
    basePriceCents: product.basePriceCents,
    currency: product.currency,
  }
}
