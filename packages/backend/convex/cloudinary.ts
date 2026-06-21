"use node"

/* eslint-disable no-await-in-loop */

import { v } from "convex/values"
import { createHash, randomUUID } from "node:crypto"

import { internal } from "./_generated/api"
import { action } from "./_generated/server"
import {
  cloudinaryFolderForProductId,
  cloudinaryFolderForProductUploadKey,
  isManagedProductCloudinaryFolder,
} from "./cloudinaryFolders"

const IMAGE_UPLOAD_ALLOWED_FORMATS = "jpg,jpeg,png,webp,avif"
const CLOUDINARY_SEARCH_PAGE_SIZE = 500

type CloudinaryCredentials = {
  cloudName: string
  apiKey: string
  apiSecret: string
}

type CloudinaryDeletionPlan = {
  cloudinaryPublicIds: Array<string>
  cloudinaryAssetFolders: Array<string>
}

function requiredEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Set ${name} in the backend Convex environment.`)
  }

  return value
}

function signUploadParams(
  params: Record<string, number | string>,
  apiSecret: string
) {
  const entries: Array<[string, number | string]> = Object.entries(
    params
  ).filter(([, value]) => String(value).length > 0)

  entries.sort(([firstKey], [secondKey]) => firstKey.localeCompare(secondKey))

  const payload = entries.map(([key, value]) => `${key}=${value}`).join("&")

  return createHash("sha1").update(`${payload}${apiSecret}`).digest("hex")
}

function cloudinaryCredentials(): CloudinaryCredentials {
  return {
    cloudName: requiredEnv("CLOUDINARY_CLOUD_NAME"),
    apiKey: requiredEnv("CLOUDINARY_API_KEY"),
    apiSecret: requiredEnv("CLOUDINARY_API_SECRET"),
  }
}

function cloudinaryBasicAuthHeader({
  apiKey,
  apiSecret,
}: CloudinaryCredentials) {
  return `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}`
}

function uniqueNonEmptyValues(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values.flatMap((value) => {
        const nextValue = value?.trim() ?? ""
        return nextValue ? [nextValue] : []
      })
    )
  )
}

function escapeSearchValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function stringField(value: Record<string, unknown>, field: string) {
  const fieldValue = value[field]
  return typeof fieldValue === "string" ? fieldValue : null
}

function isDeletableFolder(folder: string) {
  return folder !== "golazo" && folder !== "golazo/products"
}

async function readCloudinaryJson(response: Response) {
  return await response.json().catch(() => null)
}

async function throwCloudinaryError(response: Response, fallback: string) {
  const payload = await readCloudinaryJson(response)
  const message =
    isRecord(payload) && isRecord(payload.error)
      ? stringField(payload.error, "message")
      : null

  throw new Error(message ?? fallback)
}

async function searchAssetFolderImagePublicIds(
  credentials: CloudinaryCredentials,
  folder: string
) {
  const publicIds: Array<string> = []
  let nextCursor: string | null = null

  do {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${credentials.cloudName}/resources/search`,
      {
        method: "POST",
        headers: {
          Authorization: cloudinaryBasicAuthHeader(credentials),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          expression: `resource_type:image AND asset_folder="${escapeSearchValue(folder)}"`,
          max_results: CLOUDINARY_SEARCH_PAGE_SIZE,
          ...(nextCursor ? { next_cursor: nextCursor } : {}),
        }),
      }
    )

    if (!response.ok) {
      await throwCloudinaryError(
        response,
        `Cloudinary search failed for folder "${folder}".`
      )
    }

    const payload: unknown = await response.json()
    const resources = isRecord(payload) ? payload.resources : null
    if (Array.isArray(resources)) {
      for (const resource of resources) {
        if (!isRecord(resource)) {
          continue
        }

        const publicId = stringField(resource, "public_id")
        if (publicId) {
          publicIds.push(publicId)
        }
      }
    }

    nextCursor = isRecord(payload) ? stringField(payload, "next_cursor") : null
  } while (nextCursor)

  return publicIds
}

async function destroyCloudinaryImage(
  credentials: CloudinaryCredentials,
  publicId: string
) {
  const timestamp = Math.floor(Date.now() / 1000)
  const params: Record<string, number | string> = {
    invalidate: "true",
    public_id: publicId,
    timestamp,
  }
  const formData = new FormData()

  formData.append("api_key", credentials.apiKey)
  formData.append("invalidate", "true")
  formData.append("public_id", publicId)
  formData.append("timestamp", String(timestamp))
  formData.append("signature", signUploadParams(params, credentials.apiSecret))

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${credentials.cloudName}/image/destroy`,
    {
      method: "POST",
      body: formData,
    }
  )

  if (!response.ok) {
    await throwCloudinaryError(
      response,
      `Cloudinary delete failed for asset "${publicId}".`
    )
  }
}

async function deleteCloudinaryFolder(
  credentials: CloudinaryCredentials,
  folder: string
) {
  if (!isDeletableFolder(folder)) {
    return false
  }

  const folderPath = folder.split("/").map(encodeURIComponent).join("/")
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${credentials.cloudName}/folders/${folderPath}`,
    {
      method: "DELETE",
      headers: {
        Authorization: cloudinaryBasicAuthHeader(credentials),
      },
    }
  )

  if (response.status === 404) {
    return false
  }

  if (!response.ok) {
    await throwCloudinaryError(
      response,
      `Cloudinary folder delete failed for "${folder}".`
    )
  }

  return true
}

async function deleteCloudinaryPlan(plan: CloudinaryDeletionPlan) {
  const credentials = cloudinaryCredentials()
  const folders = uniqueNonEmptyValues(plan.cloudinaryAssetFolders)
  folders.sort(
    (first: string, second: string) =>
      second.split("/").length - first.split("/").length
  )
  const folderPublicIds: Array<string> = []

  for (const folder of folders) {
    folderPublicIds.push(
      ...(await searchAssetFolderImagePublicIds(credentials, folder))
    )
  }

  const publicIds = uniqueNonEmptyValues([
    ...plan.cloudinaryPublicIds,
    ...folderPublicIds,
  ])

  for (const publicId of publicIds) {
    await destroyCloudinaryImage(credentials, publicId)
  }

  let deletedFolderCount = 0
  for (const folder of folders) {
    if (await deleteCloudinaryFolder(credentials, folder)) {
      deletedFolderCount += 1
    }
  }

  return {
    deletedAssetCount: publicIds.length,
    deletedFolderCount,
  }
}

export const createUploadSignature = action({
  args: {
    productId: v.union(v.id("products"), v.null()),
    productAssetFolder: v.union(v.string(), v.null()),
  },
  handler: async (_ctx, args) => {
    const { cloudName, apiKey, apiSecret } = cloudinaryCredentials()
    const existingFolder = args.productAssetFolder?.trim() ?? ""
    const assetFolder =
      existingFolder && isManagedProductCloudinaryFolder(existingFolder)
        ? existingFolder
        : args.productId
          ? cloudinaryFolderForProductId(args.productId)
          : cloudinaryFolderForProductUploadKey(randomUUID())
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
