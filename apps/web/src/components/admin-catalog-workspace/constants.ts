import type {
  AdminCatalogState,
  AdminCategory,
  AdminOptionTemplate,
  AdminProductRecord,
} from "./types"

export const EMPTY_PRODUCT_RECORDS: Array<AdminProductRecord> = []
export const EMPTY_ADMIN_CATEGORIES: Array<AdminCategory> = []
export const EMPTY_OPTION_TEMPLATES: Array<AdminOptionTemplate> = []
export const EMPTY_ADMIN_PRODUCTS: Array<AdminProductRecord["product"]> = []

export const PRODUCT_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/avif"
export const PRODUCT_IMAGE_PREPARATION_ENDPOINT =
  "/api/products/image-background"
export const PRODUCT_IMAGE_UPLOAD_MIME_TYPE = "image/webp"
export const PRODUCT_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
])
export const INITIAL_ADMIN_CATALOG_STATE: AdminCatalogState = {
  categoryForm: null,
  productForm: null,
  deleteTarget: null,
  isDeleting: false,
  isUploading: false,
  showBackendSetupState: false,
}
export const AUTOSAVE_DELAY_MS = 500
export const MAX_PRODUCT_IMAGE_SIZE_BYTES = 10 * 1024 * 1024
export const MAX_PRODUCT_IMAGE_COUNT = 12
