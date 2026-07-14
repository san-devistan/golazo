import { getErrorMessage } from "@/lib/shop"
import { toast } from "@workspace/ui/lib/toast"
import { useCallback } from "react"

import {
  assertCollectionLogoFile,
  assertProductImageCapacity,
  assertProductImageFile,
  prepareProductImageForUpload,
  uploadImageFileToCloudinary,
  uploadProductImageToCloudinary,
} from "./image-upload"
import { nullableText } from "./model"
import type { CategoryFormState, CategoryId, ProductFormState } from "./types"
import type {
  CreateCollectionLogoUploadSignature,
  CreateProductImageUploadSignature,
  SetBoolean,
  SetCategoryForm,
  SetProductForm,
} from "./workspace-action-types"

export function useWorkspaceUploadActions({
  categoryForm,
  createCloudinaryUploadSignature,
  createCollectionLogoUploadSignature,
  isUploading,
  productForm,
  setCategoryForm,
  setIsUploading,
  setProductForm,
}: {
  categoryForm: CategoryFormState | null
  createCloudinaryUploadSignature: CreateProductImageUploadSignature
  createCollectionLogoUploadSignature: CreateCollectionLogoUploadSignature
  isUploading: boolean
  productForm: ProductFormState | null
  setCategoryForm: SetCategoryForm
  setIsUploading: SetBoolean
  setProductForm: SetProductForm
}) {
  const handleUploadImages = useCallback(
    async (files: Array<File>) => {
      if (productForm) {
        await uploadProductImages({
          createCloudinaryUploadSignature,
          files,
          productForm,
          setIsUploading,
          setProductForm,
        })
      }
    },
    [
      createCloudinaryUploadSignature,
      productForm,
      setIsUploading,
      setProductForm,
    ]
  )
  const handleUploadCollectionLogo = useCallback(
    async (file: File) => {
      if (isUploading) {
        return
      }

      if (!categoryForm?.categoryId) {
        toast.error("Save the collection before uploading a logo.")
        return
      }

      await uploadCollectionLogo({
        categoryId: categoryForm.categoryId,
        createCollectionLogoUploadSignature,
        file,
        setCategoryForm,
        setIsUploading,
      })
    },
    [
      categoryForm,
      createCollectionLogoUploadSignature,
      isUploading,
      setCategoryForm,
      setIsUploading,
    ]
  )

  return { handleUploadCollectionLogo, handleUploadImages }
}

async function uploadProductImages({
  createCloudinaryUploadSignature,
  files,
  productForm,
  setIsUploading,
  setProductForm,
}: {
  createCloudinaryUploadSignature: CreateProductImageUploadSignature
  files: Array<File>
  productForm: ProductFormState
  setIsUploading: SetBoolean
  setProductForm: SetProductForm
}) {
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

async function uploadCollectionLogo({
  categoryId,
  createCollectionLogoUploadSignature,
  file,
  setCategoryForm,
  setIsUploading,
}: {
  categoryId: CategoryId
  createCollectionLogoUploadSignature: CreateCollectionLogoUploadSignature
  file: File
  setCategoryForm: SetCategoryForm
  setIsUploading: SetBoolean
}) {
  setIsUploading(true)

  try {
    assertCollectionLogoFile(file)
    const uploadSignature = await createCollectionLogoUploadSignature({
      categoryId,
    })
    const uploadedLogo = await uploadImageFileToCloudinary(
      file,
      uploadSignature
    )

    setCategoryForm((current) =>
      current ? { ...current, logoUrl: uploadedLogo.imageUrl } : current
    )
    toast.success("Logo uploaded to Cloudinary.")
  } catch (error) {
    toast.error(getErrorMessage(error))
  } finally {
    setIsUploading(false)
  }
}
