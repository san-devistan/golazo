"use node"

import { v } from "convex/values"
import { createHash } from "node:crypto"

import { action } from "./_generated/server"

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

export const createUploadSignature = action({
  args: {
    assetFolder: v.union(v.string(), v.null()),
  },
  handler: async (_ctx, args) => {
    const cloudName = requiredEnv("CLOUDINARY_CLOUD_NAME")
    const apiKey = requiredEnv("CLOUDINARY_API_KEY")
    const apiSecret = requiredEnv("CLOUDINARY_API_SECRET")
    const assetFolder = args.assetFolder?.trim() ?? ""
    const timestamp = Math.floor(Date.now() / 1000)
    const params: Record<string, number | string> = { timestamp }

    if (assetFolder) {
      params.asset_folder = assetFolder
    }

    return {
      cloudName,
      apiKey,
      timestamp,
      signature: signUploadParams(params, apiSecret),
      assetFolder: assetFolder || null,
    }
  },
})
