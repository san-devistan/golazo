import type { SetStateAction } from "react"

import type {
  CategoryFormState,
  CategoryId,
  CloudinaryUploadSignature,
  DeleteTarget,
  ProductFormState,
  ProductId,
} from "./types"

export type SetCategoryForm = (
  value: SetStateAction<CategoryFormState | null>
) => void
export type SetProductForm = (
  value: SetStateAction<ProductFormState | null>
) => void
export type SetDeleteTarget = (
  value: SetStateAction<DeleteTarget | null>
) => void
export type SetBoolean = (value: SetStateAction<boolean>) => void

export type CreateProductImageUploadSignature = (args: {
  productId: ProductId | null
  productAssetFolder: string | null
}) => Promise<CloudinaryUploadSignature>

export type CreateCollectionLogoUploadSignature = (args: {
  categoryId: CategoryId
}) => Promise<CloudinaryUploadSignature>
