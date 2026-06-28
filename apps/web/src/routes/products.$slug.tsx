import { AdminProductEditorDialog } from "@/components/admin-catalog-workspace"
import { ShopFooter } from "@/components/shop-footer"
import { ShopHeader } from "@/components/shop-header"
import { ShopHierarchyNav } from "@/components/shop-hierarchy-nav"
import { SizeGuideDialog } from "@/components/size-guide-dialog"
import { WishlistHeartButton } from "@/components/wishlist-heart-button"
import { requireAdminAuth } from "@/lib/admin-auth"
import { readCatalogBackHrefSearch } from "@/lib/catalog-back-state"
import { categoryHref } from "@/lib/catalog-navigation"
import {
  type CartConfigurationSummaryItem,
  cartConfigurationKey,
  useCustomerState,
} from "@/lib/customer-state"
import { useMoneyFormatter, useTranslation } from "@/lib/preferences"
import { displayOptionLabel, getErrorMessage, hasConvexUrl } from "@/lib/shop"
import {
  productDetailQueryOptions,
  type ProductRouteMode,
} from "@/lib/shop-queries"
import { useSuspenseQuery } from "@tanstack/react-query"
import { Link, createFileRoute, useLocation } from "@tanstack/react-router"
/* eslint-disable max-lines, max-lines-per-function, react/jsx-max-depth, react-perf/jsx-no-new-function-as-prop, react-perf/jsx-no-new-object-as-prop */
import { api } from "@workspace/backend/api"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Separator } from "@workspace/ui/components/separator"
import { buttonVariants } from "@workspace/ui/lib/button-variants"
import { toast } from "@workspace/ui/lib/toast"
import { cn } from "@workspace/ui/lib/utils"
import { useAction } from "convex/react"
import type { GenericId } from "convex/values"
import {
  ArrowLeftIcon,
  ExternalLinkIcon,
  MinusIcon,
  PencilIcon,
  PlusIcon,
  ShoppingCartIcon,
  Trash2Icon,
} from "lucide-react"
import { type SetStateAction, useMemo, useReducer } from "react"

export const Route = createFileRoute("/products/$slug")({
  validateSearch: validateProductSearch,
  loaderDeps: ({ search }) => ({ mode: productRouteMode(search) }),
  beforeLoad: async ({ location, search }) => {
    if (productRouteMode(search) === "admin") {
      await requireAdminAuth(location.href)
    }
  },
  loader: async ({ params, deps, context: { queryClient } }) => {
    if (!hasConvexUrl()) {
      return
    }

    await queryClient.ensureQueryData(
      productDetailQueryOptions(deps.mode, params.slug)
    )
  },
  component: ProductPage,
})

type ProductId = GenericId<"products">

type ProductSearch = {
  back?: string
  mode?: "admin"
}

function validateProductSearch(search: Record<string, unknown>): ProductSearch {
  const back = readCatalogBackHrefSearch(search)

  return {
    ...(back ? { back } : {}),
    ...(search.mode === "admin" ? { mode: "admin" } : {}),
  }
}

function productRouteMode(search: ProductSearch): ProductRouteMode {
  return search.mode === "admin" ? "admin" : "public"
}

type ChoiceConfig = {
  type: "choice"
  choices: Array<{
    label: string
    value: string
    priceDeltaCents: number
  }>
}

type PersonalizationConfig = {
  type: "personalization"
  fields: Array<{
    key: string
    label: string
    inputType: "text" | "number"
    required: boolean
  }>
}

type ProductOption = {
  _id: string
  label: string
  isRequired: boolean
  priceDeltaCents: number
  config: ChoiceConfig | PersonalizationConfig
}

type ProductMetadata = {
  _id: string
  label: string
  type?: "text" | "number" | "boolean" | "link"
  value: string
  linkUrl?: string | null
  showOnProductPage?: boolean
}

type ProductDetailImage = {
  _id: string
  imageUrl: string
}

type ProductDetail = {
  product: {
    _id: ProductId
    name: string
    slug: string
    description: string
    basePriceCents: number
    currency: string
    imageUrl: string | null
  }
  images: Array<ProductDetailImage>
  category: {
    _id: string
    name: string
    path: string
  }
  categories: Array<{
    _id: string
    name: string
    parentId: string | null
    path: string
    sortOrder: number
  }>
  options: Array<ProductOption>
  metadata: Array<ProductMetadata>
}

