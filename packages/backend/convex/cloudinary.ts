"use node"

import { v } from "convex/values"
import { randomUUID } from "node:crypto"

import { internal } from "./_generated/api"
import type { Id } from "./_generated/dataModel.d.ts"
import { action } from "./_generated/server"
import {
  cloudinaryCredentials,
  deleteCloudinaryPlan,
  type CloudinaryDeletionPlan,
  signUploadParams,
} from "./cloudinaryAssets"
import {
  cloudinaryFolderForProductId,
  cloudinaryFolderForProductUploadKey,
  isManagedProductCloudinaryFolder,
} from "./cloudinaryFolders"
import { productUpsertArgsValidator } from "./shopValidators"

const IMAGE_UPLOAD_ALLOWED_FORMATS = "jpg,jpeg,png,webp,avif"

type ProductUpsertCloudinaryCleanupResult = {
  productId: Id<"products">
  removedCloudinaryAssets: CloudinaryDeletionPlan
}
type CloudinaryUploadSignature = {
  cloudName: string
  apiKey: string
  allowedFormats: string
  timestamp: number
  signature: string
  assetFolder: string
}

export const createUploadSignature = action({
  args: {
    productId: v.union(v.id("products"), v.null()),
    productAssetFolder: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args): Promise<CloudinaryUploadSignature> => {
    const { cloudName, apiKey, apiSecret } = cloudinaryCredentials()
    const existingFolder = args.productAssetFolder?.trim() ?? ""
    const productFolder: string | null = args.productId
      ? await ctx.runQuery(internal.shop.getProductCloudinaryUploadFolder, {
          productId: args.productId,
        })
      : null
    const assetFolder: string =
      productFolder ??
      (existingFolder && isManagedProductCloudinaryFolder(existingFolder)
        ? existingFolder
        : args.productId
          ? cloudinaryFolderForProductId(args.productId)
          : cloudinaryFolderForProductUploadKey(randomUUID()))
    const timestamp = Math.floor(Date.now() / 1000)
    const params: Record<string, number | string> = {
      allowed_formats: IMAGE_UPLOAD_ALLOWED_FORMATS,
      asset_folder: assetFolder,
      timestamp,
    }

    return {
      cloudName,
      apiKey,
      allowedFormats: IMAGE_UPLOAD_ALLOWED_FORMATS,
      timestamp,
      signature: signUploadParams(params, apiSecret),
      assetFolder,
    }
  },
})

export const upsertProduct = action({
  args: productUpsertArgsValidator,
  handler: async (ctx, args) => {
    const result: ProductUpsertCloudinaryCleanupResult = await ctx.runMutation(
      internal.shop.upsertProductRecordForCloudinaryCleanup,
      args
    )

    await deleteCloudinaryPlan(result.removedCloudinaryAssets)

    return result.productId
  },
})

export const deleteProduct = action({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const plan: CloudinaryDeletionPlan = await ctx.runQuery(
      internal.shop.getProductCloudinaryDeletionPlan,
      { productId: args.productId }
    )
    const result = await deleteCloudinaryPlan(plan)

    await ctx.runMutation(internal.shop.deleteProductRecord, {
      productId: args.productId,
    })

    return result
  },
})

export const deleteCategory = action({
  args: {
    categoryId: v.id("catalogCategories"),
  },
  handler: async (ctx, args) => {
    const plan: CloudinaryDeletionPlan = await ctx.runQuery(
      internal.shop.getCategoryCloudinaryDeletionPlan,
      { categoryId: args.categoryId }
    )
    const result = await deleteCloudinaryPlan(plan)

    await ctx.runMutation(internal.shop.deleteCategoryRecord, {
      categoryId: args.categoryId,
    })

    return result
  },
})
