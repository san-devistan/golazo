import { ShopStorefront } from "@/components/shop-storefront"
import { BASE_CURRENCY } from "@/lib/money"
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
import { buttonVariants } from "@workspace/ui/lib/button-variants"
import { toast } from "@workspace/ui/lib/toast"
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
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react"

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
const EMPTY_ADMIN_CATEGORIES: Array<AdminCategory> = []
const EMPTY_OPTION_TEMPLATES: Array<AdminOptionTemplate> = []
const EMPTY_ADMIN_PRODUCTS: Array<AdminProductRecord["product"]> = []

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

type ProductEditorFormState = {
  sourceProductId: ProductId | null
  form: ProductFormState | null
}

type AdminCatalogState = {
  categoryForm: CategoryFormState | null
  productForm: ProductFormState | null
  deleteTarget: DeleteTarget | null
  isDeleting: boolean
  isUploading: boolean
  showBackendSetupState: boolean
}

type AdminCatalogAction =
  | {
      type: "setCategoryForm"
      value: React.SetStateAction<CategoryFormState | null>
    }
  | {
      type: "setProductForm"
      value: React.SetStateAction<ProductFormState | null>
    }
  | {
      type: "setDeleteTarget"
      value: React.SetStateAction<DeleteTarget | null>
    }
  | {
      type: "setIsDeleting"
      value: React.SetStateAction<boolean>
    }
  | {
      type: "setIsUploading"
      value: React.SetStateAction<boolean>
    }
  | {
      type: "setShowBackendSetupState"
      value: React.SetStateAction<boolean>
    }

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
const INITIAL_ADMIN_CATALOG_STATE: AdminCatalogState = {
  categoryForm: null,
  productForm: null,
  deleteTarget: null,
  isDeleting: false,
  isUploading: false,
  showBackendSetupState: false,
}
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
    currency: BASE_CURRENCY,
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
    currency: BASE_CURRENCY,
    status: productVisibilityStatus(record.product.status),
    sku: record.product.sku ?? "",
    cloudinaryAssetFolder: productRecordCloudinaryAssetFolder(record),
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

