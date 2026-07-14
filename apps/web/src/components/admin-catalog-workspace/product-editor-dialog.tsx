import {
  slugify,
  getErrorMessage,
  priceInputToCents,
  sortBySortOrder,
} from "@/lib/shop"
import { api } from "@workspace/backend/api"
import { toast } from "@workspace/ui/lib/toast"
import { useAction, useQuery } from "convex/react"
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import {
  EMPTY_ADMIN_CATEGORIES,
  EMPTY_OPTION_TEMPLATES,
  EMPTY_PRODUCT_RECORDS,
  AUTOSAVE_DELAY_MS,
} from "./constants"
import {
  assertProductImageCapacity,
  assertProductImageFile,
  prepareProductImageForUpload,
  uploadProductImageToCloudinary,
} from "./image-upload"
import {
  categoryKindForAdmin,
  nullableText,
  productFormAutosaveKey,
  productRecordToForm,
  productUpsertPayload,
} from "./model"
import { ProductDialog } from "./product-dialog"
import type {
  AdminCategory,
  AdminOptionTemplate,
  AdminProductRecord,
  CategoryKind,
  CloudinaryUploadSignature,
  ProductFormState,
  ProductId,
} from "./types"

type ProductFormDispatch = Dispatch<SetStateAction<ProductFormState | null>>

type UpsertProduct = (
  payload: ReturnType<typeof productUpsertPayload>
) => Promise<ProductId>

type CreateProductImageUploadSignature = (args: {
  productId: ProductId | null
  productAssetFolder: string | null
}) => Promise<CloudinaryUploadSignature>

type AdminCatalogQueryData =
  | {
      categories: Array<AdminCategory>
      optionTemplates: Array<AdminOptionTemplate>
      products: Array<AdminProductRecord>
    }
  | undefined

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
  const {
    productAssignableCategories,
    productRecord,
    productRecords,
    templates,
  } = useProductEditorCatalogData({
    data,
    productId,
  })
  const sourceProductId =
    isOpen && productRecord ? productRecord.product._id : null
  const initialProductForm =
    sourceProductId && productRecord ? productRecordToForm(productRecord) : null

  return (
    <ProductEditorDialogContent
      key={sourceProductId ?? "closed"}
      assignableCategories={productAssignableCategories}
      createCloudinaryUploadSignature={createCloudinaryUploadSignature}
      initialProductForm={initialProductForm}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      onSaved={onSaved}
      productRecord={productRecord}
      productRecords={productRecords}
      templates={templates}
      upsertProduct={upsertProduct}
    />
  )
}

function ProductEditorDialogContent({
  assignableCategories,
  createCloudinaryUploadSignature,
  initialProductForm,
  isOpen,
  onOpenChange,
  onSaved,
  productRecord,
  productRecords,
  templates,
  upsertProduct,
}: {
  assignableCategories: Array<AdminCategory>
  createCloudinaryUploadSignature: CreateProductImageUploadSignature
  initialProductForm: ProductFormState | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: (nextSlug: string) => void
  productRecord: AdminProductRecord | null
  productRecords: Array<AdminProductRecord>
  templates: Array<AdminOptionTemplate>
  upsertProduct: UpsertProduct
}) {
  const [productForm, setProductForm] = useState(initialProductForm)
  const [isUploading, setIsUploading] = useState(false)
  const lastSavedEditorProductKeyRef = useRef<string | null>(null)
  const savedProductSlugRef = useRef<string | null>(null)
  const handleChangeProductForm = useCallback(
    (value: SetStateAction<ProductFormState | null>) => {
      const nextValue = typeof value === "function" ? value(productForm) : value

      if (nextValue === null) {
        onOpenChange(false)
      }

      setProductForm(nextValue)
    },
    [onOpenChange, productForm]
  )
  const handleUploadImages = useProductEditorImageUpload({
    createCloudinaryUploadSignature,
    productForm,
    setIsUploading,
    setProductForm,
  })

  useProductEditorAutosave({
    lastSavedEditorProductKeyRef,
    productForm,
    productRecord,
    productRecords,
    savedProductSlugRef,
    setProductForm,
    templates,
    upsertProduct,
  })

  useEffect(() => {
    if (isOpen || !savedProductSlugRef.current) {
      return
    }

    onSaved?.(savedProductSlugRef.current)
    savedProductSlugRef.current = null
  }, [isOpen, onSaved])

  return (
    <ProductDialog
      form={isOpen ? productForm : null}
      templates={templates}
      assignableCategories={assignableCategories}
      isUploading={isUploading}
      onChange={handleChangeProductForm}
      onUploadImages={handleUploadImages}
    />
  )
}