type ProductConfigurationState = {
  productId: ProductId
  choiceValues: Record<string, string>
  enabledOptions: Record<string, boolean>
  fieldValues: Record<string, Record<string, string>>
}

type ProductConfiguratorState = {
  actionErrorMessage: string | null
  configuration: ProductConfigurationState
  isDeleteDialogOpen: boolean
  isDeleting: boolean
  isEditDialogOpen: boolean
  quantity: number
  selectedImageIndex: number
}

type ProductConfiguratorAction =
  | {
      type: "setConfiguration"
      value: SetStateAction<ProductConfigurationState>
    }
  | {
      type: "setSelectedImageIndex"
      value: SetStateAction<number>
    }
  | {
      type: "setQuantity"
      value: SetStateAction<number>
    }
  | {
      type: "setIsEditDialogOpen"
      value: SetStateAction<boolean>
    }
  | {
      type: "setIsDeleteDialogOpen"
      value: SetStateAction<boolean>
    }
  | {
      type: "setIsDeleting"
      value: SetStateAction<boolean>
    }
  | {
      type: "setActionErrorMessage"
      value: SetStateAction<string | null>
    }

type ChoiceProductOption = ProductOption & { config: ChoiceConfig }
type PersonalizationProductOption = ProductOption & {
  config: PersonalizationConfig
}

function isChoiceOption(option: ProductOption): option is ChoiceProductOption {
  return option.config.type === "choice"
}

function isPersonalizationOption(
  option: ProductOption
): option is PersonalizationProductOption {
  return option.config.type === "personalization"
}

function createInitialConfiguration(
  detail: ProductDetail
): ProductConfigurationState {
  const choiceValues: Record<string, string> = {}
  const enabledOptions: Record<string, boolean> = {}

  for (const option of detail.options) {
    if (option.config.type === "choice") {
      choiceValues[option._id] = option.isRequired
        ? (option.config.choices[0]?.value ?? "")
        : ""
    }

    if (option.config.type === "personalization") {
      enabledOptions[option._id] = option.isRequired
    }
  }

  return {
    productId: detail.product._id,
    choiceValues,
    enabledOptions,
    fieldValues: {},
  }
}

function createInitialProductConfiguratorState(
  detail: ProductDetail
): ProductConfiguratorState {
  return {
    actionErrorMessage: null,
    configuration: createInitialConfiguration(detail),
    isDeleteDialogOpen: false,
    isDeleting: false,
    isEditDialogOpen: false,
    quantity: 1,
    selectedImageIndex: 0,
  }
}

function isStateUpdater<T>(
  value: SetStateAction<T>
): value is (current: T) => T {
  return typeof value === "function"
}

function resolveStateAction<T>(value: SetStateAction<T>, current: T): T {
  return isStateUpdater(value) ? value(current) : value
}

function productConfiguratorReducer(
  state: ProductConfiguratorState,
  action: ProductConfiguratorAction
): ProductConfiguratorState {
  if (action.type === "setConfiguration") {
    return {
      ...state,
      configuration: resolveStateAction(action.value, state.configuration),
    }
  }

  if (action.type === "setSelectedImageIndex") {
    return {
      ...state,
      selectedImageIndex: resolveStateAction(
        action.value,
        state.selectedImageIndex
      ),
    }
  }

  if (action.type === "setQuantity") {
    return {
      ...state,
      quantity: resolveStateAction(action.value, state.quantity),
    }
  }

  if (action.type === "setIsEditDialogOpen") {
    return {
      ...state,
      isEditDialogOpen: resolveStateAction(
        action.value,
        state.isEditDialogOpen
      ),
    }
  }

  if (action.type === "setIsDeleteDialogOpen") {
    return {
      ...state,
      isDeleteDialogOpen: resolveStateAction(
        action.value,
        state.isDeleteDialogOpen
      ),
    }
  }

  if (action.type === "setIsDeleting") {
    return {
      ...state,
      isDeleting: resolveStateAction(action.value, state.isDeleting),
    }
  }

  return {
    ...state,
    actionErrorMessage: resolveStateAction(
      action.value,
      state.actionErrorMessage
    ),
  }
}

function productMetadataForMode(
  metadata: Array<ProductMetadata>,
  mode: ProductRouteMode
) {
  return mode === "admin"
    ? metadata
    : metadata.filter((item) => item.showOnProductPage ?? true)
}

