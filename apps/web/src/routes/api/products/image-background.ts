import { createFileRoute } from "@tanstack/react-router"
import { Buffer } from "node:buffer"
import { createRequire } from "node:module"
import path from "node:path"
import { pathToFileURL } from "node:url"
import sharp from "sharp"

const PRODUCT_IMAGE_BACKGROUND = {
  b: 239,
  g: 238,
  r: 234,
}
const PRODUCT_IMAGE_OUTPUT_MIME_TYPE = "image/webp"
const MAX_PRODUCT_IMAGE_SIZE_BYTES = 10 * 1024 * 1024
const PRODUCT_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
])
const requireRuntime = createRequire(import.meta.url)
const BACKGROUND_REMOVAL_PUBLIC_PATH = pathToFileURL(
  path.dirname(requireRuntime.resolve("@imgly/background-removal-node")) +
    path.sep
).href

type BackgroundRemovalConfig = {
  model: "medium"
  output: {
    format: "image/png"
  }
  publicPath: string
}

type BackgroundRemovalNodeModule = {
  removeBackground: (
    image: Blob,
    configuration: BackgroundRemovalConfig
  ) => Promise<Blob>
}

export const Route = createFileRoute("/api/products/image-background")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const formData = await request.formData()
          const file = formData.get("file")

          if (!isUploadFile(file)) {
            return errorJson("Upload one product image.", 400)
          }

          assertProductImageFile(file)

          const source = Buffer.from(await file.arrayBuffer())
          const cutout = await createForegroundCutout(source, file.type)
          const flattened = await sharp(cutout)
            .flatten({ background: PRODUCT_IMAGE_BACKGROUND })
            .webp({ lossless: true })
            .toBuffer()

          return new Response(Uint8Array.from(flattened), {
            headers: {
              "cache-control": "no-store",
              "content-length": String(flattened.byteLength),
              "content-type": PRODUCT_IMAGE_OUTPUT_MIME_TYPE,
            },
          })
        } catch (error) {
          return errorJson(errorMessage(error), 500)
        }
      },
    },
  },
})

async function createForegroundCutout(image: Buffer, mimeType: string) {
  const { removeBackground } = loadBackgroundRemoval()
  const blob = await removeBackground(
    new Blob([Uint8Array.from(image)], { type: mimeType }),
    {
      model: "medium",
      output: { format: "image/png" },
      publicPath: BACKGROUND_REMOVAL_PUBLIC_PATH,
    }
  )

  return Buffer.from(await blob.arrayBuffer())
}

function loadBackgroundRemoval() {
  const module = requireRuntime("@imgly/background-removal-node")

  if (!isBackgroundRemovalNodeModule(module)) {
    throw new Error("Could not load the background removal tool.")
  }

  return module
}

function isBackgroundRemovalNodeModule(
  value: unknown
): value is BackgroundRemovalNodeModule {
  return isRecord(value) && typeof value.removeBackground === "function"
}

function assertProductImageFile(file: File) {
  if (!PRODUCT_IMAGE_TYPES.has(file.type)) {
    throw new Error("Upload a JPG, PNG, WebP, or AVIF image.")
  }

  if (file.size === 0) {
    throw new Error("Product image is empty.")
  }

  if (file.size > MAX_PRODUCT_IMAGE_SIZE_BYTES) {
    throw new Error("Product images must be 10 MB or smaller.")
  }
}

function isUploadFile(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    "name" in value &&
    "size" in value &&
    "type" in value
  )
}

function errorJson(message: string, status = 500) {
  return new Response(JSON.stringify({ error: message }), {
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json",
    },
    status,
  })
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Request failed."
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
