import { ShopStorefront } from "@/components/shop-storefront"
import {
  centsToPriceInput,
  formatPrice,
  getErrorMessage,
  priceInputToCents,
  sortBySortOrder,
} from "@/lib/shop"
import { Link } from "@tanstack/react-router"
/* eslint-disable complexity, jsx-a11y/label-has-associated-control, max-lines, max-lines-per-function, no-underscore-dangle, react-perf/jsx-no-new-array-as-prop, react-perf/jsx-no-new-function-as-prop */
import { api } from "@workspace/backend/api"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"
import { useAction, useMutation, useQuery } from "convex/react"
import type { GenericId } from "convex/values"
import { ImageUpIcon, PlusIcon, SaveIcon, Trash2Icon } from "lucide-react"
import { useEffect, useState } from "react"

type CategoryId = GenericId<"catalogCategories">
type ProductId = GenericId<"products">
type ProductOptionId = GenericId<"productOptions">
type ProductMetadataId = GenericId<"productMetadata">
type ProductOptionTemplateId = GenericId<"productOptionTemplates">
type ProductStatus = "draft" | "published" | "archived"

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

type AdminCategory = {
  _id: CategoryId
  name: string
  parentId: CategoryId | null
  path: string
  depth: number
  cloudinaryFolder: string
  sortOrder: number
  isActive: boolean
}

type AdminOptionTemplate = {
  _id: ProductOptionTemplateId
  kind: "choice" | "personalization"
  label: string
  key: string
  isRequired: boolean
  priceDeltaCents: number
  sortOrder: number
  isActive: boolean
  config: ChoiceConfig | PersonalizationConfig
}

type AdminOption = {
  _id: ProductOptionId
  templateId?: ProductOptionTemplateId
  label: string
  key: string
  isRequired: boolean
  priceDeltaCents: number
  sortOrder: number
  config: ChoiceConfig | PersonalizationConfig
}

type AdminMetadata = {
  _id: ProductMetadataId
  label: string
  key: string
  type: "text" | "number" | "boolean"
  value: string
  sortOrder: number
}

type AdminProductRecord = {
  product: {
    _id: ProductId
    categoryId: CategoryId
    name: string
    description: string
    basePriceCents: number
    currency: string
    status: ProductStatus
    sku: string | null
    imageUrl: string | null
    cloudinaryPublicId: string | null
    cloudinaryAssetFolder: string | null
    sortOrder?: number
  }
  options: Array<AdminOption>
  metadata: Array<AdminMetadata>
}

type CategoryFormState = {
  categoryId: CategoryId | null
  name: string
  parentId: CategoryId | null
  sortOrder: string
  isActive: boolean
}

type ProductMetadataFormState = {
  localId: string
  metadataId: ProductMetadataId | null
  label: string
  key: string
  type: "text" | "number" | "boolean"
  value: string
  sortOrder: string
}

type ProductFormState = {
  productId: ProductId | null
  categoryId: CategoryId | null
  name: string
  description: string
  basePrice: string
  currency: string
  status: ProductStatus
  sku: string
  imageUrl: string
  cloudinaryPublicId: string
  cloudinaryAssetFolder: string
  sortOrder: string
  optionTemplateIds: Array<ProductOptionTemplateId>
  optionIdsByTemplateId: Record<string, ProductOptionId>
  metadata: Array<ProductMetadataFormState>
}

type CloudinaryUploadResponse = {
  secure_url: string
  public_id: string
  asset_folder?: string
  folder?: string
}

function createLocalId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function nullableText(value: string) {
  const nextValue = value.trim()
  return nextValue ? nextValue : null
}

function parseSortOrder(value: string, fallback: number) {
  const parsedValue = Number.parseInt(value, 10)
  return Number.isFinite(parsedValue) ? parsedValue : fallback
}

function metadataTypeFromValue(value: string): "text" | "number" | "boolean" {
  if (value === "number" || value === "boolean") {
    return value
  }

  return "text"
}

function productStatusFromValue(value: string): ProductStatus {
  if (value === "published" || value === "archived") {
    return value
  }

  return "draft"
}

