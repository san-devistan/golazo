import { animateAddToCart } from "@/components/customer/cart-fly-to-icon"
import { ProductDetailLayout } from "@/components/product-detail-layout"
import {
  buildCartConfigurationSummary,
  createInitialProductConfiguratorState,
  productConfiguratorReducer,
  productGalleryImages,
  productMetadataForMode,
} from "@/components/product-detail-model"
import type {
  ProductConfigurationState,
  ProductConfiguratorAction,
  ProductDetail,
} from "@/components/product-detail-types"
import { readCatalogBackHrefSearch } from "@/lib/catalog-back-state"
import { categoryHref } from "@/lib/catalog-navigation"
import {
  cartConfigurationKey,
  type CustomerProductSnapshot,
  useCustomerState,
} from "@/lib/customer-state"
import { useMoneyFormatter, useTranslation } from "@/lib/preferences"
import { getErrorMessage, hasConvexUrl } from "@/lib/shop"
import {
  productDetailQueryOptions,
  type ProductRouteMode,
} from "@/lib/shop-queries"
import { useSuspenseQuery } from "@tanstack/react-query"
import { Link, useLocation } from "@tanstack/react-router"
import { api } from "@workspace/backend/api"
import { buttonVariants } from "@workspace/ui/lib/button-variants"
import { toast } from "@workspace/ui/lib/toast"
import { cn } from "@workspace/ui/lib/utils"
import { useAction } from "convex/react"
import { ArrowLeftIcon } from "lucide-react"
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useMemo,
  useReducer,
} from "react"

export function ProductDetailPage({
  mode,
  slug,
}: {
  mode: ProductRouteMode
  slug: string
}) {
  if (!hasConvexUrl()) {
    return <MissingBackend />
  }

  return <ProductDetailLoader mode={mode} slug={slug} />
}

function ProductDetailLoader({
  mode,
  slug,
}: {
  mode: ProductRouteMode
  slug: string
}) {
  const { data: detail } = useSuspenseQuery(
    productDetailQueryOptions(mode, slug)
  )

  if (detail === null) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-muted p-6">
        <section className="w-full max-w-lg rounded-lg border bg-background p-6 text-center">
          <h1 className="text-xl font-semibold">Product unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "admin"
              ? "This product does not exist anymore."
              : "This product is not published or its category is inactive."}
          </p>
          <Link
            to={mode === "admin" ? "/admin" : "/"}
            className={cn(buttonVariants(), "mt-4")}
          >
            <ArrowLeftIcon />
            {mode === "admin" ? "Back to admin" : "Back to catalog"}
          </Link>
        </section>
      </main>
    )
  }

  return (
    <ProductConfigurator key={detail.product._id} detail={detail} mode={mode} />
  )
}

function ProductConfigurator({
  detail,
  mode,
}: {
  detail: ProductDetail
  mode: ProductRouteMode
}) {
  return useProductConfiguratorElement({ detail, mode })
}

function useProductConfiguratorDispatch(
  dispatch: Dispatch<ProductConfiguratorAction>
) {
  const setConfiguration = useCallback(
    (value: SetStateAction<ProductConfigurationState>) => {
      dispatch({ type: "setConfiguration", value })
    },
    [dispatch]
  )
  const setQuantity = useCallback(
    (value: SetStateAction<number>) => {
      dispatch({ type: "setQuantity", value })
    },
    [dispatch]
  )
  const setIsEditDialogOpen = useCallback(
    (value: SetStateAction<boolean>) => {
      dispatch({ type: "setIsEditDialogOpen", value })
    },
    [dispatch]
  )
  const setIsDeleteDialogOpen = useCallback(
    (value: SetStateAction<boolean>) => {
      dispatch({ type: "setIsDeleteDialogOpen", value })
    },
    [dispatch]
  )
  const setIsDeleting = useCallback(
    (value: SetStateAction<boolean>) => {
      dispatch({ type: "setIsDeleting", value })
    },
    [dispatch]
  )
  const setActionErrorMessage = useCallback(
    (value: SetStateAction<string | null>) => {
      dispatch({ type: "setActionErrorMessage", value })
    },
    [dispatch]
  )

  return {
    setActionErrorMessage,
    setConfiguration,
    setIsDeleteDialogOpen,
    setIsDeleting,
    setIsEditDialogOpen,
    setQuantity,
  }
}

