import { createFileRoute } from "@tanstack/react-router"
import { Data, Effect } from "effect"
import { Buffer } from "node:buffer"

import {
  PRODUCT_IMAGE_OUTPUT_MIME_TYPE,
  ProductImageProcessingError,
  prepareProductImage,
} from "./-image-background-processing"

const MAX_PRODUCT_IMAGE_SIZE_BYTES = 10 * 1024 * 1024
const PRODUCT_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
])

type ProductImageError = ProductImageProcessingError | ProductImageRequestError

class ProductImageRequestError extends Data.TaggedError(
  "ProductImageRequestError"
)<{
  readonly cause?: unknown
  readonly message: string
}> {
  readonly status = 400
}

export const Route = createFileRoute("/api/products/image-background")({
  server: {
    handlers: {
      POST: ({ request }) =>
        Effect.runPromise(
          processProductImageRequest(request).pipe(
            Effect.catchAll((error) =>
              Effect.succeed(productImageErrorResponse(error))
            ),
            Effect.catchAllDefect((defect) =>
              Effect.succeed(errorJson(errorMessage(defect), 500))
            )
          )
        ),
    },
  },
})

function processProductImageRequest(request: Request) {
  return Effect.gen(function* () {
    const file = yield* getProductImageFile(request)
    const source = yield* readUploadBuffer(file)
    const flattened = yield* prepareProductImage(source, file.type)

    return productImageResponse(flattened)
  })
}

function getProductImageFile(request: Request) {
  return Effect.gen(function* () {
    const formData = yield* Effect.tryPromise({
      catch: (cause) =>
        new ProductImageRequestError({
          cause,
          message: "Upload one product image.",
        }),
      try: () => request.formData(),
    })
    const file = formData.get("file")

    if (!isUploadFile(file)) {
      return yield* new ProductImageRequestError({
        message: "Upload one product image.",
      })
    }

    return yield* validateProductImageFile(file)
  })
}

function validateProductImageFile(file: File) {
  if (!PRODUCT_IMAGE_TYPES.has(file.type)) {
    return Effect.fail(
      new ProductImageRequestError({
        message: "Upload a JPG, PNG, WebP, or AVIF image.",
      })
    )
  }

  if (file.size === 0) {
    return Effect.fail(
      new ProductImageRequestError({ message: "Product image is empty." })
    )
  }

  if (file.size > MAX_PRODUCT_IMAGE_SIZE_BYTES) {
    return Effect.fail(
      new ProductImageRequestError({
        message: "Product images must be 10 MB or smaller.",
      })
    )
  }

  return Effect.succeed(file)
}

function readUploadBuffer(file: File) {
  return Effect.tryPromise({
    catch: (cause) =>
      new ProductImageProcessingError({
        cause,
        message: "Could not read the uploaded image.",
      }),
    try: async () => Buffer.from(await file.arrayBuffer()),
  })
}

function productImageResponse(image: Buffer) {
  return new Response(Uint8Array.from(image), {
    headers: {
      "cache-control": "no-store",
      "content-length": String(image.byteLength),
      "content-type": PRODUCT_IMAGE_OUTPUT_MIME_TYPE,
    },
  })
}

function productImageErrorResponse(error: ProductImageError) {
  return errorJson(error.message, error.status)
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