function emptyCategoryForm(
  parentId: CategoryId | null,
  sortOrder: number
): CategoryFormState {
  return {
    categoryId: null,
    name: "",
    parentId,
    sortOrder: String(sortOrder),
    isActive: true,
  }
}

function emptyProductForm(
  categoryId: CategoryId | null,
  templates: Array<AdminOptionTemplate>,
  sortOrder: number
): ProductFormState {
  return {
    productId: null,
    categoryId,
    name: "",
    description: "",
    basePrice: "89.00",
    currency: "EUR",
    status: "draft",
    sku: "",
    imageUrl: "",
    cloudinaryPublicId: "",
    cloudinaryAssetFolder: "",
    sortOrder: String(sortOrder),
    optionTemplateIds: templates.flatMap((template) =>
      template.isActive && template.isRequired ? [template._id] : []
    ),
    optionIdsByTemplateId: {},
    metadata: [],
  }
}

function productRecordToForm(record: AdminProductRecord): ProductFormState {
  const optionIdsByTemplateId = Object.fromEntries(
    record.options.flatMap((option) =>
      option.templateId ? [[option.templateId, option._id]] : []
    )
  ) as Record<string, ProductOptionId>

  return {
    productId: record.product._id,
    categoryId: record.product.categoryId,
    name: record.product.name,
    description: record.product.description,
    basePrice: centsToPriceInput(record.product.basePriceCents),
    currency: record.product.currency,
    status: record.product.status,
    sku: record.product.sku ?? "",
    imageUrl: record.product.imageUrl ?? "",
    cloudinaryPublicId: record.product.cloudinaryPublicId ?? "",
    cloudinaryAssetFolder: record.product.cloudinaryAssetFolder ?? "",
    sortOrder: String(record.product.sortOrder ?? 0),
    optionTemplateIds: record.options.flatMap((option) =>
      option.templateId ? [option.templateId] : []
    ),
    optionIdsByTemplateId,
    metadata: record.metadata.map((item) => ({
      localId: createLocalId("metadata"),
      metadataId: item._id,
      label: item.label,
      key: item.key,
      type: item.type,
      value: item.value,
      sortOrder: String(item.sortOrder),
    })),
  }
}

function isCloudinaryUploadResponse(
  value: unknown
): value is CloudinaryUploadResponse {
  if (!value || typeof value !== "object") {
    return false
  }

  const secureUrl = Reflect.get(value, "secure_url")
  const publicId = Reflect.get(value, "public_id")

  return typeof secureUrl === "string" && typeof publicId === "string"
}

function buildOptionsFromTemplates(
  form: ProductFormState,
  templates: Array<AdminOptionTemplate>
) {
  const activeTemplateIds = new Set(form.optionTemplateIds)

  return templates.flatMap((template, index) => {
    if (!template.isActive || !activeTemplateIds.has(template._id)) {
      return []
    }

    return [
      {
        optionId: form.optionIdsByTemplateId[template._id] ?? null,
        templateId: template._id,
        label: template.label,
        key: template.key,
        isRequired: template.isRequired,
        priceDeltaCents: template.priceDeltaCents,
        sortOrder: template.sortOrder || index,
        config: template.config,
      },
    ]
  })
}

function categoryBreadcrumbs(
  category: AdminCategory | null,
  categories: Array<AdminCategory>
) {
  if (!category) {
    return []
  }

  const parts = category.path.split("/")

  return parts.flatMap((_, index) => {
    const path = parts.slice(0, index + 1).join("/")
    const item = categories.find((candidate) => candidate.path === path)

    return item ? [item] : []
  })
}

function sortProductRecords(records: Array<AdminProductRecord>) {
  return Array.from(records).toSorted((first, second) => {
    const firstOrder = first.product.sortOrder ?? Number.MAX_SAFE_INTEGER
    const secondOrder = second.product.sortOrder ?? Number.MAX_SAFE_INTEGER

    if (firstOrder !== secondOrder) {
      return firstOrder - secondOrder
    }

    return first.product.name.localeCompare(second.product.name)
  })
}

