import type { GenericId } from "convex/values"
import type { SetStateAction } from "react"

export type CategoryId = GenericId<"catalogCategories">
export type ProductId = GenericId<"products">
export type ProductImageId = GenericId<"productImages">
export type ProductOptionId = GenericId<"productOptions">
export type ProductMetadataId = GenericId<"productMetadata">
export type ProductOptionTemplateId = GenericId<"productOptionTemplates">
export type ProductStatus = "draft" | "published"
export type ProductRecordStatus = ProductStatus | "archived"
export type ProductMetadataType = "text" | "number" | "boolean" | "link"
export type CategoryKind = "collection" | "group"

export type ChoiceConfig = {
  type: "choice"
  choices: Array<{
    label: string
    value: string
    priceDeltaCents: number
  }>
}

export type PersonalizationConfig = {
  type: "personalization"
  fields: Array<{
    key: string
    label: string
    inputType: "text" | "number"
    required: boolean
  }>
}

export type AdminCategory = {
  _id: CategoryId
  name: string
  kind?: CategoryKind
  parentId: CategoryId | null
  path: string
  depth: number
  logoUrl?: string | null
  cloudinaryFolder: string
  sortOrder: number
  isActive: boolean
}

export type AdminOptionTemplate = {
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

export type AdminOption = {
  _id: ProductOptionId
  templateId?: ProductOptionTemplateId
  label: string
  key: string
  isRequired: boolean
  priceDeltaCents: number
  sortOrder: number
  config: ChoiceConfig | PersonalizationConfig
}

export type AdminMetadata = {
  _id: ProductMetadataId
  label: string
  type?: ProductMetadataType
  value: string
  linkUrl?: string | null
  showOnProductPage?: boolean
}

export type AdminProductImage = {
  _id: ProductImageId
  imageUrl: string
  cloudinaryPublicId: string | null
  cloudinaryAssetFolder: string | null
  sortOrder: number
}

export type AdminProductRecord = {
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

export type CategoryFormState = {
  categoryId: CategoryId | null
  kind: CategoryKind
  name: string
  logoUrl: string
  parentId: CategoryId | null
  sortOrder: string
  isActive: boolean
}

export type ProductMetadataFormState = {
  localId: string
  metadataId: ProductMetadataId | null
  label: string
  type: ProductMetadataType
  value: string
  showOnProductPage: boolean
}

export type ProductImageFormState = {
  localId: string
  imageId: ProductImageId | null
  imageUrl: string
  cloudinaryPublicId: string
  cloudinaryAssetFolder: string
}

export type ProductFormState = {
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

export type DeleteTarget =
  | { type: "category"; category: AdminCategory }
  | { type: "product"; product: AdminProductRecord["product"] }

export type ProductEditorFormState = {
  sourceProductId: ProductId | null
  form: ProductFormState | null
}

export type AdminCatalogState = {
  categoryForm: CategoryFormState | null
  productForm: ProductFormState | null
  deleteTarget: DeleteTarget | null
  isDeleting: boolean
  isUploading: boolean
  showBackendSetupState: boolean
}

export type AdminCatalogAction =
  | {
      type: "setCategoryForm"
      value: SetStateAction<CategoryFormState | null>
    }
  | {
      type: "setProductForm"
      value: SetStateAction<ProductFormState | null>
    }
  | {
      type: "setDeleteTarget"
      value: SetStateAction<DeleteTarget | null>
    }
  | {
      type: "setIsDeleting"
      value: SetStateAction<boolean>
    }
  | {
      type: "setIsUploading"
      value: SetStateAction<boolean>
    }
  | {
      type: "setShowBackendSetupState"
      value: SetStateAction<boolean>
    }

export type CloudinaryUploadResponse = {
  secure_url: string
  public_id: string
  asset_folder?: string
  folder?: string
}

export type CloudinaryUploadSignature = {
  cloudName: string
  apiKey: string
  allowedFormats: string
  timestamp: number
  signature: string
  assetFolder: string
  publicId?: string
  overwrite?: boolean
}

export type UploadedCloudinaryImage = {
  imageUrl: string
  cloudinaryPublicId: string
  cloudinaryAssetFolder: string
}
