import {
  MAX_PRODUCT_IMAGE_COUNT,
  MAX_PRODUCT_IMAGE_SIZE_BYTES,
  PRODUCT_IMAGE_PREPARATION_ENDPOINT,
  PRODUCT_IMAGE_TYPES,
  PRODUCT_IMAGE_UPLOAD_MIME_TYPE,
} from "./constants"
import { createLocalId } from "./model"
import type {
  CloudinaryUploadResponse,
  CloudinaryUploadSignature,
  ProductImageFormState,
  UploadedCloudinaryImage,
} from "./types"

export function isCloudinaryUploadResponse(
  value: unknown
): value is CloudinaryUploadResponse {
  if (!value || typeof value !== "object") {
    return false
  }

  const secureUrl = Reflect.get(value, "secure_url")
  const publicId = Reflect.get(value, "public_id")

  return typeof secureUrl === "string" && typeof publicId === "string"
}

export function assertProductImageFile(file: File) {
  if (!PRODUCT_IMAGE_TYPES.has(file.type)) {
    throw new Error("Upload a JPG, PNG, WebP, or AVIF image.")
  }

  if (file.size > MAX_PRODUCT_IMAGE_SIZE_BYTES) {
    throw new Error("Product images must be 10 MB or smaller.")
  }
}

export function assertCollectionLogoFile(file: File) {
  if (!PRODUCT_IMAGE_TYPES.has(file.type)) {
    throw new Error("Upload a JPG, PNG, WebP, or AVIF logo.")
  }

  if (file.size > MAX_PRODUCT_IMAGE_SIZE_BYTES) {
    throw new Error("Collection logos must be 10 MB or smaller.")
  }
}

export function assertProductImageCapacity(
  currentCount: number,
  uploadCount: number
) {
  if (currentCount + uploadCount > MAX_PRODUCT_IMAGE_COUNT) {
    throw new Error(
      `Products can have up to ${MAX_PRODUCT_IMAGE_COUNT} images.`
    )
  }
}

export async function prepareProductImageForUpload(file: File) {
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

export async function productImagePreparationError(response: Response) {
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

export function productImageUploadFileName(file: File) {
  const baseName = file.name.replace(/\.[^.]+$/, "").trim() || "product-image"

  return `${baseName}-background.webp`
}

export async function uploadImageFileToCloudinary(
  uploadFile: File,
  uploadSignature: CloudinaryUploadSignature
): Promise<UploadedCloudinaryImage> {
  const formData = new FormData()
  formData.append("file", uploadFile)
  formData.append("api_key", uploadSignature.apiKey)
  formData.append("allowed_formats", uploadSignature.allowedFormats)
  formData.append("timestamp", String(uploadSignature.timestamp))
  formData.append("signature", uploadSignature.signature)

  formData.append("asset_folder", uploadSignature.assetFolder)
  if (uploadSignature.publicId) {
    formData.append("public_id", uploadSignature.publicId)
  }
  if (uploadSignature.overwrite) {
    formData.append("overwrite", "true")
  }

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
    imageUrl: payload.secure_url,
    cloudinaryPublicId: payload.public_id,
    cloudinaryAssetFolder:
      payload.asset_folder ?? payload.folder ?? uploadSignature.assetFolder,
  }
}

export async function uploadProductImageToCloudinary(
  uploadFile: File,
  uploadSignature: CloudinaryUploadSignature
) {
  return {
    localId: createLocalId("image"),
    imageId: null,
    ...(await uploadImageFileToCloudinary(uploadFile, uploadSignature)),
  } satisfies ProductImageFormState
}

export function moveProductImageBefore(
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

export function moveProductImageByOffset(
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