export function AdminCatalogWorkspace({
  categoryId,
}: {
  categoryId?: CategoryId
}) {
  const data = useQuery(api.shop.listAdmin)
  const upsertCategory = useMutation(api.shop.upsertCategory)
  const upsertProduct = useMutation(api.shop.upsertProduct)
  const archiveProduct = useMutation(api.shop.archiveProduct)
  const reorderCategories = useMutation(api.shop.reorderCategories)
  const reorderProducts = useMutation(api.shop.reorderProducts)
  const createCloudinaryUploadSignature = useAction(
    api.cloudinary.createUploadSignature
  )
  const [categoryForm, setCategoryForm] = useState<CategoryFormState | null>(
    null
  )
  const [productForm, setProductForm] = useState<ProductFormState | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [showBackendSetupState, setShowBackendSetupState] = useState(false)

  const categories = data?.categories ?? []
  const templates = data?.optionTemplates ?? []
  const currentCategory =
    categoryId === undefined
      ? null
      : (categories.find((category) => category._id === categoryId) ?? null)
  const parentId = currentCategory?._id ?? null
  const childCategories = sortBySortOrder(
    categories.filter((category) => category.parentId === parentId)
  )
  const products = data?.products ?? []
  const leafProducts = sortProductRecords(
    currentCategory
      ? products.filter(
          (record) => record.product.categoryId === currentCategory._id
        )
      : []
  )
  const breadcrumbs = categoryBreadcrumbs(currentCategory, categories)
  const canAddProduct = Boolean(currentCategory && childCategories.length === 0)
  const productRecordsById = new Map(
    leafProducts.map((record) => [record.product._id, record])
  )

  useEffect(() => {
    if (data !== undefined) {
      setShowBackendSetupState(false)
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setShowBackendSetupState(true)
    }, 4000)

    return () => window.clearTimeout(timeoutId)
  }, [data])

  if (data === undefined) {
    if (showBackendSetupState) {
      return <BackendSetupState />
    }

    return (
      <main className="min-h-svh bg-muted p-6">
        <div className="mx-auto h-[42rem] max-w-7xl animate-pulse rounded-lg bg-background" />
      </main>
    )
  }

  async function handleSaveCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!categoryForm) {
      return
    }

    setErrorMessage(null)
    setStatusMessage(null)

    try {
      await upsertCategory({
        categoryId: categoryForm.categoryId,
        name: categoryForm.name,
        parentId: categoryForm.parentId,
        sortOrder: parseSortOrder(
          categoryForm.sortOrder,
          childCategories.length
        ),
        isActive: categoryForm.isActive,
      })
      setStatusMessage("Category saved.")
      setCategoryForm(null)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function handleSaveProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!productForm?.categoryId) {
      setErrorMessage("Select a category before saving the product.")
      return
    }

    setErrorMessage(null)
    setStatusMessage(null)

    try {
      await upsertProduct({
        productId: productForm.productId,
        categoryId: productForm.categoryId,
        name: productForm.name,
        description: productForm.description,
        basePriceCents: priceInputToCents(productForm.basePrice),
        currency: productForm.currency,
        status: productForm.status,
        sku: nullableText(productForm.sku),
        imageUrl: nullableText(productForm.imageUrl),
        cloudinaryPublicId: nullableText(productForm.cloudinaryPublicId),
        cloudinaryAssetFolder: nullableText(productForm.cloudinaryAssetFolder),
        sortOrder: parseSortOrder(productForm.sortOrder, leafProducts.length),
        options: buildOptionsFromTemplates(productForm, templates),
        metadata: productForm.metadata.map((item, index) => ({
          metadataId: item.metadataId,
          label: item.label,
          key: item.key,
          type: item.type,
          value: item.value,
          sortOrder: parseSortOrder(item.sortOrder, index),
        })),
      })
      setStatusMessage("Product saved.")
      setProductForm(null)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function handleReorderCategories(
    orderedCategoryIds: Array<CategoryId>
  ) {
    setErrorMessage(null)
    setStatusMessage(null)

    try {
      await reorderCategories({
        parentId,
        orderedCategoryIds,
      })
      setStatusMessage("Category order saved.")
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function handleReorderProducts(orderedProductIds: Array<ProductId>) {
    if (!currentCategory) {
      return
    }

    setErrorMessage(null)
    setStatusMessage(null)

    try {
      await reorderProducts({
        categoryId: currentCategory._id,
        orderedProductIds,
      })
      setStatusMessage("Product order saved.")
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function handleArchiveProduct(productId: ProductId) {
    setErrorMessage(null)
    setStatusMessage(null)

    try {
      await archiveProduct({ productId })
      setStatusMessage("Product archived.")
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function handleUploadImage(file: File) {
    if (!productForm) {
      return
    }

    setIsUploading(true)
    setErrorMessage(null)
    setStatusMessage(null)

    try {
      const assetFolder =
        productForm.cloudinaryAssetFolder || currentCategory?.cloudinaryFolder
      const uploadSignature = await createCloudinaryUploadSignature({
        assetFolder: assetFolder ?? null,
      })
      const formData = new FormData()
      formData.append("file", file)
      formData.append("api_key", uploadSignature.apiKey)
      formData.append("timestamp", String(uploadSignature.timestamp))
      formData.append("signature", uploadSignature.signature)

      if (uploadSignature.assetFolder) {
        formData.append("asset_folder", uploadSignature.assetFolder)
      }

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${uploadSignature.cloudName}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      )
      const payload: unknown = await response.json()

      if (!response.ok || !isCloudinaryUploadResponse(payload)) {
        throw new Error("Cloudinary upload failed.")
      }

      setProductForm((current) =>
        current
          ? {
              ...current,
              imageUrl: payload.secure_url,
              cloudinaryPublicId: payload.public_id,
              cloudinaryAssetFolder:
                payload.asset_folder ??
                payload.folder ??
                uploadSignature.assetFolder ??
                "",
            }
          : current
      )
      setStatusMessage("Image uploaded to Cloudinary.")
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <>
      <ShopStorefront
        mode="admin"
        categories={categories}
        currentCategory={currentCategory}
        childCategories={childCategories}
        products={leafProducts.map((record) => record.product)}
        breadcrumbs={breadcrumbs}
        title={currentCategory?.name ?? "Shop management"}
        subtitle={
          currentCategory
            ? currentCategory.cloudinaryFolder
            : "Manage the storefront exactly where customers browse it."
        }
        canAddProduct={canAddProduct}
        errorMessage={errorMessage}
        statusMessage={statusMessage}
        onAddCategory={() =>
          setCategoryForm(emptyCategoryForm(parentId, childCategories.length))
        }
        onAddProduct={() =>
          setProductForm(
            emptyProductForm(parentId, templates, leafProducts.length)
          )
        }
        onEditCategory={(category) =>
          setCategoryForm({
            categoryId: category._id,
            name: category.name,
            parentId: category.parentId,
            sortOrder: String(category.sortOrder),
            isActive: category.isActive ?? true,
          })
        }
        onEditProduct={(product) => {
          const record = productRecordsById.get(product._id)
          if (record) {
            setProductForm(productRecordToForm(record))
          }
        }}
        onArchiveProduct={(productId) => {
          void handleArchiveProduct(productId)
        }}
        onReorderCategories={(orderedCategoryIds) => {
          void handleReorderCategories(orderedCategoryIds)
        }}
        onReorderProducts={(orderedProductIds) => {
          void handleReorderProducts(orderedProductIds)
        }}
      />

      <CategoryDialog
        form={categoryForm}
        onChange={setCategoryForm}
        onSubmit={handleSaveCategory}
      />
      <ProductDialog
        form={productForm}
        templates={templates}
        selectedCategory={currentCategory}
        isUploading={isUploading}
        onChange={setProductForm}
        onUploadImage={handleUploadImage}
        onSubmit={handleSaveProduct}
      />
    </>
  )
}

function BackendSetupState() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted p-6">
      <section className="w-full max-w-xl rounded-lg border bg-background p-6">
        <p className="text-xs font-bold tracking-[0.18em] text-muted-foreground uppercase">
          Admin backend
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-normal">
          Convex functions are not deployed yet
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          The admin UI is connected to{" "}
          <code className="rounded bg-muted px-1.5 py-1">
            {import.meta.env.VITE_CONVEX_URL}
          </code>
          , but the shop functions are not available on that deployment yet.
          Deploy the Convex backend or switch the web app back to a local Convex
          URL.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button type="button" onClick={() => window.location.reload()}>
            Retry
          </Button>
          <Link
            to="/"
            className={buttonVariants({ variant: "outline", size: "default" })}
          >
            Back to shop
          </Link>
        </div>
      </section>
    </main>
  )
}

function CategoryDialog({
  form,
  onChange,
  onSubmit,
}: {
  form: CategoryFormState | null
  onChange: React.Dispatch<React.SetStateAction<CategoryFormState | null>>
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>
}) {
  return (
    <Dialog
      open={form !== null}
      onOpenChange={(open) => !open && onChange(null)}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {form?.categoryId ? "Edit category" : "Add category"}
          </DialogTitle>
          <DialogDescription>
            Categories are the folders customers and admins navigate through.
          </DialogDescription>
        </DialogHeader>
        {form && (
          <form
            className="space-y-4"
            onSubmit={(event) => void onSubmit(event)}
          >
            <div className="space-y-2">
              <Label htmlFor="category-name">Category name</Label>
              <Input
                id="category-name"
                value={form.name}
                onChange={(event) =>
                  onChange((current) =>
                    current ? { ...current, name: event.target.value } : current
                  )
                }
                placeholder="Ligue 1"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) =>
                  onChange((current) =>
                    current
                      ? { ...current, isActive: event.target.checked }
                      : current
                  )
                }
                className="size-4"
              />
              Visible in the store
            </label>
            <DialogFooter>
              <Button type="submit">
                <SaveIcon />
                Save category
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

function ProductDialog({
  form,
  templates,
  selectedCategory,
  isUploading,
  onChange,
  onUploadImage,
  onSubmit,
}: {
  form: ProductFormState | null
  templates: Array<AdminOptionTemplate>
  selectedCategory: AdminCategory | null
  isUploading: boolean
  onChange: React.Dispatch<React.SetStateAction<ProductFormState | null>>
  onUploadImage: (file: File) => Promise<void>
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>
}) {
  return (
    <Dialog
      open={form !== null}
      onOpenChange={(open) => !open && onChange(null)}
    >
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>
            {form?.productId ? "Edit product" : "Add product"}
          </DialogTitle>
          <DialogDescription>
            Product options come from Product settings. Activate only the
            options this jersey supports.
          </DialogDescription>
        </DialogHeader>
        {form && (
          <form
            className="space-y-6"
            onSubmit={(event) => void onSubmit(event)}
          >
            <ProductBasicsForm form={form} onChange={onChange} />
            <CloudinaryImageForm
              form={form}
              selectedCategory={selectedCategory}
              isUploading={isUploading}
              onChange={onChange}
              onUploadImage={onUploadImage}
            />
            <TemplateActivationForm
              form={form}
              templates={templates}
              onChange={onChange}
            />
            <ProductMetadataForm
              metadata={form.metadata}
              onChange={(metadata) =>
                onChange((current) =>
                  current ? { ...current, metadata } : current
                )
              }
            />
            <DialogFooter>
              <Button type="submit" size="lg">
                <SaveIcon />
                Save product
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

function ProductBasicsForm({
  form,
  onChange,
}: {
  form: ProductFormState
  onChange: React.Dispatch<React.SetStateAction<ProductFormState | null>>
}) {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="product-name">Product name</Label>
        <Input
          id="product-name"
          value={form.name}
          onChange={(event) =>
            onChange((current) =>
              current ? { ...current, name: event.target.value } : current
            )
          }
          placeholder="PSG home jersey 2026"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="product-price">Base price</Label>
        <Input
          id="product-price"
          value={form.basePrice}
          onChange={(event) =>
            onChange((current) =>
              current ? { ...current, basePrice: event.target.value } : current
            )
          }
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="product-currency">Currency</Label>
          <Input
            id="product-currency"
            value={form.currency}
            onChange={(event) =>
              onChange((current) =>
                current
                  ? { ...current, currency: event.target.value.toUpperCase() }
                  : current
              )
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="product-status">Status</Label>
          <select
            id="product-status"
            value={form.status}
            onChange={(event) =>
              onChange((current) =>
                current
                  ? {
                      ...current,
                      status: productStatusFromValue(event.target.value),
                    }
                  : current
              )
            }
            className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="product-sku">SKU</Label>
        <Input
          id="product-sku"
          value={form.sku}
          onChange={(event) =>
            onChange((current) =>
              current ? { ...current, sku: event.target.value } : current
            )
          }
          placeholder="PSG-HOME-2026"
        />
      </div>
      <div className="space-y-2 lg:col-span-2">
        <Label htmlFor="product-description">Description</Label>
        <Textarea
          id="product-description"
          value={form.description}
          onChange={(event) =>
            onChange((current) =>
              current
                ? { ...current, description: event.target.value }
                : current
            )
          }
          placeholder="Match jersey with breathable knit and embroidered crest."
        />
      </div>
    </section>
  )
}

function CloudinaryImageForm({
  form,
  selectedCategory,
  isUploading,
  onChange,
  onUploadImage,
}: {
  form: ProductFormState
  selectedCategory: AdminCategory | null
  isUploading: boolean
  onChange: React.Dispatch<React.SetStateAction<ProductFormState | null>>
  onUploadImage: (file: File) => Promise<void>
}) {
  return (
    <section className="rounded-lg border p-4">
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="font-medium">Image</h3>
          <p className="text-sm text-muted-foreground">
            Upload to the selected category folder or paste a Cloudinary CDN
            URL.
          </p>
        </div>
        <label className={buttonVariants({ variant: "outline", size: "sm" })}>
          <ImageUpIcon />
          {isUploading ? "Uploading" : "Upload"}
          <input
            type="file"
            aria-label="Upload product image"
            accept="image/*"
            className="sr-only"
            disabled={isUploading}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) {
                void onUploadImage(file)
              }
            }}
          />
        </label>
      </div>
      <div className="grid gap-4 lg:grid-cols-[180px_1fr]">
        <div className="aspect-square overflow-hidden rounded-lg bg-muted">
          {form.imageUrl ? (
            <img
              src={form.imageUrl}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
              No image
            </div>
          )}
        </div>
        <div className="grid gap-3">
          <div className="space-y-2">
            <Label htmlFor="product-image-url">CDN URL</Label>
            <Input
              id="product-image-url"
              value={form.imageUrl}
              onChange={(event) =>
                onChange((current) =>
                  current
                    ? { ...current, imageUrl: event.target.value }
                    : current
                )
              }
              placeholder="https://res.cloudinary.com/..."
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="product-public-id">Public ID</Label>
              <Input
                id="product-public-id"
                value={form.cloudinaryPublicId}
                onChange={(event) =>
                  onChange((current) =>
                    current
                      ? { ...current, cloudinaryPublicId: event.target.value }
                      : current
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-asset-folder">Asset folder</Label>
              <Input
                id="product-asset-folder"
                value={form.cloudinaryAssetFolder}
                onChange={(event) =>
                  onChange((current) =>
                    current
                      ? {
                          ...current,
                          cloudinaryAssetFolder: event.target.value,
                        }
                      : current
                  )
                }
                placeholder={selectedCategory?.cloudinaryFolder}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function TemplateActivationForm({
  form,
  templates,
  onChange,
}: {
  form: ProductFormState
  templates: Array<AdminOptionTemplate>
  onChange: React.Dispatch<React.SetStateAction<ProductFormState | null>>
}) {
  const activeTemplates = sortBySortOrder(
    templates.filter((template) => template.isActive)
  )

  return (
    <section className="rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-medium">Product options</h3>
          <p className="text-sm text-muted-foreground">
            Activate the shared options this jersey supports.
          </p>
        </div>
        <Link
          to="/admin/settings"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Settings
        </Link>
      </div>
      {activeTemplates.length === 0 ? (
        <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
          Create size and flocking options in Product settings first.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {activeTemplates.map((template) => {
            const checked = form.optionTemplateIds.includes(template._id)

            return (
              <label
                key={template._id}
                className="flex items-start gap-3 rounded-lg border p-3 text-sm"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) =>
                    onChange((current) => {
                      if (!current) {
                        return current
                      }

                      return {
                        ...current,
                        optionTemplateIds: event.target.checked
                          ? [...current.optionTemplateIds, template._id]
                          : current.optionTemplateIds.filter(
                              (templateId) => templateId !== template._id
                            ),
                      }
                    })
                  }
                  className="mt-1 size-4"
                />
                <span>
                  <span className="block font-medium">{template.label}</span>
                  <span className="mt-1 block text-muted-foreground">
                    {template.config.type === "choice"
                      ? template.config.choices
                          .map((choice) => choice.label)
                          .join(", ")
                      : `${formatPrice(template.priceDeltaCents, "EUR")} extra`}
                  </span>
                </span>
              </label>
            )
          })}
        </div>
      )}
    </section>
  )
}

function ProductMetadataForm({
  metadata,
  onChange,
}: {
  metadata: Array<ProductMetadataFormState>
  onChange: (metadata: Array<ProductMetadataFormState>) => void
}) {
  return (
    <section className="rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-medium">Metadata</h3>
          <p className="text-sm text-muted-foreground">
            Flexible product facts such as weight, season, material, or kit
            number.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onChange([
              ...metadata,
              {
                localId: createLocalId("metadata"),
                metadataId: null,
                label: "Weight",
                key: "weight",
                type: "text",
                value: "",
                sortOrder: String(metadata.length),
              },
            ])
          }
        >
          <PlusIcon />
          Add
        </Button>
      </div>
      <div className="space-y-3">
        {metadata.length === 0 ? (
          <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
            No metadata fields yet.
          </div>
        ) : (
          metadata.map((item, index) => (
            <div
              key={item.localId}
              className="grid gap-3 rounded-lg border p-3 lg:grid-cols-[1fr_1fr_120px_1fr_72px_auto]"
            >
              <Input
                value={item.label}
                placeholder="Label"
                onChange={(event) =>
                  updateMetadata(metadata, onChange, index, {
                    label: event.target.value,
                  })
                }
              />
              <Input
                value={item.key}
                placeholder="key"
                onChange={(event) =>
                  updateMetadata(metadata, onChange, index, {
                    key: event.target.value,
                  })
                }
              />
              <select
                value={item.type}
                onChange={(event) =>
                  updateMetadata(metadata, onChange, index, {
                    type: metadataTypeFromValue(event.target.value),
                  })
                }
                className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean</option>
              </select>
              <Input
                value={item.value}
                placeholder="Value"
                onChange={(event) =>
                  updateMetadata(metadata, onChange, index, {
                    value: event.target.value,
                  })
                }
              />
              <Input
                type="number"
                value={item.sortOrder}
                onChange={(event) =>
                  updateMetadata(metadata, onChange, index, {
                    sortOrder: event.target.value,
                  })
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                title="Remove metadata"
                onClick={() =>
                  onChange(
                    metadata.filter(
                      (currentItem) => currentItem.localId !== item.localId
                    )
                  )
                }
              >
                <Trash2Icon />
              </Button>
            </div>
          ))
        )}
      </div>
    </section>
  )
}

function updateMetadata(
  metadata: Array<ProductMetadataFormState>,
  onChange: (metadata: Array<ProductMetadataFormState>) => void,
  index: number,
  patch: Partial<ProductMetadataFormState>
) {
  onChange(
    metadata.map((item, itemIndex) =>
      itemIndex === index ? { ...item, ...patch } : item
    )
  )
}