function productRecordCloudinaryAssetFolder(record: AdminProductRecord) {
  return (
    sortBySortOrder(record.images).find((image) => image.cloudinaryAssetFolder)
      ?.cloudinaryAssetFolder ??
    record.product.cloudinaryAssetFolder ??
    ""
  )
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

function isStateUpdater<T>(
  value: React.SetStateAction<T>
): value is (current: T) => T {
  return typeof value === "function"
}

function resolveStateAction<T>(value: React.SetStateAction<T>, current: T): T {
  return isStateUpdater(value) ? value(current) : value
}

function adminCatalogReducer(
  state: AdminCatalogState,
  action: AdminCatalogAction
): AdminCatalogState {
  if (action.type === "setCategoryForm") {
    return {
      ...state,
      categoryForm: resolveStateAction(action.value, state.categoryForm),
    }
  }

  if (action.type === "setProductForm") {
    return {
      ...state,
      productForm: resolveStateAction(action.value, state.productForm),
    }
  }

  if (action.type === "setDeleteTarget") {
    return {
      ...state,
      deleteTarget: resolveStateAction(action.value, state.deleteTarget),
    }
  }

  if (action.type === "setIsDeleting") {
    return {
      ...state,
      isDeleting: resolveStateAction(action.value, state.isDeleting),
    }
  }

  if (action.type === "setIsUploading") {
    return {
      ...state,
      isUploading: resolveStateAction(action.value, state.isUploading),
    }
  }

  return {
    ...state,
    showBackendSetupState: resolveStateAction(
      action.value,
      state.showBackendSetupState
    ),
  }
}

export function AdminCatalogWorkspace({
  categoryId,
  categoryPath,
}: {
  categoryId?: CategoryId
  categoryPath?: string
}) {
  return useAdminCatalogWorkspaceElement({ categoryId, categoryPath })
}

function useAdminCatalogWorkspaceElement({
  categoryId,
  categoryPath,
}: {
  categoryId?: CategoryId
  categoryPath?: string
}) {
  const data = useQuery(api.shop.listAdmin)
  const upsertCategory = useMutation(api.shop.upsertCategory)
  const upsertProduct = useAction(api.cloudinary.upsertProduct)
  const deleteCategory = useAction(api.cloudinary.deleteCategory)
  const deleteProduct = useAction(api.cloudinary.deleteProduct)
  const reorderCategories = useMutation(api.shop.reorderCategories)
  const reorderProducts = useMutation(api.shop.reorderProducts)
  const setCategoryVisibility = useMutation(api.shop.setCategoryVisibility)
  const setProductVisibility = useMutation(api.shop.setProductVisibility)
  const createCloudinaryUploadSignature = useAction(
    api.cloudinary.createUploadSignature
  )
  const [catalogState, dispatchCatalog] = useReducer(
    adminCatalogReducer,
    INITIAL_ADMIN_CATALOG_STATE
  )
  const {
    categoryForm,
    deleteTarget,
    isDeleting,
    isUploading,
    productForm,
    showBackendSetupState,
  } = catalogState

  const setCategoryForm = useCallback(
    (value: React.SetStateAction<CategoryFormState | null>) => {
      dispatchCatalog({ type: "setCategoryForm", value })
    },
    []
  )

  const setProductForm = useCallback(
    (value: React.SetStateAction<ProductFormState | null>) => {
      dispatchCatalog({ type: "setProductForm", value })
    },
    []
  )

  const setDeleteTarget = useCallback(
    (value: React.SetStateAction<DeleteTarget | null>) => {
      dispatchCatalog({ type: "setDeleteTarget", value })
    },
    []
  )

  const setIsDeleting = useCallback((value: React.SetStateAction<boolean>) => {
    dispatchCatalog({ type: "setIsDeleting", value })
  }, [])

  const setIsUploading = useCallback((value: React.SetStateAction<boolean>) => {
    dispatchCatalog({ type: "setIsUploading", value })
  }, [])

  const setShowBackendSetupState = useCallback(
    (value: React.SetStateAction<boolean>) => {
      dispatchCatalog({ type: "setShowBackendSetupState", value })
    },
    []
  )

  const categories = data?.categories ?? EMPTY_ADMIN_CATEGORIES
  const templates = data?.optionTemplates ?? EMPTY_OPTION_TEMPLATES
  const currentCategory = resolveCurrentCategory({
    categories,
    categoryId,
    categoryPath,
  })
  const parentId = currentCategory?._id ?? null
  const childCategories = useMemo(
    () =>
      sortBySortOrder(
        categories.filter((category) => category.parentId === parentId)
      ),
    [categories, parentId]
  )
  const productRecords = data?.products ?? EMPTY_PRODUCT_RECORDS
  const pageCategoryIds = useMemo(
    () =>
      currentCategory
        ? new Set<CategoryId>([
            currentCategory._id,
            ...childCategories.map((category) => category._id),
          ])
        : new Set<CategoryId>(),
    [childCategories, currentCategory]
  )
  const pageProductRecords = useMemo(
    () =>
      sortProductRecords(
        productRecords.filter(
          (record) =>
            !currentCategory || pageCategoryIds.has(record.product.categoryId)
        )
      ),
    [currentCategory, pageCategoryIds, productRecords]
  )
  const directProductRecords = useMemo(
    () =>
      sortProductRecords(
        currentCategory
          ? productRecords.filter(
              (record) => record.product.categoryId === currentCategory._id
            )
          : EMPTY_PRODUCT_RECORDS
      ),
    [currentCategory, productRecords]
  )
  const canAddProduct = Boolean(currentCategory)
  const productRecordsById = useMemo(
    () => new Map(productRecords.map((record) => [record.product._id, record])),
    [productRecords]
  )
  const productAssignableCategories = useMemo(
    () => (currentCategory ? [currentCategory, ...childCategories] : []),
    [childCategories, currentCategory]
  )
  const pageProducts = useMemo(
    () => pageProductRecords.map((record) => record.product),
    [pageProductRecords]
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
  }, [data, setShowBackendSetupState])

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
  }, [data, productRecords, setProductForm])

  const handleSaveCategory = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
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
    },
    [categoryForm, childCategories.length, setCategoryForm, upsertCategory]
  )

  const handleSaveProduct = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
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
          currency: BASE_CURRENCY,
          status: productForm.status,
          sku: nullableText(productForm.sku),
          cloudinaryAssetFolder: nullableText(
            productForm.cloudinaryAssetFolder
          ),
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
    },
    [productForm, productRecords, setProductForm, templates, upsertProduct]
  )

  const handleReorderCategories = useCallback(
    async (orderedCategoryIds: Array<CategoryId>) => {
      try {
        await reorderCategories({
          parentId,
          orderedCategoryIds,
        })
        toast.success("Category order saved.")
      } catch (error) {
        toast.error(getErrorMessage(error))
      }
    },
    [parentId, reorderCategories]
  )

  const handleReorderProducts = useCallback(
    async (
      productCategoryId: CategoryId,
      orderedProductIds: Array<ProductId>
    ) => {
      try {
        await reorderProducts({
          categoryId: productCategoryId,
          orderedProductIds,
        })
        toast.success("Product order saved.")
      } catch (error) {
        toast.error(getErrorMessage(error))
      }
    },
    [reorderProducts]
  )

  const handleToggleCategoryVisibility = useCallback(
    async (category: AdminCategory) => {
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
    },
    [setCategoryVisibility]
  )

  const handleToggleProductVisibility = useCallback(
    async (product: AdminProductRecord["product"]) => {
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
    },
    [setProductVisibility]
  )

  const handleConfirmDelete = useCallback(async () => {
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
  }, [
    currentCategory?._id,
    deleteCategory,
    deleteProduct,
    deleteTarget,
    setDeleteTarget,
    setIsDeleting,
  ])

  const handleUploadImages = useCallback(
    async (files: Array<File>) => {
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
    },
    [
      createCloudinaryUploadSignature,
      productForm,
      setIsUploading,
      setProductForm,
    ]
  )

  const handleAddCategory = useCallback(() => {
    setCategoryForm(emptyCategoryForm(parentId, childCategories.length))
  }, [childCategories.length, parentId, setCategoryForm])
  const handleAddProduct = useCallback(() => {
    setProductForm(
      emptyProductForm(parentId, templates, directProductRecords.length)
    )
  }, [directProductRecords.length, parentId, setProductForm, templates])
  const handleEditCategory = useCallback(
    (category: AdminCategory) => {
      setCategoryForm({
        categoryId: category._id,
        name: category.name,
        parentId: category.parentId,
        sortOrder: String(category.sortOrder),
        isActive: category.isActive ?? true,
      })
    },
    [setCategoryForm]
  )
  const handleDeleteCategory = useCallback(
    (category: AdminCategory) => {
      setDeleteTarget({ type: "category", category })
    },
    [setDeleteTarget]
  )
  const handleToggleCategory = useCallback(
    (category: AdminCategory) => {
      void handleToggleCategoryVisibility(category)
    },
    [handleToggleCategoryVisibility]
  )
  const handleEditProduct = useCallback(
    (product: AdminProductRecord["product"]) => {
      const record = productRecordsById.get(product._id)
      if (record) {
        setProductForm(productRecordToForm(record))
      }
    },
    [productRecordsById, setProductForm]
  )
  const handleDeleteProduct = useCallback(
    (product: AdminProductRecord["product"]) => {
      setDeleteTarget({ type: "product", product })
    },
    [setDeleteTarget]
  )
  const handleToggleProduct = useCallback(
    (product: AdminProductRecord["product"]) => {
      void handleToggleProductVisibility(product)
    },
    [handleToggleProductVisibility]
  )
  const handleReorderCategoriesClick = useCallback(
    (orderedCategoryIds: Array<CategoryId>) => {
      void handleReorderCategories(orderedCategoryIds)
    },
    [handleReorderCategories]
  )
  const handleReorderProductsClick = useCallback(
    (productCategoryId: CategoryId, orderedProductIds: Array<ProductId>) => {
      void handleReorderProducts(productCategoryId, orderedProductIds)
    },
    [handleReorderProducts]
  )
  const handleCancelDelete = useCallback(() => {
    setDeleteTarget(null)
  }, [setDeleteTarget])
  const handleConfirmDeleteClick = useCallback(() => {
    void handleConfirmDelete()
  }, [handleConfirmDelete])

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
  return (
    <>
      <ShopStorefront
        mode="admin"
        categories={categories}
        currentCategory={currentCategory}
        childCategories={childCategories}
        products={pageProducts}
        title={currentCategory?.name}
        canAddProduct={canAddProduct}
        onAddCategory={handleAddCategory}
        onAddProduct={handleAddProduct}
        onEditCategory={handleEditCategory}
        onDeleteCategory={handleDeleteCategory}
        onToggleCategoryVisibility={handleToggleCategory}
        onEditProduct={handleEditProduct}
        onDeleteProduct={handleDeleteProduct}
        onToggleProductVisibility={handleToggleProduct}
        onReorderCategories={handleReorderCategoriesClick}
        onReorderProducts={handleReorderProductsClick}
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
        onCancel={handleCancelDelete}
        onConfirm={handleConfirmDeleteClick}
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
  const upsertProduct = useAction(api.cloudinary.upsertProduct)
  const createCloudinaryUploadSignature = useAction(
    api.cloudinary.createUploadSignature
  )
  const [productEditorForm, setProductEditorForm] =
    useState<ProductEditorFormState>({
      sourceProductId: null,
      form: null,
    })
  const [isUploading, setIsUploading] = useState(false)

  const categories = data?.categories ?? EMPTY_ADMIN_CATEGORIES
  const templates = data?.optionTemplates ?? EMPTY_OPTION_TEMPLATES
  const productRecords = data?.products ?? EMPTY_PRODUCT_RECORDS
  const productRecord =
    productRecords.find((record) => record.product._id === productId) ?? null
  const currentCategory =
    categories.find(
      (category) => category._id === productRecord?.product.categoryId
    ) ?? null
  const childCategories = useMemo(
    () =>
      currentCategory
        ? sortBySortOrder(
            categories.filter(
              (category) => category.parentId === currentCategory._id
            )
          )
        : EMPTY_ADMIN_CATEGORIES,
    [categories, currentCategory]
  )
  const productAssignableCategories = useMemo(
    () => (currentCategory ? [currentCategory, ...childCategories] : []),
    [childCategories, currentCategory]
  )
  const sourceProductId =
    isOpen && productRecord ? productRecord.product._id : null
  let productForm = productEditorForm.form

  if (productEditorForm.sourceProductId !== sourceProductId) {
    productForm =
      sourceProductId && productRecord
        ? productRecordToForm(productRecord)
        : null
    setProductEditorForm({
      sourceProductId,
      form: productForm,
    })
  }

  const handleChangeProductForm = useCallback(
    (value: React.SetStateAction<ProductFormState | null>) => {
      setProductEditorForm((current) => {
        const nextValue =
          typeof value === "function" ? value(current.form) : value

        if (nextValue === null) {
          onOpenChange(false)
        }

        return {
          sourceProductId: current.sourceProductId,
          form: nextValue,
        }
      })
    },
    [onOpenChange]
  )

  const handleSaveProduct = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
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
          currency: BASE_CURRENCY,
          status: productForm.status,
          sku: nullableText(productForm.sku),
          cloudinaryAssetFolder: nullableText(
            productForm.cloudinaryAssetFolder
          ),
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
        setProductEditorForm({
          sourceProductId: null,
          form: null,
        })
        onOpenChange(false)
        onSaved?.(slugify(productForm.name))
      } catch (error) {
        toast.error(getErrorMessage(error))
      }
    },
    [
      onOpenChange,
      onSaved,
      productForm,
      productRecords,
      templates,
      upsertProduct,
    ]
  )

  const handleUploadImages = useCallback(
    async (files: Array<File>) => {
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

        setProductEditorForm((current) => ({
          sourceProductId: current.sourceProductId,
          form: current.form
            ? {
                ...current.form,
                images: [...current.form.images, ...uploadedImages],
                cloudinaryAssetFolder: uploadSignature.assetFolder,
              }
            : current.form,
        }))
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
    },
    [createCloudinaryUploadSignature, productForm]
  )

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
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open && !isDeleting) {
        onCancel()
      }
    },
    [isDeleting, onCancel]
  )

  return (
    <AlertDialog open={target !== null} onOpenChange={handleOpenChange}>
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
      childCategories={EMPTY_ADMIN_CATEGORIES}
      products={EMPTY_ADMIN_PRODUCTS}
      title="Category unavailable"
      subtitle="This admin folder does not exist anymore."
    />
  )
}

