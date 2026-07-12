import { AdminProductEditorDialog } from "@/components/admin-catalog-workspace"
import { ProductOptionControls } from "@/components/product-detail-options"
import {
  ProductAdminActions,
  ProductAsideHeader,
  ProductDeleteDialog,
  ProductImageGallery,
  ProductMetadataList,
  ProductPurchaseActions,
  ProductTrustSignals,
} from "@/components/product-detail-sidebar"
import type {
  ProductConfigurationState,
  ProductDetail,
} from "@/components/product-detail-types"
import { ShopFooter } from "@/components/shop-footer"
import { ShopHeader } from "@/components/shop-header"
import { ShopHierarchyNav } from "@/components/shop-hierarchy-nav"
import type { ProductRouteMode } from "@/lib/shop-queries"
import type { SetStateAction } from "react"

export function ProductDetailLayout({
  actionErrorMessage,
  adminDialogState,
  choiceValues,
  detail,
  enabledOptions,
  fieldValues,
  formatPrice,
  galleryImages,
  handleAddToCartClick,
  handleDeleteConfirm,
  handleDeleteOpen,
  handleEditOpen,
  handleProductSaved,
  handleToggleWishlistClick,
  hierarchyCurrentItem,
  isFavorite,
  metadata,
  mode,
  productBackHref,
  quantity,
  setConfiguration,
  setIsDeleteDialogOpen,
  setIsEditDialogOpen,
  setQuantity,
  totalPriceCents,
  addToCartLabel,
}: {
  addToCartLabel: string
  actionErrorMessage: string | null
  adminDialogState: {
    isDeleteDialogOpen: boolean
    isDeleting: boolean
    isEditDialogOpen: boolean
  }
  choiceValues: Record<string, string>
  detail: ProductDetail
  enabledOptions: Record<string, boolean>
  fieldValues: Record<string, Record<string, string>>
  formatPrice: (amountCents: number, sourceCurrency?: string) => string
  galleryImages: ProductDetail["images"]
  handleAddToCartClick: (sourceElement: HTMLElement) => void
  handleDeleteConfirm: () => void
  handleDeleteOpen: () => void
  handleEditOpen: () => void
  handleProductSaved: (nextSlug: string) => void
  handleToggleWishlistClick: () => void
  hierarchyCurrentItem: { label: string; path: string }
  isFavorite: boolean
  metadata: ProductDetail["metadata"]
  mode: ProductRouteMode
  productBackHref: string
  quantity: number
  setConfiguration: (value: SetStateAction<ProductConfigurationState>) => void
  setIsDeleteDialogOpen: (value: SetStateAction<boolean>) => void
  setIsEditDialogOpen: (value: SetStateAction<boolean>) => void
  setQuantity: (value: SetStateAction<number>) => void
  totalPriceCents: number
}) {
  return (
    <main className="min-h-svh bg-white text-[#111]">
      <ShopHeader
        categories={detail.categories}
        currentCategoryId={detail.category._id}
        currentCategoryPath={detail.category.path}
        adminMode={mode === "admin"}
        products={detail.products}
      />

      <section className="mx-auto max-w-[1536px] px-4 pt-6 sm:px-6 lg:px-10">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <ShopHierarchyNav
            mode={mode}
            categories={detail.categories}
            currentCategory={detail.category}
            currentItem={hierarchyCurrentItem}
            backHref={productBackHref}
            className="min-w-0"
          />
          {mode === "admin" && (
            <ProductAdminActions
              onEdit={handleEditOpen}
              onDelete={handleDeleteOpen}
            />
          )}
        </div>

        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.62fr)] lg:items-start">
          <ProductImageGallery
            images={galleryImages}
            productName={detail.product.name}
          />

          <aside className="h-fit min-w-0 bg-transparent py-6 lg:sticky lg:top-28">
            <ProductAsideHeader
              productName={detail.product.name}
              price={formatPrice(totalPriceCents, detail.product.currency)}
            />
            <ProductMetadataList metadata={metadata} />

            <div className="mt-7 space-y-7 border-t border-[#dfdfdf] pt-7">
              <ProductOptionControls
                options={detail.options}
                choiceValues={choiceValues}
                enabledOptions={enabledOptions}
                fieldValues={fieldValues}
                currency={detail.product.currency}
                onConfigurationChange={setConfiguration}
              />
            </div>

            <ProductPurchaseActions
              addToCartLabel={addToCartLabel}
              isFavorite={isFavorite}
              quantity={quantity}
              onAddToCart={handleAddToCartClick}
              onQuantityChange={setQuantity}
              onToggleWishlist={handleToggleWishlistClick}
            />
            <ProductTrustSignals />
            {detail.product.description.trim() ? (
              <p className="mt-7 text-sm leading-6 whitespace-pre-line text-black/65">
                {detail.product.description}
              </p>
            ) : null}
            {actionErrorMessage ? (
              <p
                role="alert"
                className="mt-4 text-sm font-medium text-destructive"
              >
                {actionErrorMessage}
              </p>
            ) : null}
          </aside>
        </div>
      </section>
      {mode !== "admin" && <ShopFooter categories={detail.categories} />}
      {mode === "admin" && (
        <>
          <AdminProductEditorDialog
            productId={detail.product._id}
            isOpen={adminDialogState.isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            onSaved={handleProductSaved}
          />
          <ProductDeleteDialog
            productName={detail.product.name}
            isOpen={adminDialogState.isDeleteDialogOpen}
            isDeleting={adminDialogState.isDeleting}
            onOpenChange={setIsDeleteDialogOpen}
            onConfirm={handleDeleteConfirm}
          />
        </>
      )}
    </main>
  )
}
