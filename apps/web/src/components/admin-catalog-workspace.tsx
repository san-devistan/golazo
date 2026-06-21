import { ShopStorefront } from "@/components/shop-storefront"
import {
  centsToPriceInput,
  displayOptionLabel,
  formatPrice,
  getErrorMessage,
  priceInputToCents,
  slugify,
  sortBySortOrder,
} from "@/lib/shop"
import { Link } from "@tanstack/react-router"
/* eslint-disable complexity, max-lines, max-lines-per-function, no-underscore-dangle, react-perf/jsx-no-new-array-as-prop, react-perf/jsx-no-new-function-as-prop */
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
import { toast } from "@workspace/ui/components/sonner"
import { useAction, useMutation, useQuery } from "convex/react"
import type { GenericId } from "convex/values"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  EyeIcon,
  EyeOffIcon,
  GripVerticalIcon,
  ImageUpIcon,
  PlusIcon,
  SaveIcon,
  Trash2Icon,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

type CategoryId = GenericId<"catalogCategories">
type ProductId = GenericId<"products">
type ProductImageId = GenericId<"productImages">
type ProductOptionId = GenericId<"productOptions">
type ProductMetadataId = GenericId<"productMetadata">
type ProductOptionTemplateId = GenericId<"productOptionTemplates">
type ProductStatus = "draft" | "published"
type ProductRecordStatus = ProductStatus | "archived"
type ProductMetadataType = "text" | "number" | "boolean" | "link"

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
  type?: ProductMetadataType
  value: string
  linkUrl?: string | null
  showOnProductPage?: boolean
}

type AdminProductImage = {
  _id: ProductImageId
  imageUrl: string
  cloudinaryPublicId: string | null
  cloudinaryAssetFolder: string | null
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
    status: ProductRecordStatus
    sku: string | null
    imageUrl: string | null
    cloudinaryPublicId: string | null
    cloudinaryAssetFolder: string | null
    sortOrder?: number
  }
  images: Array<AdminProductImage>
  options: Array<AdminOption>
  metadata: Array<AdminMetadata>
}

const EMPTY_PRODUCT_RECORDS: Array<AdminProductRecord> = []

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
  type: ProductMetadataType
  value: string
  showOnProductPage: boolean
}

type ProductImageFormState = {
  localId: string
  imageId: ProductImageId | null
  imageUrl: string
  cloudinaryPublicId: string
  cloudinaryAssetFolder: string
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
  cloudinaryAssetFolder: string
  images: Array<ProductImageFormState>
  sortOrder: string
  optionTemplateIds: Array<ProductOptionTemplateId>
  optionIdsByTemplateId: Record<string, ProductOptionId>
  metadata: Array<ProductMetadataFormState>
}

type DeleteTarget =
  | { type: "category"; category: AdminCategory }
  | { type: "product"; product: AdminProductRecord["product"] }

type CloudinaryUploadResponse = {
  secure_url: string
  public_id: string
  asset_folder?: string
  folder?: string
}

type CloudinaryUploadSignature = {
  cloudName: string
  apiKey: string
  allowedFormats: string
  timestamp: number
  signature: string
  assetFolder: string
}

const PRODUCT_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/avif"
const PRODUCT_IMAGE_PREPARATION_ENDPOINT = "/api/products/image-background"
const PRODUCT_IMAGE_UPLOAD_MIME_TYPE = "image/webp"
const PRODUCT_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
])
const MAX_PRODUCT_IMAGE_SIZE_BYTES = 10 * 1024 * 1024
const MAX_PRODUCT_IMAGE_COUNT = 12

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

function productVisibilityStatus(status: ProductRecordStatus): ProductStatus {
  return status === "published" ? "published" : "draft"
}

