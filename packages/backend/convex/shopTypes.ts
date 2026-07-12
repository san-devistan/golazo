import type { Infer } from "convex/values"

import type { Doc, Id } from "./_generated/dataModel.d.ts"
import type {
  productImageWriteValidator,
  productMetadataWriteValidator,
  productOptionTemplateWriteValidator,
  productOptionWriteValidator,
  productStatusValidator,
  categoryKindValidator,
} from "./shopValidators"

export const DELETE_BATCH_SIZE = 200
export const CATEGORY_PAGE_CHILD_LIMIT = 60
export const CATEGORY_PAGE_PRODUCTS_PER_SECTION = 80
export const PRODUCT_IMAGE_LIMIT = 12
export const PRODUCT_STATUSES = ["draft", "published", "archived"] as const
export const CATEGORY_KINDS = ["collection", "group"] as const

export type CategoryKind = Infer<typeof categoryKindValidator>
export type ProductImageWrite = Infer<typeof productImageWriteValidator>
export type ProductOptionWrite = Infer<typeof productOptionWriteValidator>
export type ProductOptionConfig = ProductOptionWrite["config"]
export type ProductMetadataWrite = Infer<typeof productMetadataWriteValidator>
export type ProductOptionTemplateWrite = Infer<
  typeof productOptionTemplateWriteValidator
>
export type ProductStatus = Infer<typeof productStatusValidator>
export type CategoryId = Id<"catalogCategories">
export type ProductId = Id<"products">
export type ProductDoc = Doc<"products">
export type ProductOptionTemplateId = Id<"productOptionTemplates">

export type ProductUpsertArgs = {
  productId: ProductId | null
  categoryId: CategoryId
  name: string
  description: string
  basePriceCents: number
  currency: string
  status: ProductStatus
  sku: string | null
  cloudinaryAssetFolder: string | null
  sortOrder: number
  images: Array<ProductImageWrite>
  options: Array<ProductOptionWrite>
  metadata: Array<ProductMetadataWrite>
}

export type ProductDeletionPlan = {
  cloudinaryPublicIds: Array<string>
  cloudinaryAssetFolders: Array<string>
}

export type ProductUpsertResult = {
  productId: ProductId
  removedCloudinaryAssets: ProductDeletionPlan
}

export type CategoryDoc = {
  _id: CategoryId
  name: string
  slug: string
  kind?: CategoryKind
  parentId: CategoryId | null
  path: string
  depth: number
  logoUrl?: string | null
  cloudinaryFolder: string
  sortOrder: number
  isActive: boolean
  createdAt: number
  updatedAt: number
}

export type CategoryPlacement = {
  path: string
  depth: number
  cloudinaryFolder: string
}

export type NormalizedProductImage = {
  imageUrl: string
  cloudinaryPublicId: string | null
  cloudinaryAssetFolder: string | null
  sortOrder: number
}

export type ProductFields = {
  categoryId: CategoryId
  name: string
  slug: string
  description: string
  basePriceCents: number
  currency: string
  status: ProductStatus
  sku: string | null
  imageUrl: string | null
  cloudinaryPublicId: string | null
  cloudinaryAssetFolder: string | null
  sortOrder: number
  updatedAt: number
}
