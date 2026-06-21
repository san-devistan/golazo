const ROOT_CLOUDINARY_FOLDER = "golazo"
const PRODUCT_CLOUDINARY_FOLDER = `${ROOT_CLOUDINARY_FOLDER}/products`

function slugifyCloudinarySegment(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return slug || "item"
}

export function cloudinaryFolderForCatalogPath(path: string) {
  return `${ROOT_CLOUDINARY_FOLDER}/${path}`
}

export function cloudinaryFolderForProductId(productId: string) {
  return `${PRODUCT_CLOUDINARY_FOLDER}/${slugifyCloudinarySegment(productId)}`
}

export function cloudinaryFolderForProductUploadKey(uploadKey: string) {
  return `${PRODUCT_CLOUDINARY_FOLDER}/${slugifyCloudinarySegment(uploadKey)}`
}

export function isManagedProductCloudinaryFolder(folder: string) {
  return folder.startsWith(`${PRODUCT_CLOUDINARY_FOLDER}/`)
}