function BackendSetupState() {
  const handleRetry = useCallback(() => {
    window.location.reload()
  }, [])

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
          <Button type="button" onClick={handleRetry}>
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
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        onChange(null)
      }
    },
    [onChange]
  )
  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      void onSubmit(event)
    },
    [onSubmit]
  )
  const handleNameChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange((current) =>
        current ? { ...current, name: event.target.value } : current
      )
    },
    [onChange]
  )

  return (
    <Dialog open={form !== null} onOpenChange={handleOpenChange}>
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
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="category-name">Category name</Label>
              <Input
                id="category-name"
                value={form.name}
                onChange={handleNameChange}
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
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        onChange(null)
      }
    },
    [onChange]
  )
  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      void onSubmit(event)
    },
    [onSubmit]
  )
  const handleMetadataChange = useCallback(
    (metadata: Array<ProductMetadataFormState>) => {
      onChange((current) => (current ? { ...current, metadata } : current))
    },
    [onChange]
  )

  return (
    <Dialog open={form !== null} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>
            {form?.productId ? "Edit product" : "Add product"}
          </DialogTitle>
        </DialogHeader>
        {form && (
          <form className="space-y-6" onSubmit={handleSubmit}>
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
              onChange={handleMetadataChange}
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
  const handleNameChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange((current) =>
        current ? { ...current, name: event.target.value } : current
      )
    },
    [onChange]
  )
  const handleCategoryChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedCategoryId = event.target.value

      onChange((current) => {
        const nextCategory = assignableCategories.find(
          (category) => category._id === selectedCategoryId
        )

        return current && nextCategory
          ? { ...current, categoryId: nextCategory._id }
          : current
      })
    },
    [assignableCategories, onChange]
  )
  const handleBasePriceChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange((current) =>
        current ? { ...current, basePrice: event.target.value } : current
      )
    },
    [onChange]
  )

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="product-name">Product name</Label>
        <Input
          id="product-name"
          value={form.name}
          onChange={handleNameChange}
          placeholder="PSG home jersey 2026"
        />
      </div>
      {assignableCategories.length > 1 && (
        <div className="space-y-2">
          <Label htmlFor="product-category">Placement</Label>
          <select
            id="product-category"
            aria-label="Product placement"
            value={form.categoryId ?? ""}
            onChange={handleCategoryChange}
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
        <Label htmlFor="product-price">Base price ({BASE_CURRENCY})</Label>
        <Input
          id="product-price"
          value={form.basePrice}
          onChange={handleBasePriceChange}
        />
        <p className="text-xs text-muted-foreground">
          Product prices are entered in EUR. Checkout uses the selected customer
          currency.
        </p>
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
  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? [])
      if (files.length > 0) {
        void onUploadImages(files)
      }
      event.target.value = ""
    },
    [onUploadImages]
  )

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
            onChange={handleFileChange}
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
            <ProductImageTile
              key={image.localId}
              image={image}
              index={index}
              imageCount={form.images.length}
              isUploading={isUploading}
              draggedImageLocalIdRef={draggedImageLocalIdRef}
              onChange={onChange}
            />
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

