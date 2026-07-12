import type { Doc } from "./_generated/dataModel.d.ts"
import type { MutationCtx } from "./_generated/server"
import {
  assertUniqueKeys,
  normalizeMetadataInput,
  normalizeOptionInput,
  normalizeProductImages,
  normalizeRequiredText,
  productAssetFolderForWrite,
  productFieldsForWrite,
  removedProductImageCloudinaryPlan,
  savedProductAssetFolder,
  slugify,
} from "./shopNormalize"
import { getProductCollectionOrThrow } from "./shopQueryModel"
import {
  DELETE_BATCH_SIZE,
  type NormalizedProductImage,
  type ProductFields,
  type ProductId,
  type ProductImageWrite,
  type ProductMetadataWrite,
  type ProductOptionTemplateId,
  type ProductOptionWrite,
  type ProductUpsertArgs,
  type ProductUpsertResult,
} from "./shopTypes"

async function saveProductDocument(
  ctx: MutationCtx,
  {
    productId,
    fields,
    existingProduct,
    now,
  }: {
    productId: ProductId | null
    fields: ProductFields
    existingProduct: Doc<"products"> | null
    now: number
  }
) {
  if (productId === null) {
    return await ctx.db.insert("products", {
      ...fields,
      createdAt: now,
    })
  }

  if (!existingProduct) {
    throw new Error("Product not found.")
  }

  await ctx.db.patch(productId, fields)
  return productId
}

export async function patchProductOptionsForTemplate(
  ctx: MutationCtx,
  templateId: ProductOptionTemplateId,
  fields: {
    label: string
    key: string
    isRequired: boolean
    priceDeltaCents: number
    sortOrder: number
    config: ProductOptionWrite["config"]
  },
  now: number
) {
  const options = await ctx.db
    .query("productOptions")
    .withIndex("by_templateId", (q) => q.eq("templateId", templateId))
    .take(200)

  await Promise.all(
    options.map((option) =>
      ctx.db.patch(option._id, {
        label: fields.label,
        key: fields.key,
        isRequired: fields.isRequired,
        priceDeltaCents: fields.priceDeltaCents,
        sortOrder: fields.sortOrder,
        config: fields.config,
        updatedAt: now,
      })
    )
  )
}

export async function syncProductOptions(
  ctx: MutationCtx,
  productId: ProductId,
  options: Array<ProductOptionWrite>,
  now: number
) {
  const normalizedOptions = options.map(normalizeOptionInput)
  assertUniqueKeys(normalizedOptions, "Option")
  const existingOptions = await ctx.db
    .query("productOptions")
    .withIndex("by_productId_and_sortOrder", (q) =>
      q.eq("productId", productId)
    )
    .take(100)
  const retainedOptionIds = new Set(
    options.flatMap((option) =>
      option.optionId === null ? [] : [option.optionId]
    )
  )

  await Promise.all(
    existingOptions.flatMap((existingOption) =>
      retainedOptionIds.has(existingOption._id)
        ? []
        : [ctx.db.delete(existingOption._id)]
    )
  )
  await Promise.all(
    options.map(async (option, index) => {
      const normalizedOption = normalizedOptions[index]
      if (!normalizedOption) return

      if (option.optionId === null) {
        await ctx.db.insert("productOptions", {
          productId,
          ...normalizedOption,
          createdAt: now,
          updatedAt: now,
        })
        return
      }

      const existingOption = await ctx.db.get(option.optionId)
      if (!existingOption || existingOption.productId !== productId) {
        throw new Error("Option not found for this product.")
      }

      await ctx.db.patch(option.optionId, {
        ...normalizedOption,
        updatedAt: now,
      })
    })
  )
}

export async function syncProductMetadata(
  ctx: MutationCtx,
  productId: ProductId,
  metadata: Array<ProductMetadataWrite>,
  now: number
) {
  const normalizedMetadata = metadata.map(normalizeMetadataInput)
  assertUniqueKeys(normalizedMetadata, "Metadata")
  const existingMetadata = await ctx.db
    .query("productMetadata")
    .withIndex("by_productId_and_sortOrder", (q) =>
      q.eq("productId", productId)
    )
    .take(100)
  const retainedMetadataIds = new Set(
    metadata.flatMap((item) =>
      item.metadataId === null ? [] : [item.metadataId]
    )
  )

  await Promise.all(
    existingMetadata.flatMap((existingItem) =>
      retainedMetadataIds.has(existingItem._id)
        ? []
        : [ctx.db.delete(existingItem._id)]
    )
  )
  await Promise.all(
    metadata.map(async (item, index) => {
      const normalizedItem = normalizedMetadata[index]
      if (!normalizedItem) return

      if (item.metadataId === null) {
        await ctx.db.insert("productMetadata", {
          productId,
          ...normalizedItem,
          createdAt: now,
          updatedAt: now,
        })
        return
      }

      const existingItem = await ctx.db.get(item.metadataId)
      if (!existingItem || existingItem.productId !== productId) {
        throw new Error("Metadata not found for this product.")
      }

      await ctx.db.patch(item.metadataId, {
        ...normalizedItem,
        updatedAt: now,
      })
    })
  )
}

