import { useCustomerState } from "@/lib/customer-state"
import { useCallback } from "react"

import { moveByOffset } from "./catalog"
import { ProductCard } from "./product-card"
import type { StorefrontMode, StorefrontProduct } from "./types"

export function ProductSection<TProduct extends StorefrontProduct>({
  categoryId,
  currentPageHref,
  className,
  mode,
  products,
  title,
  onEditProduct,
  onDeleteProduct,
  onToggleProductVisibility,
  onReorderProducts,
}: {
  categoryId: TProduct["categoryId"]
  currentPageHref: string
  className?: string
  mode: StorefrontMode
  products: Array<TProduct>
  title?: string
  onEditProduct?: (product: TProduct) => void
  onDeleteProduct?: (product: TProduct) => void
  onToggleProductVisibility?: (product: TProduct) => void
  onReorderProducts?: (
    categoryId: TProduct["categoryId"],
    orderedProductIds: Array<TProduct["_id"]>
  ) => void
}) {
  return (
    <section className={className}>
      {title && (
        <h2 className="mb-5 text-2xl font-black tracking-normal uppercase">
          {title}
        </h2>
      )}
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
    </section>
  )
}

export function ProductGrid<TProduct extends StorefrontProduct>({
  categoryId,
  currentPageHref,
  mode,
  products,
  onEditProduct,
  onDeleteProduct,
  onToggleProductVisibility,
  onReorderProducts,
}: {
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
    <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:gap-x-6 sm:gap-y-9 lg:grid-cols-4">
      {products.map((product, index) => (
        <ProductGridCard
          key={product._id}
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
      ))}
    </div>
  )
}

function ProductGridCard<TProduct extends StorefrontProduct>({
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
      className="group min-w-0 outline-[1.5px] outline-transparent transition focus-within:outline-[#111] hover:outline-[#111]"
      onEditProduct={onEditProduct}
      onDeleteProduct={onDeleteProduct}
      onToggleProductVisibility={onToggleProductVisibility}
      canMovePrevious={canReorder && index > 0}
      canMoveNext={canReorder && index < products.length - 1}
      onMovePrevious={canReorder ? handleMovePrevious : undefined}
      onMoveNext={canReorder ? handleMoveNext : undefined}
    />
  )
}