function productMetadataLinkHref(linkUrl: string | null | undefined) {
  const value = linkUrl?.trim()
  if (!value) {
    return null
  }

  try {
    const url = new URL(value)

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null
    }

    return url.href
  } catch {
    return null
  }
}

function productMetadataLinkLabel(href: string) {
  try {
    const url = new URL(href)
    const host = url.hostname.replace(/^www\./, "")
    const path = url.pathname === "/" ? "" : url.pathname

    return `${host}${path}`
  } catch {
    return "Open link"
  }
}

function ProductMetadataValue({ item }: { item: ProductMetadata }) {
  const href = productMetadataLinkHref(
    item.type === "link" ? item.value : item.linkUrl
  )

  if (!href) {
    return <>{item.value}</>
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title={href}
      className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm font-semibold text-foreground transition hover:border-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <ExternalLinkIcon className="size-3.5 shrink-0" />
      <span className="min-w-0 truncate">{productMetadataLinkLabel(href)}</span>
    </a>
  )
}

function ProductPage() {
  const { slug } = Route.useParams()
  const mode = productRouteMode(Route.useSearch())

  return <ProductDetailPage mode={mode} slug={slug} />
}

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

function productGalleryImages(detail: ProductDetail) {
  if (detail.images.length > 0) {
    return detail.images
  }

  if (!detail.product.imageUrl) {
    return []
  }

  return [
    {
      _id: `${detail.product._id}-legacy-image`,
      imageUrl: detail.product.imageUrl,
    },
  ]
}