function ProductImageTile({
  image,
  index,
  imageCount,
  isUploading,
  draggedImageLocalIdRef,
  onChange,
}: {
  image: ProductImageFormState
  index: number
  imageCount: number
  isUploading: boolean
  draggedImageLocalIdRef: React.MutableRefObject<string | null>
  onChange: React.Dispatch<React.SetStateAction<ProductFormState | null>>
}) {
  const handleDragStart = useCallback(() => {
    draggedImageLocalIdRef.current = image.localId
  }, [draggedImageLocalIdRef, image.localId])
  const handleDragEnd = useCallback(() => {
    draggedImageLocalIdRef.current = null
  }, [draggedImageLocalIdRef])
  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
    },
    []
  )
  const handleDrop = useCallback(() => {
    const draggedImageLocalId = draggedImageLocalIdRef.current
    if (!draggedImageLocalId) return

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
  }, [draggedImageLocalIdRef, image.localId, onChange])
  const handleMoveUp = useCallback(() => {
    onChange((current) =>
      current
        ? {
            ...current,
            images: moveProductImageByOffset(current.images, index, -1),
          }
        : current
    )
  }, [index, onChange])
  const handleMoveDown = useCallback(() => {
    onChange((current) =>
      current
        ? {
            ...current,
            images: moveProductImageByOffset(current.images, index, 1),
          }
        : current
    )
  }, [index, onChange])
  const handleRemove = useCallback(() => {
    onChange((current) =>
      current
        ? {
            ...current,
            images: current.images.filter(
              (currentImage) => currentImage.localId !== image.localId
            ),
          }
        : current
    )
  }, [image.localId, onChange])

  return (
    <div
      draggable={!isUploading}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="group rounded-lg border bg-background p-2"
    >
      <div className="relative aspect-square overflow-hidden rounded-md bg-muted">
        <img src={image.imageUrl} alt="" className="size-full object-cover" />
        {index === 0 && (
          <Badge className="absolute top-2 left-2 shadow-sm">Primary</Badge>
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
            onClick={handleMoveUp}
          />
          <ProductImageOrderButton
            direction="down"
            disabled={index === imageCount - 1}
            onClick={handleMoveDown}
          />
          <ProductImageRemoveButton onClick={handleRemove} />
        </div>
      </div>
    </div>
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
  const activeTemplateIds = new Set(form.optionTemplateIds)

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
          {activeTemplates.map((template) => (
            <TemplateActivationItem
              key={template._id}
              template={template}
              checked={activeTemplateIds.has(template._id)}
              onChange={onChange}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function TemplateActivationItem({
  template,
  checked,
  onChange,
}: {
  template: AdminOptionTemplate
  checked: boolean
  onChange: React.Dispatch<React.SetStateAction<ProductFormState | null>>
}) {
  const label = displayOptionLabel(template.label)
  const description =
    template.config.type === "choice"
      ? template.config.choices.map((choice) => choice.label).join(", ")
      : `${formatPrice(template.priceDeltaCents, BASE_CURRENCY)} extra`
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange((current) => {
        if (!current) return current

        return {
          ...current,
          optionTemplateIds: event.target.checked
            ? [...current.optionTemplateIds, template._id]
            : current.optionTemplateIds.filter(
                (templateId) => templateId !== template._id
              ),
        }
      })
    },
    [onChange, template._id]
  )

  return (
    <label className="flex items-start gap-3 rounded-lg border p-3 text-sm">
      <input
        type="checkbox"
        aria-label={`Activate ${label}`}
        checked={checked}
        onChange={handleChange}
        className="mt-1 size-4"
      />
      <span>
        <span className="block font-medium">{label}</span>
        <span className="mt-1 block text-muted-foreground">{description}</span>
      </span>
    </label>
  )
}

function ProductMetadataForm({
  metadata,
  onChange,
}: {
  metadata: Array<ProductMetadataFormState>
  onChange: (metadata: Array<ProductMetadataFormState>) => void
}) {
  const handleAdd = useCallback(() => {
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
  }, [metadata, onChange])

  return (
    <section className="rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-medium">Metadata</h3>
          <p className="text-sm text-muted-foreground">
            Flexible product facts and links shown on product pages.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
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
            <ProductMetadataRow
              key={item.localId}
              item={item}
              index={index}
              metadata={metadata}
              onChange={onChange}
            />
          ))
        )}
      </div>
    </section>
  )
}