function metadataTypeFromValue(value: string): ProductMetadataType {
  if (value === "number" || value === "boolean" || value === "link") {
    return value
  }

  return "text"
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
    status: "published",
    sku: "",
    cloudinaryAssetFolder: "",
    images: [],
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
    status: productVisibilityStatus(record.product.status),
    sku: record.product.sku ?? "",
    cloudinaryAssetFolder: record.product.cloudinaryAssetFolder ?? "",
    images: productRecordImagesToForm(record),
    sortOrder: String(record.product.sortOrder ?? 0),
    optionTemplateIds: record.options.flatMap((option) =>
      option.templateId ? [option.templateId] : []
    ),
    optionIdsByTemplateId,
    metadata: record.metadata.map((item) => ({
      localId: createLocalId("metadata"),
      metadataId: item._id,
      label: item.label,
      type: item.type ?? (item.linkUrl ? "link" : "text"),
      value: item.value,
      showOnProductPage: item.showOnProductPage ?? true,
    })),
  }
}

function productRecordImagesToForm(
  record: AdminProductRecord
): Array<ProductImageFormState> {
  const images =
    record.images.length > 0
      ? sortBySortOrder(record.images)
      : record.product.imageUrl
        ? [
            {
              _id: null,
              imageUrl: record.product.imageUrl,
              cloudinaryPublicId: record.product.cloudinaryPublicId,
              cloudinaryAssetFolder: record.product.cloudinaryAssetFolder,
              sortOrder: 0,
            },
          ]
        : []

  return images.map((image) => ({
    localId: createLocalId("image"),
    imageId: image._id,
    imageUrl: image.imageUrl,
    cloudinaryPublicId: image.cloudinaryPublicId ?? "",
    cloudinaryAssetFolder: image.cloudinaryAssetFolder ?? "",
  }))
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

function assertProductImageFile(file: File) {
  if (!PRODUCT_IMAGE_TYPES.has(file.type)) {
    throw new Error("Upload a JPG, PNG, WebP, or AVIF image.")
  }

  if (file.size > MAX_PRODUCT_IMAGE_SIZE_BYTES) {
    throw new Error("Product images must be 10 MB or smaller.")
  }
}

function assertProductImageCapacity(currentCount: number, uploadCount: number) {
  if (currentCount + uploadCount > MAX_PRODUCT_IMAGE_COUNT) {
    throw new Error(
      `Products can have up to ${MAX_PRODUCT_IMAGE_COUNT} images.`
    )
  }
}

async function prepareProductImageForUpload(file: File) {
  const formData = new FormData()
  formData.append("file", file)

  const response = await fetch(PRODUCT_IMAGE_PREPARATION_ENDPOINT, {
    body: formData,
    method: "POST",
  })

  if (!response.ok) {
    throw new Error(await productImagePreparationError(response))
  }

  const blob = await response.blob()

  if (blob.size === 0) {
    throw new Error("Prepared product image is empty.")
  }

  return new File([blob], productImageUploadFileName(file), {
    type: blob.type || PRODUCT_IMAGE_UPLOAD_MIME_TYPE,
  })
}

async function productImagePreparationError(response: Response) {
  try {
    const payload: unknown = await response.json()

    if (payload && typeof payload === "object") {
      const message = Reflect.get(payload, "error")

      if (typeof message === "string" && message.trim()) {
        return message
      }
    }
  } catch {
    return "Could not prepare the product image."
  }

  return "Could not prepare the product image."
}

function productImageUploadFileName(file: File) {
  const baseName = file.name.replace(/\.[^.]+$/, "").trim() || "product-image"

  return `${baseName}-background.webp`
}

async function uploadProductImageToCloudinary(
  uploadFile: File,
  uploadSignature: CloudinaryUploadSignature
) {
  const formData = new FormData()
  formData.append("file", uploadFile)
  formData.append("api_key", uploadSignature.apiKey)
  formData.append("allowed_formats", uploadSignature.allowedFormats)
  formData.append("timestamp", String(uploadSignature.timestamp))
  formData.append("signature", uploadSignature.signature)

  formData.append("asset_folder", uploadSignature.assetFolder)

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${uploadSignature.cloudName}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  )
  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok || !isCloudinaryUploadResponse(payload)) {
    throw new Error("Cloudinary upload failed.")
  }

  return {
    localId: createLocalId("image"),
    imageId: null,
    imageUrl: payload.secure_url,
    cloudinaryPublicId: payload.public_id,
    cloudinaryAssetFolder:
      payload.asset_folder ?? payload.folder ?? uploadSignature.assetFolder,
  } satisfies ProductImageFormState
}