function buildCartConfigurationSummary(
  detail: ProductDetail,
  configuration: ProductConfigurationState
): Array<CartConfigurationSummaryItem> {
  const summary: Array<CartConfigurationSummaryItem> = []

  for (const option of detail.options) {
    if (option.config.type === "choice") {
      const selectedValue = configuration.choiceValues[option._id]
      let selectedChoiceLabel: string | null = null

      for (const choice of option.config.choices) {
        if (choice.value === selectedValue) {
          selectedChoiceLabel = choice.label
          break
        }
      }

      if (option.isRequired && !selectedChoiceLabel) {
        throw new Error(`Choose ${displayOptionLabel(option.label)}.`)
      }

      if (selectedChoiceLabel) {
        summary.push({
          label: displayOptionLabel(option.label),
          value: selectedChoiceLabel,
        })
      }
      continue
    }

    const enabled =
      option.isRequired || configuration.enabledOptions[option._id]

    if (!enabled) {
      continue
    }

    const fieldValues = configuration.fieldValues[option._id] ?? {}
    const values = option.config.fields.flatMap((field) => {
      const value = fieldValues[field.key]?.trim() ?? ""

      if (field.required && !value) {
        throw new Error(`Enter ${field.label}.`)
      }

      return value ? [value] : []
    })

    summary.push({
      label: displayOptionLabel(option.label),
      value: values.length > 0 ? values.join(", ") : "Included",
    })
  }

  return summary
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
    selectedImageIndex,
  } = state
  const location = useLocation()

  function setConfiguration(value: SetStateAction<ProductConfigurationState>) {
    dispatch({ type: "setConfiguration", value })
  }

  function setSelectedImageIndex(value: SetStateAction<number>) {
    dispatch({ type: "setSelectedImageIndex", value })
  }

  function setQuantity(value: SetStateAction<number>) {
    dispatch({ type: "setQuantity", value })
  }

  function setIsEditDialogOpen(value: SetStateAction<boolean>) {
    dispatch({ type: "setIsEditDialogOpen", value })
  }

  function setIsDeleteDialogOpen(value: SetStateAction<boolean>) {
    dispatch({ type: "setIsDeleteDialogOpen", value })
  }

  function setIsDeleting(value: SetStateAction<boolean>) {
    dispatch({ type: "setIsDeleting", value })
  }

  function setActionErrorMessage(value: SetStateAction<string | null>) {
    dispatch({ type: "setActionErrorMessage", value })
  }

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
  const metadata = useMemo(
    () => productMetadataForMode(detail.metadata, mode),
    [detail.metadata, mode]
  )
  const hasSizeOption = detail.options.some(
    (option) =>
      isChoiceOption(option) &&
      isSizeOptionLabel(displayOptionLabel(option.label))
  )
  const selectedImage =
    galleryImages[selectedImageIndex] ?? galleryImages[0] ?? null
  const isFavorite = customerState.isWishlistProduct(detail.product._id)

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

  async function handleDeleteProduct() {
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
  }

  async function handleToggleWishlist() {
    setActionErrorMessage(null)

    try {
      await customerState.toggleWishlist(productSnapshot)
    } catch (error) {
      setActionErrorMessage(getErrorMessage(error))
    }
  }

  async function handleAddToCart() {
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
    } catch (error) {
      setActionErrorMessage(getErrorMessage(error))
    }
  }

  return (
    <main className="min-h-svh bg-[linear-gradient(180deg,var(--background),var(--muted))]">
      <ShopHeader
        categories={detail.categories}
        currentCategoryId={detail.category._id}
        currentCategoryPath={detail.category.path}
        adminMode={mode === "admin"}
      />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <ShopHierarchyNav
            mode={mode}
            categories={detail.categories}
            currentCategory={detail.category}
            currentItem={{
              label: detail.product.name,
              path: `${detail.category.path}/${detail.product._id}`,
            }}
            backHref={productBackHref}
            className="min-w-0"
          />
          {mode === "admin" && (
            <ProductAdminActions
              onEdit={() => setIsEditDialogOpen(true)}
              onDelete={() => setIsDeleteDialogOpen(true)}
            />
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,540px)_minmax(0,1fr)] lg:items-start lg:gap-12 xl:gap-16">
          <section className="min-w-0 lg:sticky lg:top-24">
            <div className="w-full max-w-[540px] overflow-hidden rounded-lg border bg-background">
              <div className="aspect-square bg-muted">
                {selectedImage ? (
                  <img
                    src={selectedImage.imageUrl}
                    alt={detail.product.name}
                    className="size-full object-contain"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
                    No Cloudinary CDN image stored yet
                  </div>
                )}
              </div>
            </div>
            {galleryImages.length > 1 && (
              <div className="mt-3 grid w-full max-w-[540px] grid-cols-4 gap-2 sm:grid-cols-5">
                {galleryImages.map((image, index) => (
                  <button
                    key={image._id}
                    type="button"
                    aria-label={`Show product image ${index + 1}`}
                    aria-pressed={index === selectedImageIndex}
                    onClick={() => setSelectedImageIndex(index)}
                    className={cn(
                      "aspect-square overflow-hidden rounded-md border bg-background transition outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                      index === selectedImageIndex
                        ? "border-foreground"
                        : "border-transparent hover:border-border"
                    )}
                  >
                    <img
                      src={image.imageUrl}
                      alt=""
                      className="size-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </section>

          <aside className="h-fit min-w-0 bg-transparent lg:pl-2">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-2">
                <h1 className="font-oswald text-3xl font-black tracking-wider uppercase">
                  {detail.product.name}
                </h1>
                <div className="font-oswald text-xl font-medium">
                  {formatPrice(totalPriceCents, detail.product.currency)}
                </div>
              </div>
            </div>

            {metadata.length > 0 && (
              <>
                <Separator className="my-5" />
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  {metadata.map((item) => (
                    <div
                      key={item._id}
                      className={cn(
                        "rounded-lg bg-muted p-3",
                        item.showOnProductPage === false &&
                          "border border-dashed border-muted-foreground/40 bg-muted/50"
                      )}
                    >
                      <dt className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="min-w-0 truncate">{item.label}</span>
                        {item.showOnProductPage === false && (
                          <Badge variant="outline" className="h-4 px-1.5">
                            Hidden
                          </Badge>
                        )}
                      </dt>
                      <dd className="mt-1 font-medium">
                        <ProductMetadataValue item={item} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </>
            )}

            <div className="mt-4 space-y-6">
              {hasSizeOption && (
                <div className="flex justify-start">
                  <SizeGuideDialog />
                </div>
              )}

              {detail.options.map((option) => {
                if (isChoiceOption(option)) {
                  return (
                    <ChoiceOptionControl
                      key={option._id}
                      option={option}
                      value={choiceValues[option._id] ?? ""}
                      onChange={(value) =>
                        setConfiguration((current) => ({
                          ...current,
                          choiceValues: {
                            ...current.choiceValues,
                            [option._id]: value,
                          },
                        }))
                      }
                      currency={detail.product.currency}
                    />
                  )
                }

                if (isPersonalizationOption(option)) {
                  return (
                    <PersonalizationOptionControl
                      key={option._id}
                      option={option}
                      enabled={option.isRequired || enabledOptions[option._id]}
                      fieldValues={fieldValues[option._id] ?? {}}
                      onToggle={(enabled) =>
                        setConfiguration((current) => ({
                          ...current,
                          enabledOptions: {
                            ...current.enabledOptions,
                            [option._id]: enabled,
                          },
                        }))
                      }
                      onFieldChange={(fieldKey, value) =>
                        setConfiguration((current) => ({
                          ...current,
                          fieldValues: {
                            ...current.fieldValues,
                            [option._id]: {
                              ...current.fieldValues[option._id],
                              [fieldKey]: value,
                            },
                          },
                        }))
                      }
                      currency={detail.product.currency}
                    />
                  )
                }

                return null
              })}
              <QuantityControl quantity={quantity} onChange={setQuantity} />
            </div>

            <div className="mt-10 flex gap-3">
              <Button
                type="button"
                onClick={() => {
                  void handleAddToCart()
                }}
                className="h-14 flex-1 justify-between rounded-none px-5 text-sm font-black"
              >
                <span>{t("addToCart")}</span>
                <span className="relative grid size-6 place-items-center">
                  <ShoppingCartIcon className="size-5" />
                  <PlusIcon className="absolute right-0 bottom-0 size-3 rounded-full bg-foreground text-background" />
                </span>
              </Button>
              <WishlistHeartButton
                isFavorite={isFavorite}
                className="size-14"
                iconClassName="size-6"
                onClick={() => {
                  void handleToggleWishlist()
                }}
              />
            </div>
            {actionErrorMessage ? (
              <p role="alert" className="text-sm font-medium text-destructive">
                {actionErrorMessage}
              </p>
            ) : null}
          </aside>
        </div>
      </div>
      {mode !== "admin" && <ShopFooter categories={detail.categories} />}
      {mode === "admin" && (
        <>
          <AdminProductEditorDialog
            productId={detail.product._id}
            isOpen={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            onSaved={(nextSlug) => {
              if (nextSlug !== detail.product.slug) {
                window.location.assign(`/admin/products/${nextSlug}`)
              }
            }}
          />
          <ProductDeleteDialog
            productName={detail.product.name}
            isOpen={isDeleteDialogOpen}
            isDeleting={isDeleting}
            onOpenChange={setIsDeleteDialogOpen}
            onConfirm={() => {
              void handleDeleteProduct()
            }}
          />
        </>
      )}
    </main>
  )
}

function ProductAdminActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-none"
        onClick={onEdit}
      >
        <PencilIcon />
        Edit
      </Button>
      <Button
        type="button"
        size="sm"
        variant="destructive"
        className="rounded-none"
        onClick={onDelete}
      >
        <Trash2Icon />
        Delete
      </Button>
    </div>
  )
}

function ProductDeleteDialog({
  productName,
  isOpen,
  isDeleting,
  onOpenChange,
  onConfirm,
}: {
  productName: string
  isOpen: boolean
  isDeleting: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={(open) => !isDeleting && onOpenChange(open)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete product?</AlertDialogTitle>
          <AlertDialogDescription>
            This will delete "{productName}" and its images, options, and
            metadata from Convex and Cloudinary.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isDeleting}
            onClick={onConfirm}
          >
            <Trash2Icon />
            {isDeleting ? "Deleting" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function isSizeOptionLabel(label: string) {
  const normalizedLabel = label.trim().toLowerCase()

  return (
    normalizedLabel === "size" ||
    normalizedLabel === "taille" ||
    normalizedLabel.includes("size") ||
    normalizedLabel.includes("taille")
  )
}

function ChoiceOptionControl({
  option,
  value,
  onChange,
  currency,
}: {
  option: ChoiceProductOption
  value: string
  onChange: (value: string) => void
  currency: string
}) {
  const label = displayOptionLabel(option.label)
  const formatPrice = useMoneyFormatter()

  return (
    <div className="grid gap-3 sm:grid-cols-[96px_1fr] sm:items-start">
      <div className="pt-2 text-sm font-medium">{label}</div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          {!option.isRequired && (
            <label
              className={cn(
                "flex min-h-11 min-w-11 cursor-pointer items-center justify-center px-3 text-sm font-semibold transition has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                value === ""
                  ? "bg-foreground text-background"
                  : "bg-muted text-foreground hover:bg-muted/80"
              )}
            >
              <input
                type="radio"
                aria-label={`No ${label}`}
                name={option._id}
                value=""
                checked={value === ""}
                onChange={() => onChange("")}
                className="sr-only"
              />
              None
            </label>
          )}
          {option.config.choices.map((choice) => (
            <label
              key={choice.value}
              className={cn(
                "flex min-h-11 min-w-11 cursor-pointer items-center justify-center px-3 text-sm font-semibold transition has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                value === choice.value
                  ? "bg-foreground text-background"
                  : "bg-muted text-foreground hover:bg-muted/80"
              )}
            >
              <input
                type="radio"
                aria-label={`${label}: ${choice.label}`}
                name={option._id}
                value={choice.value}
                required={option.isRequired}
                checked={value === choice.value}
                onChange={() => onChange(choice.value)}
                className="sr-only"
              />
              <span>{choice.label}</span>
              {choice.priceDeltaCents > 0 && (
                <span
                  className={cn(
                    "ml-1.5 text-xs",
                    value === choice.value
                      ? "text-background/70"
                      : "text-muted-foreground"
                  )}
                >
                  +{formatPrice(choice.priceDeltaCents, currency)}
                </span>
              )}
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}

function QuantityControl({
  quantity,
  onChange,
}: {
  quantity: number
  onChange: (quantity: number) => void
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-[96px_1fr] sm:items-start">
      <div className="pt-2 text-sm font-medium">Quantity</div>
      <div className="inline-grid w-fit grid-cols-[44px_56px_44px] bg-muted">
        <button
          type="button"
          aria-label="Decrease quantity"
          disabled={quantity <= 1}
          onClick={() => onChange(Math.max(1, quantity - 1))}
          className="grid size-11 place-items-center transition outline-none hover:bg-muted/80 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40"
        >
          <MinusIcon className="size-4" />
        </button>
        <div className="grid h-11 place-items-center text-sm font-semibold">
          {quantity}
        </div>
        <button
          type="button"
          aria-label="Increase quantity"
          onClick={() => onChange(quantity + 1)}
          className="grid size-11 place-items-center transition outline-none hover:bg-muted/80 focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <PlusIcon className="size-4" />
        </button>
      </div>
    </div>
  )
}

function PersonalizationOptionControl({
  option,
  enabled,
  fieldValues,
  onToggle,
  onFieldChange,
  currency,
}: {
  option: PersonalizationProductOption
  enabled: boolean
  fieldValues: Record<string, string>
  onToggle: (enabled: boolean) => void
  onFieldChange: (fieldKey: string, value: string) => void
  currency: string
}) {
  const label = displayOptionLabel(option.label)
  const formatPrice = useMoneyFormatter()

  return (
    <div className="grid gap-3 sm:grid-cols-[96px_1fr] sm:items-start">
      <div className="pt-2 text-sm font-medium">{label}</div>
      <div className="space-y-3">
        {!option.isRequired && (
          <label
            className={cn(
              "inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center px-3 text-sm font-semibold transition has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
              enabled
                ? "bg-foreground text-background"
                : "bg-muted text-foreground hover:bg-muted/80"
            )}
          >
            <input
              type="checkbox"
              aria-label={`Add ${label}`}
              checked={enabled}
              onChange={(event) => onToggle(event.target.checked)}
              className="sr-only"
            />
            <span>+{formatPrice(option.priceDeltaCents, currency)}</span>
          </label>
        )}

        {option.isRequired && option.priceDeltaCents > 0 && (
          <div className="inline-flex min-h-11 min-w-11 items-center justify-center bg-muted px-3 text-sm font-semibold">
            +{formatPrice(option.priceDeltaCents, currency)}
          </div>
        )}

        {enabled && (
          <div className="grid max-w-sm gap-2 sm:grid-cols-2">
            {option.config.fields.map((field) => (
              <div key={field.key}>
                <Label
                  htmlFor={`${option._id}-${field.key}`}
                  className="sr-only"
                >
                  {field.label}
                </Label>
                <Input
                  id={`${option._id}-${field.key}`}
                  type={field.inputType}
                  required={field.required}
                  placeholder={field.label}
                  value={fieldValues[field.key] ?? ""}
                  className="h-9 rounded-none border-foreground/25 bg-background text-sm font-semibold"
                  onChange={(event) =>
                    onFieldChange(field.key, event.target.value)
                  }
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
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