export async function syncProductImages({
  ctx,
  productId,
  existingProduct,
  images,
  normalizedImages,
  now,
}: {
  ctx: MutationCtx
  productId: ProductId
  existingProduct: Doc<"products"> | null
  images: Array<ProductImageWrite>
  normalizedImages: Array<NormalizedProductImage>
  now: number
}) {
  const existingImages = await ctx.db
    .query("productImages")
    .withIndex("by_productId_and_sortOrder", (q) =>
      q.eq("productId", productId)
    )
    .take(DELETE_BATCH_SIZE)
  const retainedImageIds = new Set(
    images.flatMap((image) => (image.imageId === null ? [] : [image.imageId]))
  )
  const removedCloudinaryAssets = removedProductImageCloudinaryPlan({
    existingProduct,
    existingImages,
    normalizedImages,
  })

  await Promise.all(
    existingImages.flatMap((existingImage) =>
      retainedImageIds.has(existingImage._id)
        ? []
        : [ctx.db.delete(existingImage._id)]
    )
  )
  await Promise.all(
    images.map(async (image, index) => {
      const normalizedImage = normalizedImages[index]
      if (!normalizedImage) return

      if (image.imageId === null) {
        await ctx.db.insert("productImages", {
          productId,
          ...normalizedImage,
          createdAt: now,
          updatedAt: now,
        })
        return
      }

      const existingImage = await ctx.db.get(image.imageId)
      if (!existingImage || existingImage.productId !== productId) {
        throw new Error("Image not found for this product.")
      }

      await ctx.db.patch(image.imageId, {
        ...normalizedImage,
        updatedAt: now,
      })
    })
  )

  return removedCloudinaryAssets
}

async function getExistingProductForWrite(
  ctx: MutationCtx,
  productId: ProductId | null
) {
  if (productId === null) return null
  const existingProduct = await ctx.db.get(productId)
  if (!existingProduct) throw new Error("Product not found.")
  return existingProduct
}

async function assertUniqueProductSlug(
  ctx: MutationCtx,
  { productId, slug }: { productId: ProductId | null; slug: string }
) {
  const duplicateProduct = await ctx.db
    .query("products")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique()

  if (duplicateProduct && duplicateProduct._id !== productId) {
    throw new Error("A product with this name already exists.")
  }
}

export async function upsertProductRecord(
  ctx: MutationCtx,
  args: ProductUpsertArgs
): Promise<ProductUpsertResult> {
  const now = Date.now()
  await getProductCollectionOrThrow(ctx, args.categoryId)
  const existingProduct = await getExistingProductForWrite(ctx, args.productId)
  const name = normalizeRequiredText("Product name", args.name)
  const slug = slugify(name)
  await assertUniqueProductSlug(ctx, { productId: args.productId, slug })
  const productAssetFolder = productAssetFolderForWrite({
    productId: args.productId,
    cloudinaryAssetFolder: args.cloudinaryAssetFolder,
  })
  const productImages = normalizeProductImages(args.images, productAssetFolder)
  const primaryImage = productImages[0] ?? null
  const productFields = productFieldsForWrite({
    args,
    name,
    now,
    primaryImage,
    productAssetFolder,
    slug,
  })
  const productId = await saveProductDocument(ctx, {
    productId: args.productId,
    fields: productFields,
    existingProduct,
    now,
  })
  await ctx.db.patch(productId, {
    cloudinaryAssetFolder: savedProductAssetFolder({
      productId,
      productAssetFolder,
      primaryImage,
    }),
    updatedAt: now,
  })
  const removedCloudinaryAssets = await syncProductImages({
    ctx,
    productId,
    existingProduct,
    images: args.images,
    normalizedImages: productImages,
    now,
  })
  await syncProductOptions(ctx, productId, args.options, now)
  await syncProductMetadata(ctx, productId, args.metadata, now)
  return { productId, removedCloudinaryAssets }
}
