import { Option } from "effect"
import type { Buffer } from "node:buffer"
import sharp, { type Sharp } from "sharp"

type RgbColor = {
  readonly b: number
  readonly g: number
  readonly r: number
}

type BackdropAccumulator = {
  b: number
  count: number
  g: number
  r: number
}

const PRODUCT_IMAGE_BACKGROUND: RgbColor = {
  b: 239,
  g: 238,
  r: 234,
}
const STUDIO_BACKDROP_BIN_SHIFT = 4
const STUDIO_BACKDROP_MIN_LUMINANCE = 96
const STUDIO_BACKDROP_MAX_CHROMA = 48
const STUDIO_BACKDROP_MAX_CHANNEL_DISTANCE = 42
const STUDIO_BACKDROP_MAX_COLOR_DISTANCE = 58
const MIN_STUDIO_BACKDROP_RATIO = 0.01

export async function replaceStudioBackground(image: Buffer) {
  const { data, info } = await sharp(image)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  if (info.channels !== 4) {
    return Option.none<Buffer>()
  }

  const backdropColor = estimateStudioBackdropColor(
    data,
    info.width,
    info.height,
    info.channels
  )

  if (Option.isNone(backdropColor)) {
    return Option.none<Buffer>()
  }

  const replacedPixelCount = replaceConnectedBackdropPixels(
    data,
    info.width,
    info.height,
    info.channels,
    backdropColor.value
  )
  const totalPixels = info.width * info.height

  if (replacedPixelCount / totalPixels < MIN_STUDIO_BACKDROP_RATIO) {
    return Option.none<Buffer>()
  }

  const flattened = await flattenToProductBackground(
    sharp(data, {
      raw: {
        channels: info.channels,
        height: info.height,
        width: info.width,
      },
    })
  )

  return Option.some(flattened)
}

export function flattenToProductBackground(image: Sharp) {
  return image
    .flatten({ background: PRODUCT_IMAGE_BACKGROUND })
    .webp({ lossless: true })
    .toBuffer()
}

function estimateStudioBackdropColor(
  data: Uint8Array,
  width: number,
  height: number,
  channels: number
) {
  const bins = new Map<string, BackdropAccumulator>()
  const addEdgePixel = (x: number, y: number) => {
    const color = readPixelColor(data, pixelOffset(x, y, width, channels))

    if (!isStudioBackdropCandidate(color)) {
      return
    }

    const key = studioBackdropBinKey(color)
    const current = bins.get(key) ?? { b: 0, count: 0, g: 0, r: 0 }
    current.b += color.b
    current.count += 1
    current.g += color.g
    current.r += color.r
    bins.set(key, current)
  }

  for (let x = 0; x < width; x += 1) {
    addEdgePixel(x, 0)
    addEdgePixel(x, height - 1)
  }

  for (let y = 1; y < height - 1; y += 1) {
    addEdgePixel(0, y)
    addEdgePixel(width - 1, y)
  }

  let bestCandidate: {
    color: RgbColor
    score: number
  } | null = null

  for (const accumulator of bins.values()) {
    const color = {
      b: accumulator.b / accumulator.count,
      g: accumulator.g / accumulator.count,
      r: accumulator.r / accumulator.count,
    }
    const score = studioBackdropCandidateScore(color, accumulator.count)

    if (!bestCandidate || score > bestCandidate.score) {
      bestCandidate = { color, score }
    }
  }

  return bestCandidate ? Option.some(bestCandidate.color) : Option.none()
}