function useProductAddToCartHandler({
  configuration,
  customerState,
  detail,
  productSnapshot,
  quantity,
  setActionErrorMessage,
  totalPriceCents,
}: {
  configuration: ProductConfigurationState
  customerState: ReturnType<typeof useCustomerState>
  detail: ProductDetail
  productSnapshot: CustomerProductSnapshot
  quantity: number
  setActionErrorMessage: (value: SetStateAction<string | null>) => void
  totalPriceCents: number
}) {
  return useCallback(
    async (sourceElement: HTMLElement) => {
      setActionErrorMessage(null)

      try {
        const configurationSummary = buildCartConfigurationSummary(
          detail,
          configuration
        )
        await customerState.addCartItem({
          product: productSnapshot,
          configurationKey: cartConfigurationKey(
            detail.product._id,
            configurationSummary
          ),
          configurationSummary,
          unitPriceCents: totalPriceCents,
          quantity,
        })
        animateAddToCart(sourceElement)
      } catch (error) {
        setActionErrorMessage(getErrorMessage(error))
      }
    },
    [
      configuration,
      customerState,
      detail,
      productSnapshot,
      quantity,
      setActionErrorMessage,
      totalPriceCents,
    ]
  )
}

function useProductConfiguratorElement({
  detail,
  mode,
}: {
  detail: ProductDetail
  mode: ProductRouteMode
}) {
  const deleteProduct = useAction(api.cloudinary.deleteProduct)
  const customerState = useCustomerState()
  const formatPrice = useMoneyFormatter()
  const t = useTranslation()
  const [state, dispatch] = useReducer(
    productConfiguratorReducer,
    detail,
    createInitialProductConfiguratorState
  )
  const {
    actionErrorMessage,
    configuration,
    isDeleteDialogOpen,
    isDeleting,
    isEditDialogOpen,
    quantity,
  } = state
  const location = useLocation()
  const {
    setActionErrorMessage,
    setConfiguration,
    setIsDeleteDialogOpen,
    setIsDeleting,
    setIsEditDialogOpen,
    setQuantity,
  } = useProductConfiguratorDispatch(dispatch)

  const { choiceValues, enabledOptions, fieldValues } = configuration
  const productCategoryHref = categoryHref(detail.category, mode)
  const catalogBackHref = readCatalogBackHrefSearch(location.search)
  const productBackHref = catalogBackHref ?? productCategoryHref
  const productAdminCategoryHref = categoryHref(detail.category, "admin")
  const productSnapshot = useMemo(
    () => ({
      productId: detail.product._id,
      name: detail.product.name,
      slug: detail.product.slug,
      imageUrl: detail.product.imageUrl,
      basePriceCents: detail.product.basePriceCents,
      currency: detail.product.currency,
    }),
    [detail]
  )
  const galleryImages = useMemo(() => productGalleryImages(detail), [detail])
  const hierarchyCurrentItem = useMemo(
    () => ({
      label: detail.product.name,
      path: `${detail.category.path}/${detail.product._id}`,
    }),
    [detail.category.path, detail.product._id, detail.product.name]
  )
  const metadata = useMemo(
    () => productMetadataForMode(detail.metadata, mode),
    [detail.metadata, mode]
  )
  const isFavorite = customerState.isWishlistProduct(detail.product._id)
  const adminDialogState = useMemo(
    () => ({
      isDeleteDialogOpen,
      isDeleting,
      isEditDialogOpen,
    }),
    [isDeleteDialogOpen, isDeleting, isEditDialogOpen]
  )

  const totalPriceCents = useMemo(() => {
    return detail.options.reduce((total, option) => {
      if (option.config.type === "choice") {
        const selectedValue = choiceValues[option._id]
        const selectedChoice = option.config.choices.find(
          (choice) => choice.value === selectedValue
        )

        if (!selectedChoice) {
          return total
        }

        return total + option.priceDeltaCents + selectedChoice.priceDeltaCents
      }

      if (option.isRequired || enabledOptions[option._id]) {
        return total + option.priceDeltaCents
      }

      return total
    }, detail.product.basePriceCents)
  }, [choiceValues, detail, enabledOptions])

  const handleDeleteProduct = useCallback(async () => {
    setIsDeleting(true)

    try {
      await deleteProduct({ productId: detail.product._id })
      toast.success("Product deleted.")
      setIsDeleteDialogOpen(false)
      window.location.assign(productAdminCategoryHref)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsDeleting(false)
    }
  }, [
    deleteProduct,
    detail.product._id,
    productAdminCategoryHref,
    setIsDeleteDialogOpen,
    setIsDeleting,
  ])

  const handleToggleWishlist = useCallback(async () => {
    setActionErrorMessage(null)

    try {
      await customerState.toggleWishlist(productSnapshot)
    } catch (error) {
      setActionErrorMessage(getErrorMessage(error))
    }
  }, [customerState, productSnapshot, setActionErrorMessage])

  const handleAddToCart = useProductAddToCartHandler({
    configuration,
    customerState,
    detail,
    productSnapshot,
    quantity,
    setActionErrorMessage,
    totalPriceCents,
  })
  const handleEditOpen = useCallback(() => {
    setIsEditDialogOpen(true)
  }, [setIsEditDialogOpen])
  const handleDeleteOpen = useCallback(() => {
    setIsDeleteDialogOpen(true)
  }, [setIsDeleteDialogOpen])
  const handleAddToCartClick = useCallback(
    (sourceElement: HTMLElement) => {
      void handleAddToCart(sourceElement)
    },
    [handleAddToCart]
  )
  const handleToggleWishlistClick = useCallback(() => {
    void handleToggleWishlist()
  }, [handleToggleWishlist])
  const handleProductSaved = useCallback(
    (nextSlug: string) => {
      if (nextSlug !== detail.product.slug) {
        window.location.assign(`/admin/products/${nextSlug}`)
      }
    },
    [detail.product.slug]
  )
  const handleDeleteConfirm = useCallback(() => {
    void handleDeleteProduct()
  }, [handleDeleteProduct])

  return (
    <ProductDetailLayout
      actionErrorMessage={actionErrorMessage}
      adminDialogState={adminDialogState}
      choiceValues={choiceValues}
      detail={detail}
      enabledOptions={enabledOptions}
      fieldValues={fieldValues}
      formatPrice={formatPrice}
      galleryImages={galleryImages}
      handleAddToCartClick={handleAddToCartClick}
      handleDeleteConfirm={handleDeleteConfirm}
      handleDeleteOpen={handleDeleteOpen}
      handleEditOpen={handleEditOpen}
      handleProductSaved={handleProductSaved}
      handleToggleWishlistClick={handleToggleWishlistClick}
      hierarchyCurrentItem={hierarchyCurrentItem}
      isFavorite={isFavorite}
      metadata={metadata}
      mode={mode}
      productBackHref={productBackHref}
      quantity={quantity}
      setConfiguration={setConfiguration}
      setIsDeleteDialogOpen={setIsDeleteDialogOpen}
      setIsEditDialogOpen={setIsEditDialogOpen}
      setQuantity={setQuantity}
      addToCartLabel={t("addToCart")}
      totalPriceCents={totalPriceCents}
    />
  )
}

function MissingBackend() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted p-6">
      <section className="w-full max-w-lg rounded-lg border bg-background p-6">
        <h1 className="text-xl font-semibold">Connect Convex first</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Set `VITE_CONVEX_URL` in `apps/web/.env.local`, then restart the web
          dev server.
        </p>
      </section>
    </main>
  )
}
