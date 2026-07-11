"use node"

import { createHash } from "node:crypto"

export type CloudinaryDeletionPlan = {
  cloudinaryPublicIds: Array<string>
  cloudinaryAssetFolders: Array<string>
}

type CloudinaryCredentials = {
  cloudName: string
  apiKey: string
  apiSecret: string
}

type CloudinaryImageResource = {
  publicId: string
  assetFolder: string | null
  folder: string | null
}

const CLOUDINARY_SEARCH_PAGE_SIZE = 500

function requiredEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Set ${name} in the backend Convex environment.`)
  }

  return value
}

export function signUploadParams(
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

export function cloudinaryCredentials(): CloudinaryCredentials {
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

function cloudinaryImageResource(
  value: unknown
): CloudinaryImageResource | null {
  if (!isRecord(value)) {
    return null
  }

  const publicId = stringField(value, "public_id")
  if (!publicId) {
    return null
  }

  return {
    publicId,
    assetFolder: stringField(value, "asset_folder"),
    folder: stringField(value, "folder"),
  }
}

function resourceFolder({
  assetFolder,
  folder,
}: Pick<CloudinaryImageResource, "assetFolder" | "folder">) {
  return assetFolder ?? folder
}

function publicIdFolder(publicId: string) {
  const folder = publicId.split("/").slice(0, -1).join("/")

  return folder && isDeletableFolder(folder) ? folder : null
}

function exactSearchExpression(field: string, value: string) {
  return `${field}="${escapeSearchValue(value)}"`
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

async function searchCloudinaryImageResources(
  credentials: CloudinaryCredentials,
  expression: string
) {
  return await searchCloudinaryImageResourcePage({
    credentials,
    expression,
    nextCursor: null,
  })
}

async function searchCloudinaryImageResourcePage({
  credentials,
  expression,
  nextCursor,
}: {
  credentials: CloudinaryCredentials
  expression: string
  nextCursor: string | null
}): Promise<Array<CloudinaryImageResource>> {
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${credentials.cloudName}/resources/search`,
    {
      method: "POST",
      headers: {
        Authorization: cloudinaryBasicAuthHeader(credentials),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        expression,
        max_results: CLOUDINARY_SEARCH_PAGE_SIZE,
        ...(nextCursor ? { next_cursor: nextCursor } : {}),
      }),
    }
  )

  if (!response.ok) {
    await throwCloudinaryError(
      response,
      `Cloudinary search failed for expression "${expression}".`
    )
  }

  const payload: unknown = await response.json()
  const payloadResources = isRecord(payload) ? payload.resources : null
  const resources = Array.isArray(payloadResources)
    ? payloadResources.flatMap((resource) => {
        const imageResource = cloudinaryImageResource(resource)

        return imageResource ? [imageResource] : []
      })
    : []
  const followingCursor = isRecord(payload)
    ? stringField(payload, "next_cursor")
    : null

  if (!followingCursor) {
    return resources
  }

  return [
    ...resources,
    ...(await searchCloudinaryImageResourcePage({
      credentials,
      expression,
      nextCursor: followingCursor,
    })),
  ]
}

async function searchAssetFolderImageResources(
  credentials: CloudinaryCredentials,
  folder: string
) {
  const folderExpression = exactSearchExpression("asset_folder", folder)
  const legacyFolderExpression = exactSearchExpression("folder", folder)

  return await searchCloudinaryImageResources(
    credentials,
    `resource_type:image AND (${folderExpression} OR ${legacyFolderExpression})`
  )
}

async function searchPublicIdImageResources(
  credentials: CloudinaryCredentials,
  publicIds: Array<string>
) {
  const publicIdExpressions = publicIds.map((publicId) =>
    exactSearchExpression("public_id", publicId)
  )

  if (publicIdExpressions.length === 0) {
    return []
  }

  return await searchCloudinaryImageResources(
    credentials,
    `resource_type:image AND (${publicIdExpressions.join(" OR ")})`
  )
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

export async function deleteCloudinaryPlan(plan: CloudinaryDeletionPlan) {
  const directPublicIds = uniqueNonEmptyValues(plan.cloudinaryPublicIds)
  const directPublicIdFolders = directPublicIds.map(publicIdFolder)
  const foldersFromPlan = uniqueNonEmptyValues([
    ...plan.cloudinaryAssetFolders,
    ...directPublicIdFolders,
  ])

  if (foldersFromPlan.length === 0 && directPublicIds.length === 0) {
    return {
      deletedAssetCount: 0,
      deletedFolderCount: 0,
    }
  }

  const credentials = cloudinaryCredentials()
  const directResources = await searchPublicIdImageResources(
    credentials,
    directPublicIds
  )
  const folders = uniqueNonEmptyValues([
    ...foldersFromPlan,
    ...directResources.map(resourceFolder),
  ])

  folders.sort(
    (first: string, second: string) =>
      second.split("/").length - first.split("/").length
  )
  const folderPublicIds = (
    await Promise.all(
      folders.map((folder) =>
        searchAssetFolderImageResources(credentials, folder)
      )
    )
  )
    .flat()
    .map((resource) => resource.publicId)

  const publicIds = uniqueNonEmptyValues([
    ...directPublicIds,
    ...folderPublicIds,
  ])

  await Promise.all(
    publicIds.map((publicId) => destroyCloudinaryImage(credentials, publicId))
  )

  const deletedFolders = await Promise.all(
    folders.map((folder) => deleteCloudinaryFolder(credentials, folder))
  )

  return {
    deletedAssetCount: publicIds.length,
    deletedFolderCount: deletedFolders.filter(Boolean).length,
  }
}