function replaceConnectedBackdropPixels(
  data: Uint8Array,
  width: number,
  height: number,
  channels: number,
  backdropColor: RgbColor
) {
  const totalPixels = width * height
  const markedPixels = new Uint8Array(totalPixels)
  const queue = new Int32Array(totalPixels)
  let queueHead = 0
  let queueTail = 0
  const enqueue = (pixelIndex: number) => {
    if (markedPixels[pixelIndex]) {
      return
    }

    if (!isStudioBackdropPixel(data, pixelIndex * channels, backdropColor)) {
      return
    }

    markedPixels[pixelIndex] = 1
    queue[queueTail] = pixelIndex
    queueTail += 1
  }

  for (let x = 0; x < width; x += 1) {
    enqueue(x)
    enqueue((height - 1) * width + x)
  }

  for (let y = 1; y < height - 1; y += 1) {
    enqueue(y * width)
    enqueue(y * width + width - 1)
  }

  while (queueHead < queueTail) {
    const pixelIndex = queue[queueHead]
    queueHead += 1

    if (pixelIndex === undefined) {
      continue
    }

    const x = pixelIndex % width

    if (pixelIndex >= width) {
      enqueue(pixelIndex - width)
    }

    if (pixelIndex < totalPixels - width) {
      enqueue(pixelIndex + width)
    }

    if (x > 0) {
      enqueue(pixelIndex - 1)
    }

    if (x < width - 1) {
      enqueue(pixelIndex + 1)
    }
  }

  for (let pixelIndex = 0; pixelIndex < totalPixels; pixelIndex += 1) {
    if (!markedPixels[pixelIndex]) {
      continue
    }

    const offset = pixelIndex * channels
    data[offset] = PRODUCT_IMAGE_BACKGROUND.r
    data[offset + 1] = PRODUCT_IMAGE_BACKGROUND.g
    data[offset + 2] = PRODUCT_IMAGE_BACKGROUND.b
    data[offset + 3] = 0
  }

  return queueTail
}

function isStudioBackdropCandidate(color: RgbColor) {
  return (
    colorLuminance(color) >= STUDIO_BACKDROP_MIN_LUMINANCE &&
    colorChroma(color) <= STUDIO_BACKDROP_MAX_CHROMA
  )
}

function isStudioBackdropPixel(
  data: Uint8Array,
  offset: number,
  backdropColor: RgbColor
) {
  const color = readPixelColor(data, offset)
  const redDistance = Math.abs(color.r - backdropColor.r)
  const greenDistance = Math.abs(color.g - backdropColor.g)
  const blueDistance = Math.abs(color.b - backdropColor.b)

  return (
    redDistance <= STUDIO_BACKDROP_MAX_CHANNEL_DISTANCE &&
    greenDistance <= STUDIO_BACKDROP_MAX_CHANNEL_DISTANCE &&
    blueDistance <= STUDIO_BACKDROP_MAX_CHANNEL_DISTANCE &&
    colorDistanceSquared(color, backdropColor) <=
      STUDIO_BACKDROP_MAX_COLOR_DISTANCE * STUDIO_BACKDROP_MAX_COLOR_DISTANCE
  )
}

function studioBackdropCandidateScore(color: RgbColor, count: number) {
  return (
    (count * (1 + Math.max(0, colorLuminance(color) - 120) / 180)) /
    (1 + colorChroma(color) / 32)
  )
}

function studioBackdropBinKey(color: RgbColor) {
  return `${color.r >> STUDIO_BACKDROP_BIN_SHIFT}:${
    color.g >> STUDIO_BACKDROP_BIN_SHIFT
  }:${color.b >> STUDIO_BACKDROP_BIN_SHIFT}`
}

function readPixelColor(data: Uint8Array, offset: number): RgbColor {
  return {
    b: data[offset + 2] ?? 0,
    g: data[offset + 1] ?? 0,
    r: data[offset] ?? 0,
  }
}

function pixelOffset(x: number, y: number, width: number, channels: number) {
  return (y * width + x) * channels
}

function colorDistanceSquared(first: RgbColor, second: RgbColor) {
  const redDistance = first.r - second.r
  const greenDistance = first.g - second.g
  const blueDistance = first.b - second.b

  return (
    redDistance * redDistance +
    greenDistance * greenDistance +
    blueDistance * blueDistance
  )
}

function colorChroma(color: RgbColor) {
  return (
    Math.max(color.r, color.g, color.b) - Math.min(color.r, color.g, color.b)
  )
}

function colorLuminance(color: RgbColor) {
  return (color.r + color.g + color.b) / 3
}
