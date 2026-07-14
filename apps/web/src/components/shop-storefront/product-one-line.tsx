import { OneLineScroll } from "@/components/one-line-scroll"
import { useCustomerState } from "@/lib/customer-state"
import { useCallback } from "react"

import { moveByOffset } from "./catalog"
import { PRODUCT_LANE_DESKTOP_SCROLL_SIZE } from "./constants"
import { ProductCard } from "./product-card"
import type { StorefrontMode, StorefrontProduct } from "./types"

export function ProductOneLineScroll<TProduct extends StorefrontProduct>({
  ariaLabel,
  categoryId,
  currentPageHref,
  mode,
  products,
  onEditProduct,
  onDeleteProduct,
  onToggleProductVisibility,
  onReorderProducts,
}: {
  ariaLabel: string
  categoryId?: TProduct["categoryId"]
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

  return (
    <OneLineScroll
      ariaLabel={ariaLabel}
      contentClassName="gap-4"
      scrollDistance={PRODUCT_LANE_DESKTOP_SCROLL_SIZE * 280}
    >
      {products.map((product, index) => (
        <div
          key={product._id}
          className="w-[min(72vw,17.5rem)] shrink-0 sm:w-[16rem] lg:w-[17.5rem]"
        >
          <ProductOneLineScrollCard
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
        </div>
      ))}
    </OneLineScroll>
  )
}

function ProductOneLineScrollCard<TProduct extends StorefrontProduct>({
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
  categoryId?: TProduct["categoryId"]
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
    if (!categoryId) {
      return
    }

    onReorderProducts?.(
      categoryId,
      moveByOffset(products, index, -1).map((item) => item._id)
    )
  }, [categoryId, index, onReorderProducts, products])
  const handleMoveNext = useCallback(() => {
    if (!categoryId) {
      return
    }

    onReorderProducts?.(
      categoryId,
      moveByOffset(products, index, 1).map((item) => item._id)
    )
  }, [categoryId, index, onReorderProducts, products])
  const canReorder = Boolean(categoryId && onReorderProducts)

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
      onMovePrevious={canReorder ? handleMovePrevious : undefined}
      onMoveNext={canReorder ? handleMoveNext : undefined}
    />
  )
}
