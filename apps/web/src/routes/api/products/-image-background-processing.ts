import type { Config as BackgroundRemovalConfig } from "@imgly/background-removal-node"
import { Data, Effect, Option } from "effect"
import { Buffer } from "node:buffer"
import { createRequire } from "node:module"
import path from "node:path"
import { pathToFileURL } from "node:url"
import sharp from "sharp"

import {
  flattenToProductBackground,
  replaceStudioBackground,
} from "./-studio-background"

export const PRODUCT_IMAGE_OUTPUT_MIME_TYPE = "image/webp"
const CUTOUT_TRANSPARENT_ALPHA_MAX = 8
const CUTOUT_OPAQUE_ALPHA_MIN = 247
const MAX_HEALTHY_TRANSLUCENT_MASK_RATIO = 0.12
const MIN_HEALTHY_TRANSPARENT_MASK_RATIO = 0.02
const MIN_HEALTHY_OPAQUE_MASK_RATIO = 0.03
const nodeRequire = createRequire(import.meta.url)

type BackgroundRemovalNodeModule = {
  removeBackground: (
    image: Blob,
    configuration: BackgroundRemovalConfig
  ) => Promise<Blob>
}

type AlphaMaskAnalysis = {
  readonly opaqueRatio: number
  readonly translucentRatio: number
  readonly transparentRatio: number
}

export class ProductImageProcessingError extends Data.TaggedError(
  "ProductImageProcessingError"
)<{
  readonly cause?: unknown
  readonly message: string
}> {
  readonly status = 500
}

export function prepareProductImage(image: Buffer, mimeType: string) {
  return Effect.gen(function* () {
    const cutout = yield* createForegroundCutout(image, mimeType)
    const analysis = yield* analyzeCutoutAlpha(cutout)

    if (shouldUseStudioBackgroundReplacement(analysis)) {
      const studioBackgroundImage = yield* createStudioBackgroundImage(image)

      if (Option.isSome(studioBackgroundImage)) {
        return studioBackgroundImage.value
      }
    }

    return yield* flattenProductImage(cutout)
  })
}

function createForegroundCutout(image: Buffer, mimeType: string) {
  return Effect.gen(function* () {
    const { removeBackground } = yield* loadBackgroundRemoval()
    const publicPath = yield* getBackgroundRemovalPublicPath()
    const blob = yield* Effect.tryPromise({
      catch: (cause) =>
        new ProductImageProcessingError({
          cause,
          message: "Could not remove the image background.",
        }),
      try: () =>
        removeBackground(
          new Blob([Uint8Array.from(image)], { type: mimeType }),
          {
            model: "medium",
            output: { format: "image/png" },
            publicPath,
          }
        ),
    })

    return yield* Effect.tryPromise({
      catch: (cause) =>
        new ProductImageProcessingError({
          cause,
          message: "Could not read the background removal result.",
        }),
      try: async () => Buffer.from(await blob.arrayBuffer()),
    })
  })
}

function analyzeCutoutAlpha(cutout: Buffer) {
  return Effect.tryPromise({
    catch: (cause) =>
      new ProductImageProcessingError({
        cause,
        message: "Could not inspect the background removal result.",
      }),
    try: async (): Promise<AlphaMaskAnalysis> => {
      const { data, info } = await sharp(cutout)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true })
      const totalPixels = info.width * info.height
      let opaquePixels = 0
      let translucentPixels = 0
      let transparentPixels = 0

      for (let offset = 3; offset < data.length; offset += info.channels) {
        const alpha = data[offset] ?? 0

        if (alpha <= CUTOUT_TRANSPARENT_ALPHA_MAX) {
          transparentPixels += 1
        } else if (alpha >= CUTOUT_OPAQUE_ALPHA_MIN) {
          opaquePixels += 1
        } else {
          translucentPixels += 1
        }
      }

      return {
        opaqueRatio: opaquePixels / totalPixels,
        translucentRatio: translucentPixels / totalPixels,
        transparentRatio: transparentPixels / totalPixels,
      }
    },
  })
}

function shouldUseStudioBackgroundReplacement(analysis: AlphaMaskAnalysis) {
  return (
    analysis.translucentRatio > MAX_HEALTHY_TRANSLUCENT_MASK_RATIO ||
    analysis.transparentRatio < MIN_HEALTHY_TRANSPARENT_MASK_RATIO ||
    analysis.opaqueRatio < MIN_HEALTHY_OPAQUE_MASK_RATIO
  )
}

function createStudioBackgroundImage(image: Buffer) {
  return Effect.tryPromise({
    catch: (cause) =>
      new ProductImageProcessingError({
        cause,
        message: "Could not replace the image background.",
      }),
    try: () => replaceStudioBackground(image),
  })
}

function loadBackgroundRemoval() {
  return Effect.try({
    catch: (cause) =>
      new ProductImageProcessingError({
        cause,
        message: "Could not load the background removal tool.",
      }),
    try: () => nodeRequire("@imgly/background-removal-node"),
  }).pipe(
    Effect.flatMap((module) =>
      isBackgroundRemovalNodeModule(module)
        ? Effect.succeed(module)
        : Effect.fail(
            new ProductImageProcessingError({
              message: "Could not load the background removal tool.",
            })
          )
    )
  )
}

function getBackgroundRemovalPublicPath() {
  return Effect.try({
    catch: (cause) =>
      new ProductImageProcessingError({
        cause,
        message: "Could not locate the background removal assets.",
      }),
    try: () =>
      pathToFileURL(
        path.dirname(nodeRequire.resolve("@imgly/background-removal-node")) +
          path.sep
      ).href,
  })
}

function flattenProductImage(cutout: Buffer) {
  return Effect.tryPromise({
    catch: (cause) =>
      new ProductImageProcessingError({
        cause,
        message: "Could not prepare the product image.",
      }),
    try: () => flattenToProductBackground(sharp(cutout)),
  })
}

function isBackgroundRemovalNodeModule(
  value: unknown
): value is BackgroundRemovalNodeModule {
  return isRecord(value) && typeof value.removeBackground === "function"
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