function ProductMetadataRow({
  item,
  index,
  metadata,
  onChange,
}: {
  item: ProductMetadataFormState
  index: number
  metadata: Array<ProductMetadataFormState>
  onChange: (metadata: Array<ProductMetadataFormState>) => void
}) {
  const handleLabelChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      updateMetadata(metadata, onChange, index, { label: event.target.value })
    },
    [index, metadata, onChange]
  )
  const handleTypeChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      updateMetadata(metadata, onChange, index, {
        type: metadataTypeFromValue(event.target.value),
      })
    },
    [index, metadata, onChange]
  )
  const handleValueChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      updateMetadata(metadata, onChange, index, { value: event.target.value })
    },
    [index, metadata, onChange]
  )
  const handleToggleVisibility = useCallback(() => {
    updateMetadata(metadata, onChange, index, {
      showOnProductPage: !item.showOnProductPage,
    })
  }, [index, item.showOnProductPage, metadata, onChange])
  const handleRemove = useCallback(() => {
    onChange(
      metadata.filter((currentItem) => currentItem.localId !== item.localId)
    )
  }, [item.localId, metadata, onChange])

  return (
    <div className="grid gap-3 rounded-lg border p-3 lg:grid-cols-[minmax(0,1fr)_8rem_minmax(0,1fr)_auto_auto] lg:items-center">
      <Input
        aria-label="Metadata label"
        value={item.label}
        placeholder="Label"
        onChange={handleLabelChange}
      />
      <select
        aria-label="Metadata type"
        value={item.type}
        onChange={handleTypeChange}
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
        onChange={handleValueChange}
      />
      <MetadataVisibilityButton
        isVisible={item.showOnProductPage}
        onClick={handleToggleVisibility}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        title="Remove metadata"
        aria-label="Remove metadata"
        onClick={handleRemove}
      >
        <Trash2Icon />
      </Button>
    </div>
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