function useProductEditorCatalogData({
  data,
  productId,
}: {
  data: AdminCatalogQueryData
  productId: ProductId
}) {
  const categories = data?.categories ?? EMPTY_ADMIN_CATEGORIES
  const templates = data?.optionTemplates ?? EMPTY_OPTION_TEMPLATES
  const productRecords = data?.products ?? EMPTY_PRODUCT_RECORDS
  const productRecord =
    productRecords.find((record) => record.product._id === productId) ?? null
  const currentCategory =
    categories.find(
      (category) => category._id === productRecord?.product.categoryId
    ) ?? null
  const currentCategoryKind = currentCategory
    ? categoryKindForAdmin(currentCategory, categories)
    : null
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
    () =>
      productEditorAssignableCategories({
        categories,
        childCategories,
        currentCategory,
        currentCategoryKind,
      }),
    [categories, childCategories, currentCategory, currentCategoryKind]
  )

  return {
    productAssignableCategories,
    productRecord,
    productRecords,
    templates,
  }
}

function productEditorAssignableCategories({
  categories,
  childCategories,
  currentCategory,
  currentCategoryKind,
}: {
  categories: Array<AdminCategory>
  childCategories: Array<AdminCategory>
  currentCategory: AdminCategory | null
  currentCategoryKind: CategoryKind | null
}) {
  if (!currentCategory) {
    return []
  }

  if (currentCategoryKind === "group") {
    return childCategories.filter(
      (category) => categoryKindForAdmin(category, categories) === "collection"
    )
  }

  return [currentCategory]
}

function useProductEditorImageUpload({
  createCloudinaryUploadSignature,
  productForm,
  setIsUploading,
  setProductForm,
}: {
  createCloudinaryUploadSignature: CreateProductImageUploadSignature
  productForm: ProductFormState | null
  setIsUploading: Dispatch<SetStateAction<boolean>>
  setProductForm: ProductFormDispatch
}) {
  return useCallback(
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
}

function useProductEditorAutosave({
  lastSavedEditorProductKeyRef,
  productForm,
  productRecord,
  productRecords,
  savedProductSlugRef,
  setProductForm,
  templates,
  upsertProduct,
}: {
  lastSavedEditorProductKeyRef: React.MutableRefObject<string | null>
  productForm: ProductFormState | null
  productRecord: AdminProductRecord | null
  productRecords: Array<AdminProductRecord>
  savedProductSlugRef: React.MutableRefObject<string | null>
  setProductForm: ProductFormDispatch
  templates: Array<AdminOptionTemplate>
  upsertProduct: UpsertProduct
}) {
  const saveProductEditorForm = useCallback(
    async (form: ProductFormState, key: string) => {
      try {
        const savedProductId = await upsertProduct(
          productUpsertPayload({ form, productRecords, templates })
        )
        const nextSlug = slugify(form.name)

        if (productRecord && nextSlug !== slugify(productRecord.product.name)) {
          savedProductSlugRef.current = nextSlug
        }

        lastSavedEditorProductKeyRef.current = key
        setProductForm((current) => {
          if (!current || productFormAutosaveKey(current) !== key) {
            return current
          }

          const nextForm = { ...current, productId: savedProductId }
          lastSavedEditorProductKeyRef.current =
            productFormAutosaveKey(nextForm)

          return nextForm
        })
      } catch (error) {
        toast.error(getErrorMessage(error))
      }
    },
    [
      lastSavedEditorProductKeyRef,
      productRecord,
      productRecords,
      savedProductSlugRef,
      setProductForm,
      templates,
      upsertProduct,
    ]
  )

  useEffect(() => {
    if (!productForm) {
      lastSavedEditorProductKeyRef.current = null
      return undefined
    }

    if (!productForm.categoryId || !productForm.name.trim()) {
      return undefined
    }

    try {
      priceInputToCents(productForm.basePrice)
    } catch {
      return undefined
    }

    const key = productFormAutosaveKey(productForm)
    if (lastSavedEditorProductKeyRef.current === key) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      void saveProductEditorForm(productForm, key)
    }, AUTOSAVE_DELAY_MS)

    return () => window.clearTimeout(timeoutId)
  }, [lastSavedEditorProductKeyRef, productForm, saveProductEditorForm])
}