function moveProductImageBefore(
  images: Array<ProductImageFormState>,
  draggedLocalId: string,
  targetLocalId: string
) {
  if (draggedLocalId === targetLocalId) {
    return images
  }

  const draggedImage = images.find((image) => image.localId === draggedLocalId)
  if (!draggedImage) {
    return images
  }

  const withoutDragged = images.filter(
    (image) => image.localId !== draggedLocalId
  )
  const targetIndex = withoutDragged.findIndex(
    (image) => image.localId === targetLocalId
  )

  if (targetIndex < 0) {
    return images
  }

  return [
    ...withoutDragged.slice(0, targetIndex),
    draggedImage,
    ...withoutDragged.slice(targetIndex),
  ]
}

function moveProductImageByOffset(
  images: Array<ProductImageFormState>,
  index: number,
  offset: number
) {
  const targetIndex = index + offset
  if (targetIndex < 0 || targetIndex >= images.length) {
    return images
  }

  const nextImages = Array.from(images)
  const [image] = nextImages.splice(index, 1)

  if (!image) {
    return images
  }

  nextImages.splice(targetIndex, 0, image)

  return nextImages
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
        label: displayOptionLabel(template.label),
        key: template.key,
        isRequired: template.isRequired,
        priceDeltaCents: template.priceDeltaCents,
        sortOrder: template.sortOrder || index,
        config: template.config,
      },
    ]
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
  categoryPath,
}: {
  categoryId?: CategoryId
  categoryPath?: string
}) {
  const data = useQuery(api.shop.listAdmin)
  const upsertCategory = useMutation(api.shop.upsertCategory)
  const upsertProduct = useMutation(api.shop.upsertProduct)
  const deleteCategory = useAction(api.cloudinary.deleteCategory)
  const deleteProduct = useAction(api.cloudinary.deleteProduct)
  const reorderCategories = useMutation(api.shop.reorderCategories)
  const reorderProducts = useMutation(api.shop.reorderProducts)
  const setCategoryVisibility = useMutation(api.shop.setCategoryVisibility)
  const setProductVisibility = useMutation(api.shop.setProductVisibility)
  const createCloudinaryUploadSignature = useAction(
    api.cloudinary.createUploadSignature
  )
  const [categoryForm, setCategoryForm] = useState<CategoryFormState | null>(
    null
  )
  const [productForm, setProductForm] = useState<ProductFormState | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [showBackendSetupState, setShowBackendSetupState] = useState(false)

  const categories = data?.categories ?? []
  const templates = data?.optionTemplates ?? []
  const currentCategory = resolveCurrentCategory({
    categories,
    categoryId,
    categoryPath,
  })
  const parentId = currentCategory?._id ?? null
  const childCategories = sortBySortOrder(
    categories.filter((category) => category.parentId === parentId)
  )
  const productRecords = data?.products ?? EMPTY_PRODUCT_RECORDS
  const pageCategoryIds = currentCategory
    ? new Set<CategoryId>([
        currentCategory._id,
        ...childCategories.map((category) => category._id),
      ])
    : new Set<CategoryId>()
  const pageProductRecords = sortProductRecords(
    productRecords.filter(
      (record) =>
        !currentCategory || pageCategoryIds.has(record.product.categoryId)
    )
  )
  const directProductRecords = sortProductRecords(
    currentCategory
      ? productRecords.filter(
          (record) => record.product.categoryId === currentCategory._id
        )
      : []
  )
  const canAddProduct = Boolean(currentCategory)
  const productRecordsById = useMemo(
    () => new Map(productRecords.map((record) => [record.product._id, record])),
    [productRecords]
  )
  const productAssignableCategories = currentCategory
    ? [currentCategory, ...childCategories]
    : []

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

  useEffect(() => {
    if (data === undefined) {
      return
    }

    const url = new URL(window.location.href)
    const editProductId = url.searchParams.get("editProduct")

    if (!editProductId) {
      return
    }

    const record = productRecords.find(
      (item) => item.product._id === editProductId
    )
    if (record) {
      setProductForm(productRecordToForm(record))
    }

    url.searchParams.delete("editProduct")
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`
    )
  }, [data, productRecords])

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

  if (categoryPath && !currentCategory) {
    return <AdminCategoryUnavailable categories={categories} />
  }

  async function handleSaveCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!categoryForm) {
      return
    }

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
      toast.success("Category saved.")
      setCategoryForm(null)
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  async function handleSaveProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!productForm?.categoryId) {
      toast.error("Select a category before saving the product.")
      return
    }

    try {
      const productSortFallback = productRecords.filter(
        (record) => record.product.categoryId === productForm.categoryId
      ).length

      await upsertProduct({
        productId: productForm.productId,
        categoryId: productForm.categoryId,
        name: productForm.name,
        description: productForm.description,
        basePriceCents: priceInputToCents(productForm.basePrice),
        currency: productForm.currency,
        status: productForm.status,
        sku: nullableText(productForm.sku),
        cloudinaryAssetFolder: null,
        sortOrder: parseSortOrder(productForm.sortOrder, productSortFallback),
        images: productForm.images.map((image, index) => ({
          imageId: image.imageId,
          imageUrl: image.imageUrl,
          cloudinaryPublicId: nullableText(image.cloudinaryPublicId),
          cloudinaryAssetFolder: nullableText(image.cloudinaryAssetFolder),
          sortOrder: index,
        })),
        options: buildOptionsFromTemplates(productForm, templates),
        metadata: productForm.metadata.map((item, index) => ({
          metadataId: item.metadataId,
          label: item.label,
          type: item.type,
          value: item.value,
          linkUrl: null,
          showOnProductPage: item.showOnProductPage,
          sortOrder: index,
        })),
      })
      toast.success("Product saved.")
      setProductForm(null)
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  async function handleReorderCategories(
    orderedCategoryIds: Array<CategoryId>
  ) {
    try {
      await reorderCategories({
        parentId,
        orderedCategoryIds,
      })
      toast.success("Category order saved.")
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  async function handleReorderProducts(
    productCategoryId: CategoryId,
    orderedProductIds: Array<ProductId>
  ) {
    try {
      await reorderProducts({
        categoryId: productCategoryId,
        orderedProductIds,
      })
      toast.success("Product order saved.")
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  async function handleToggleCategoryVisibility(category: AdminCategory) {
    const isActive = !(category.isActive ?? true)

    try {
      await setCategoryVisibility({
        categoryId: category._id,
        isActive,
      })
      toast.success(isActive ? "Category visible." : "Category hidden.")
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  async function handleToggleProductVisibility(
    product: AdminProductRecord["product"]
  ) {
    const status = product.status === "published" ? "draft" : "published"

    try {
      await setProductVisibility({
        productId: product._id,
        status,
      })
      toast.success(
        status === "published" ? "Product published." : "Product hidden."
      )
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) {
      return
    }

    setIsDeleting(true)

    try {
      if (deleteTarget.type === "category") {
        const parentHref = parentAdminHref(deleteTarget.category)

        await deleteCategory({ categoryId: deleteTarget.category._id })
        toast.success("Category deleted.")
        setDeleteTarget(null)

        if (currentCategory?._id === deleteTarget.category._id) {
          window.location.assign(parentHref)
        }

        return
      }

      await deleteProduct({ productId: deleteTarget.product._id })
      toast.success("Product deleted.")
      setDeleteTarget(null)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleUploadImages(files: Array<File>) {
    if (!productForm) {
      return
    }

    setIsUploading(true)

    try {
      assertProductImageCapacity(productForm.images.length, files.length)
      for (const file of files) {
        assertProductImageFile(file)
      }

      const uploadSignature = await createCloudinaryUploadSignature({
        productId: productForm.productId,
        productAssetFolder: nullableText(productForm.cloudinaryAssetFolder),
      })

      const uploadedImages = await Promise.all(
        files.map(async (file) => {
          const uploadFile = await prepareProductImageForUpload(file)

          return uploadProductImageToCloudinary(uploadFile, uploadSignature)
        })
      )

      setProductForm((current) =>
        current
          ? {
              ...current,
              images: [...current.images, ...uploadedImages],
              cloudinaryAssetFolder: uploadSignature.assetFolder,
            }
          : current
      )
      toast.success(
        uploadedImages.length === 1
          ? "Image uploaded to Cloudinary."
          : `${uploadedImages.length} images uploaded to Cloudinary.`
      )
    } catch (error) {
      toast.error(getErrorMessage(error))
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
        products={pageProductRecords.map((record) => record.product)}
        title={currentCategory?.name}
        canAddProduct={canAddProduct}
        onAddCategory={() =>
          setCategoryForm(emptyCategoryForm(parentId, childCategories.length))
        }
        onAddProduct={() =>
          setProductForm(
            emptyProductForm(parentId, templates, directProductRecords.length)
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
        onDeleteCategory={(category) => {
          setDeleteTarget({ type: "category", category })
        }}
        onToggleCategoryVisibility={(category) => {
          void handleToggleCategoryVisibility(category)
        }}
        onEditProduct={(product) => {
          const record = productRecordsById.get(product._id)
          if (record) {
            setProductForm(productRecordToForm(record))
          }
        }}
        onDeleteProduct={(product) => {
          setDeleteTarget({ type: "product", product })
        }}
        onToggleProductVisibility={(product) => {
          void handleToggleProductVisibility(product)
        }}
        onReorderCategories={(orderedCategoryIds) => {
          void handleReorderCategories(orderedCategoryIds)
        }}
        onReorderProducts={(productCategoryId, orderedProductIds) => {
          void handleReorderProducts(productCategoryId, orderedProductIds)
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
        assignableCategories={productAssignableCategories}
        isUploading={isUploading}
        onChange={setProductForm}
        onUploadImages={handleUploadImages}
        onSubmit={handleSaveProduct}
      />
      <DeleteConfirmationDialog
        target={deleteTarget}
        isDeleting={isDeleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          void handleConfirmDelete()
        }}
      />
    </>
  )
}

export function AdminProductEditorDialog({
  productId,
  isOpen,
  onOpenChange,
  onSaved,
}: {
  productId: ProductId
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: (nextSlug: string) => void
}) {
  const data = useQuery(api.shop.listAdmin)
  const upsertProduct = useMutation(api.shop.upsertProduct)
  const createCloudinaryUploadSignature = useAction(
    api.cloudinary.createUploadSignature
  )
  const [productForm, setProductForm] = useState<ProductFormState | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const categories = data?.categories ?? []
  const templates = data?.optionTemplates ?? []
  const productRecords = data?.products ?? EMPTY_PRODUCT_RECORDS
  const productRecord =
    productRecords.find((record) => record.product._id === productId) ?? null
  const currentCategory =
    categories.find(
      (category) => category._id === productRecord?.product.categoryId
    ) ?? null
  const childCategories = currentCategory
    ? sortBySortOrder(
        categories.filter(
          (category) => category.parentId === currentCategory._id
        )
      )
    : []
  const productAssignableCategories = currentCategory
    ? [currentCategory, ...childCategories]
    : []

  useEffect(() => {
    if (!isOpen) {
      setProductForm(null)
      return
    }

    if (productForm !== null || !productRecord) {
      return
    }

    setProductForm(productRecordToForm(productRecord))
  }, [isOpen, productForm, productRecord])

  function handleChangeProductForm(
    value: React.SetStateAction<ProductFormState | null>
  ) {
    setProductForm((current) => {
      const nextValue = typeof value === "function" ? value(current) : value

      if (nextValue === null) {
        onOpenChange(false)
      }

      return nextValue
    })
  }

  async function handleSaveProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!productForm?.categoryId) {
      toast.error("Select a category before saving the product.")
      return
    }

    try {
      const productSortFallback = productRecords.filter(
        (record) => record.product.categoryId === productForm.categoryId
      ).length

      await upsertProduct({
        productId: productForm.productId,
        categoryId: productForm.categoryId,
        name: productForm.name,
        description: productForm.description,
        basePriceCents: priceInputToCents(productForm.basePrice),
        currency: productForm.currency,
        status: productForm.status,
        sku: nullableText(productForm.sku),
        cloudinaryAssetFolder: null,
        sortOrder: parseSortOrder(productForm.sortOrder, productSortFallback),
        images: productForm.images.map((image, index) => ({
          imageId: image.imageId,
          imageUrl: image.imageUrl,
          cloudinaryPublicId: nullableText(image.cloudinaryPublicId),
          cloudinaryAssetFolder: nullableText(image.cloudinaryAssetFolder),
          sortOrder: index,
        })),
        options: buildOptionsFromTemplates(productForm, templates),
        metadata: productForm.metadata.map((item, index) => ({
          metadataId: item.metadataId,
          label: item.label,
          type: item.type,
          value: item.value,
          linkUrl: null,
          showOnProductPage: item.showOnProductPage,
          sortOrder: index,
        })),
      })
      toast.success("Product saved.")
      setProductForm(null)
      onOpenChange(false)
      onSaved?.(slugify(productForm.name))
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  async function handleUploadImages(files: Array<File>) {
    if (!productForm) {
      return
    }

    setIsUploading(true)

    try {
      assertProductImageCapacity(productForm.images.length, files.length)
      for (const file of files) {
        assertProductImageFile(file)
      }

      const uploadSignature = await createCloudinaryUploadSignature({
        productId: productForm.productId,
        productAssetFolder: nullableText(productForm.cloudinaryAssetFolder),
      })

      const uploadedImages = await Promise.all(
        files.map(async (file) => {
          const uploadFile = await prepareProductImageForUpload(file)

          return uploadProductImageToCloudinary(uploadFile, uploadSignature)
        })
      )

      setProductForm((current) =>
        current
          ? {
              ...current,
              images: [...current.images, ...uploadedImages],
              cloudinaryAssetFolder: uploadSignature.assetFolder,
            }
          : current
      )
      toast.success(
        uploadedImages.length === 1
          ? "Image uploaded to Cloudinary."
          : `${uploadedImages.length} images uploaded to Cloudinary.`
      )
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <ProductDialog
      form={isOpen ? productForm : null}
      templates={templates}
      assignableCategories={productAssignableCategories}
      isUploading={isUploading}
      onChange={handleChangeProductForm}
      onUploadImages={handleUploadImages}
      onSubmit={handleSaveProduct}
    />
  )
}

function parentAdminHref(category: AdminCategory) {
  const parentPath = category.path.split("/").slice(0, -1).join("/")

  return parentPath ? `/admin/${parentPath}` : "/admin"
}

function DeleteConfirmationDialog({
  target,
  isDeleting,
  onCancel,
  onConfirm,
}: {
  target: DeleteTarget | null
  isDeleting: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const isCategory = target?.type === "category"
  const name =
    target?.type === "category"
      ? target.category.name
      : (target?.product.name ?? "")

  return (
    <AlertDialog
      open={target !== null}
      onOpenChange={(open) => !open && !isDeleting && onCancel()}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete {isCategory ? "category" : "product"}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isCategory
              ? `This will hard delete "${name}", every sub-category, and all products stored under it from Convex and Cloudinary.`
              : `This will hard delete "${name}" and its images, options, and metadata from Convex and Cloudinary.`}
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

function resolveCurrentCategory({
  categories,
  categoryId,
  categoryPath,
}: {
  categories: Array<AdminCategory>
  categoryId?: CategoryId
  categoryPath?: string
}) {
  if (categoryId !== undefined) {
    return categories.find((category) => category._id === categoryId) ?? null
  }

  if (categoryPath) {
    return categories.find((category) => category.path === categoryPath) ?? null
  }

  return null
}

function AdminCategoryUnavailable({
  categories,
}: {
  categories: Array<AdminCategory>
}) {
  return (
    <ShopStorefront
      mode="admin"
      categories={categories}
      childCategories={[]}
      products={[]}
      title="Category unavailable"
      subtitle="This admin folder does not exist anymore."
    />
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
  assignableCategories,
  isUploading,
  onChange,
  onUploadImages,
  onSubmit,
}: {
  form: ProductFormState | null
  templates: Array<AdminOptionTemplate>
  assignableCategories: Array<AdminCategory>
  isUploading: boolean
  onChange: React.Dispatch<React.SetStateAction<ProductFormState | null>>
  onUploadImages: (files: Array<File>) => Promise<void>
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
        </DialogHeader>
        {form && (
          <form
            className="space-y-6"
            onSubmit={(event) => void onSubmit(event)}
          >
            <ProductBasicsForm
              form={form}
              assignableCategories={assignableCategories}
              onChange={onChange}
            />
            <CloudinaryImageForm
              form={form}
              isUploading={isUploading}
              onChange={onChange}
              onUploadImages={onUploadImages}
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
  assignableCategories,
  onChange,
}: {
  form: ProductFormState
  assignableCategories: Array<AdminCategory>
  onChange: React.Dispatch<React.SetStateAction<ProductFormState | null>>
}) {
  const currentCategory = assignableCategories[0]
  const subCategories = assignableCategories.slice(1)

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
      {assignableCategories.length > 1 && (
        <div className="space-y-2">
          <Label htmlFor="product-category">Placement</Label>
          <select
            id="product-category"
            value={form.categoryId ?? ""}
            onChange={(event) => {
              const selectedCategoryId = event.target.value

              onChange((current) => {
                const nextCategory = assignableCategories.find(
                  (category) => category._id === selectedCategoryId
                )

                return current && nextCategory
                  ? { ...current, categoryId: nextCategory._id }
                  : current
              })
            }}
            className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="" disabled>
              Select a category
            </option>
            {currentCategory && (
              <option value={currentCategory._id}>
                {currentCategory.name}
              </option>
            )}
            {subCategories.length > 0 && (
              <optgroup label="Sub-categories">
                {subCategories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
      )}
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
    </section>
  )
}

function CloudinaryImageForm({
  form,
  isUploading,
  onChange,
  onUploadImages,
}: {
  form: ProductFormState
  isUploading: boolean
  onChange: React.Dispatch<React.SetStateAction<ProductFormState | null>>
  onUploadImages: (files: Array<File>) => Promise<void>
}) {
  const draggedImageLocalIdRef = useRef<string | null>(null)

  return (
    <section className="rounded-lg border p-4">
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="font-medium">Images</h3>
        </div>
        <label className={buttonVariants({ variant: "outline", size: "sm" })}>
          <ImageUpIcon />
          {isUploading ? "Uploading" : "Upload images"}
          <input
            type="file"
            aria-label="Upload product images"
            accept={PRODUCT_IMAGE_ACCEPT}
            className="sr-only"
            disabled={isUploading}
            multiple
            onChange={(event) => {
              const files = Array.from(event.target.files ?? [])
              if (files.length > 0) {
                void onUploadImages(files)
              }
              event.target.value = ""
            }}
          />
        </label>
      </div>
      {form.images.length === 0 ? (
        <div className="flex min-h-40 items-center justify-center rounded-lg bg-muted px-4 text-center text-sm text-muted-foreground">
          No images
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {form.images.map((image, index) => (
            <div
              key={image.localId}
              draggable={!isUploading}
              onDragStart={() => {
                draggedImageLocalIdRef.current = image.localId
              }}
              onDragEnd={() => {
                draggedImageLocalIdRef.current = null
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                const draggedImageLocalId = draggedImageLocalIdRef.current
                if (!draggedImageLocalId) {
                  return
                }

                onChange((current) =>
                  current
                    ? {
                        ...current,
                        images: moveProductImageBefore(
                          current.images,
                          draggedImageLocalId,
                          image.localId
                        ),
                      }
                    : current
                )
                draggedImageLocalIdRef.current = null
              }}
              className="group rounded-lg border bg-background p-2"
            >
              <div className="relative aspect-square overflow-hidden rounded-md bg-muted">
                <img
                  src={image.imageUrl}
                  alt=""
                  className="size-full object-cover"
                />
                {index === 0 && (
                  <Badge className="absolute top-2 left-2 shadow-sm">
                    Primary
                  </Badge>
                )}
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <GripVerticalIcon className="size-3.5 shrink-0" />
                  <span>{index + 1}</span>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <ProductImageOrderButton
                    direction="up"
                    disabled={index === 0}
                    onClick={() =>
                      onChange((current) =>
                        current
                          ? {
                              ...current,
                              images: moveProductImageByOffset(
                                current.images,
                                index,
                                -1
                              ),
                            }
                          : current
                      )
                    }
                  />
                  <ProductImageOrderButton
                    direction="down"
                    disabled={index === form.images.length - 1}
                    onClick={() =>
                      onChange((current) =>
                        current
                          ? {
                              ...current,
                              images: moveProductImageByOffset(
                                current.images,
                                index,
                                1
                              ),
                            }
                          : current
                      )
                    }
                  />
                  <ProductImageRemoveButton
                    onClick={() =>
                      onChange((current) =>
                        current
                          ? {
                              ...current,
                              images: current.images.filter(
                                (currentImage) =>
                                  currentImage.localId !== image.localId
                              ),
                            }
                          : current
                      )
                    }
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-3 text-xs text-muted-foreground">
        {form.images.length}/{MAX_PRODUCT_IMAGE_COUNT} images
      </div>
    </section>
  )
}

function ProductImageOrderButton({
  direction,
  disabled,
  onClick,
}: {
  direction: "up" | "down"
  disabled: boolean
  onClick: () => void
}) {
  const Icon = direction === "up" ? ArrowUpIcon : ArrowDownIcon
  const label = direction === "up" ? "Move image up" : "Move image down"

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon />
    </Button>
  )
}

function ProductImageRemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      title="Remove image"
      aria-label="Remove image"
      onClick={onClick}
    >
      <Trash2Icon />
    </Button>
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
            Activate the shared options this product supports.
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
            const label = displayOptionLabel(template.label)

            return (
              <label
                key={template._id}
                className="flex items-start gap-3 rounded-lg border p-3 text-sm"
              >
                <input
                  type="checkbox"
                  aria-label={`Activate ${label}`}
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
                  <span className="block font-medium">{label}</span>
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
            Flexible product facts and links shown on product pages.
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
                label: "",
                type: "text",
                value: "",
                showOnProductPage: true,
              },
            ])
          }
        >
          <PlusIcon />
          Add
        </Button>
      </div>
      <div className="flex flex-col gap-3">
        {metadata.length === 0 ? (
          <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
            No metadata fields yet.
          </div>
        ) : (
          metadata.map((item, index) => (
            <div
              key={item.localId}
              className="grid gap-3 rounded-lg border p-3 lg:grid-cols-[minmax(0,1fr)_8rem_minmax(0,1fr)_auto_auto] lg:items-center"
            >
              <Input
                aria-label="Metadata label"
                value={item.label}
                placeholder="Label"
                onChange={(event) =>
                  updateMetadata(metadata, onChange, index, {
                    label: event.target.value,
                  })
                }
              />
              <select
                aria-label="Metadata type"
                value={item.type}
                onChange={(event) => {
                  updateMetadata(metadata, onChange, index, {
                    type: metadataTypeFromValue(event.target.value),
                  })
                }}
                className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean</option>
                <option value="link">Link</option>
              </select>
              <Input
                aria-label="Metadata value"
                type={item.type === "link" ? "url" : "text"}
                value={item.value}
                placeholder={item.type === "link" ? "https://..." : "Value"}
                onChange={(event) =>
                  updateMetadata(metadata, onChange, index, {
                    value: event.target.value,
                  })
                }
              />
              <MetadataVisibilityButton
                isVisible={item.showOnProductPage}
                onClick={() =>
                  updateMetadata(metadata, onChange, index, {
                    showOnProductPage: !item.showOnProductPage,
                  })
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                title="Remove metadata"
                aria-label="Remove metadata"
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

function MetadataVisibilityButton({
  isVisible,
  onClick,
}: {
  isVisible: boolean
  onClick: () => void
}) {
  const Icon = isVisible ? EyeIcon : EyeOffIcon
  const label = isVisible
    ? "Hide metadata on product page"
    : "Show metadata on product page"

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      title={label}
      aria-label={label}
      aria-pressed={isVisible}
      onClick={onClick}
    >
      <Icon />
    </Button>
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
