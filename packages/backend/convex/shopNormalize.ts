import type { Doc } from "./_generated/dataModel.d.ts"
import { cloudinaryFolderForProductId } from "./cloudinaryFolders"
import {
  PRODUCT_IMAGE_LIMIT,
  type NormalizedProductImage,
  type ProductDeletionPlan,
  type ProductFields,
  type ProductId,
  type ProductImageWrite,
  type ProductMetadataWrite,
  type ProductOptionConfig,
  type ProductOptionTemplateWrite,
  type ProductOptionWrite,
  type ProductUpsertArgs,
} from "./shopTypes"

export function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return slug || "item"
}

export function normalizeRequiredText(label: string, value: string) {
  const nextValue = value.trim()
  if (!nextValue) {
    throw new Error(`${label} is required.`)
  }

  return nextValue
}

export function normalizeNullableText(value: string | null) {
  const nextValue = value?.trim() ?? ""
  return nextValue ? nextValue : null
}

export function normalizeNullableHttpUrl(
  label: string,
  value: string | null | undefined
) {
  const linkText = normalizeNullableText(value ?? null)
  if (linkText === null) {
    return null
  }

  const urlText = /^[a-z][a-z0-9+.-]*:/i.test(linkText)
    ? linkText
    : `https://${linkText}`

  let url: URL
  try {
    url = new URL(urlText)
  } catch {
    throw new Error(`${label} must be a valid URL.`)
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`${label} must be an HTTP or HTTPS URL.`)
  }

  return url.href
}

function normalizeMetadataLinkUrl(value: string | null | undefined) {
  return normalizeNullableHttpUrl("Metadata link", value)
}

export function normalizeSortOrder(value: number) {
  if (!Number.isInteger(value)) {
    throw new Error("Sort order must be an integer.")
  }

  return value
}

export function normalizePriceCents(label: string, value: number) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer amount in cents.`)
  }

  return value
}

export function normalizeCurrency(value: string) {
  const currency = normalizeRequiredText("Currency", value).toUpperCase()
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error("Currency must be a three-letter ISO code.")
  }

  return currency
}

export function uniqueNonNullValues(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values.flatMap((value) => {
        const nextValue = value?.trim() ?? ""
        return nextValue ? [nextValue] : []
      })
    )
  )
}

export function assertUniqueKeys(items: Array<{ key: string }>, label: string) {
  const keys = new Set<string>()

  for (const item of items) {
    if (keys.has(item.key)) {
      throw new Error(`${label} keys must be unique.`)
    }

    keys.add(item.key)
  }
}

function assertUniqueValues(items: Array<{ value: string }>, label: string) {
  const values = new Set<string>()

  for (const item of items) {
    if (values.has(item.value)) {
      throw new Error(`${label} values must be unique.`)
    }

    values.add(item.value)
  }
}

function normalizeOptionConfig(
  config: ProductOptionConfig
): ProductOptionConfig {
  if (config.type === "choice") {
    const choices = config.choices.map((choice) => ({
      label: normalizeRequiredText("Choice label", choice.label),
      value: slugify(choice.value || choice.label),
      priceDeltaCents: normalizePriceCents(
        "Choice price delta",
        choice.priceDeltaCents
      ),
    }))

    if (choices.length === 0) {
      throw new Error("Choice options need at least one choice.")
    }

    assertUniqueValues(choices, "Choice")

    return { type: "choice", choices }
  }

  const fields = config.fields.map((field) => ({
    key: slugify(field.key || field.label),
    label: normalizeRequiredText("Field label", field.label),
    inputType: field.inputType,
    required: field.required,
  }))

  if (fields.length === 0) {
    throw new Error("Personalization options need at least one field.")
  }

  assertUniqueKeys(fields, "Personalization field")

  return { type: "personalization", fields }
}

export function normalizeOptionInput(option: ProductOptionWrite) {
  const normalizedOption = {
    label: normalizeRequiredText("Option label", option.label),
    key: slugify(option.key || option.label),
    isRequired: option.isRequired,
    priceDeltaCents: normalizePriceCents(
      "Option price delta",
      option.priceDeltaCents
    ),
    sortOrder: normalizeSortOrder(option.sortOrder),
    config: normalizeOptionConfig(option.config),
  }

  return option.templateId === null
    ? normalizedOption
    : { ...normalizedOption, templateId: option.templateId }
}

function normalizeTemplateConfig(
  template: ProductOptionTemplateWrite
): ProductOptionConfig {
  if (template.kind === "choice") {
    const choices = template.choices.map((choice) => {
      const label = normalizeRequiredText("Choice label", choice)

      return { label, value: slugify(label), priceDeltaCents: 0 }
    })

    if (choices.length === 0) {
      throw new Error("Selection options need at least one value.")
    }

    assertUniqueValues(choices, "Choice")

    return { type: "choice", choices }
  }

  const fields = template.fields.map((field) => {
    const label = normalizeRequiredText("Field label", field)
    const inputType = label.toLowerCase().includes("number")
      ? ("number" as const)
      : ("text" as const)

    return { key: slugify(label), label, inputType, required: true }
  })

  if (fields.length === 0) {
    throw new Error("Toggle options need at least one field.")
  }

  assertUniqueKeys(fields, "Toggle field")

  return { type: "personalization", fields }
}

export function normalizeTemplateInput(template: ProductOptionTemplateWrite) {
  const label = normalizeRequiredText("Option label", template.label)

  return {
    kind: template.kind,
    label,
    key: slugify(label),
    isRequired: template.isRequired,
    priceDeltaCents: normalizePriceCents(
      "Option extra price",
      template.priceDeltaCents
    ),
    sortOrder: normalizeSortOrder(template.sortOrder),
    isActive: template.isActive,
    config: normalizeTemplateConfig(template),
  }
}

export function normalizeMetadataInput(metadata: ProductMetadataWrite) {
  const label = normalizeRequiredText("Metadata label", metadata.label)
  const type = metadata.type ?? (metadata.linkUrl ? "link" : "text")
  const value =
    type === "link"
      ? normalizeMetadataLinkUrl(metadata.value)
      : normalizeRequiredText("Metadata value", metadata.value)

  if (value === null) {
    throw new Error("Metadata link is required.")
  }

  return {
    label,
    key: slugify(metadata.key?.trim() || label),
    type,
    value,
    linkUrl: null,
    showOnProductPage: metadata.showOnProductPage ?? true,
    sortOrder: normalizeSortOrder(metadata.sortOrder),
  }
}

export function normalizeProductImages(
  images: Array<ProductImageWrite>,
  fallbackAssetFolder: string | null
) {
  if (images.length > PRODUCT_IMAGE_LIMIT) {
    throw new Error(`Products can have up to ${PRODUCT_IMAGE_LIMIT} images.`)
  }

  const dedupeKeys = new Set<string>()

  return images.map((image) => {
    const normalizedImage: NormalizedProductImage = {
      imageUrl: normalizeRequiredText("Image URL", image.imageUrl),
      cloudinaryPublicId: normalizeNullableText(image.cloudinaryPublicId),
      cloudinaryAssetFolder:
        normalizeNullableText(image.cloudinaryAssetFolder) ??
        fallbackAssetFolder,
      sortOrder: normalizeSortOrder(image.sortOrder),
    }
    const dedupeKey =
      normalizedImage.cloudinaryPublicId ?? normalizedImage.imageUrl

    if (dedupeKeys.has(dedupeKey)) {
      throw new Error("Product images must be unique.")
    }

    dedupeKeys.add(dedupeKey)

    return normalizedImage
  })
}

export function productAssetFolderForWrite({
  productId,
  cloudinaryAssetFolder,
}: {
  productId: ProductId | null
  cloudinaryAssetFolder: string | null
}) {
  const existingFolder = normalizeNullableText(cloudinaryAssetFolder)

  return (
    existingFolder ??
    (productId ? cloudinaryFolderForProductId(productId) : null)
  )
}

export function savedProductAssetFolder({
  productId,
  productAssetFolder,
  primaryImage,
}: {
  productId: ProductId
  productAssetFolder: string | null
  primaryImage: NormalizedProductImage | null
}) {
  return (
    productAssetFolder ??
    primaryImage?.cloudinaryAssetFolder ??
    cloudinaryFolderForProductId(productId)
  )
}

export function removedProductImageCloudinaryPlan({
  existingProduct,
  existingImages,
  normalizedImages,
}: {
  existingProduct: Doc<"products"> | null
  existingImages: Array<Doc<"productImages">>
  normalizedImages: Array<NormalizedProductImage>
}): ProductDeletionPlan {
  const retainedPublicIds = new Set(
    uniqueNonNullValues(
      normalizedImages.map((image) => image.cloudinaryPublicId)
    )
  )
  const removedPublicIds = uniqueNonNullValues([
    existingProduct?.cloudinaryPublicId,
    ...existingImages.map((image) => image.cloudinaryPublicId),
  ]).filter((publicId) => !retainedPublicIds.has(publicId))

  return {
    cloudinaryPublicIds: removedPublicIds,
    cloudinaryAssetFolders: [],
  }
}

export function productFieldsForWrite({
  args,
  name,
  now,
  primaryImage,
  productAssetFolder,
  slug,
}: {
  args: ProductUpsertArgs
  name: string
  now: number
  primaryImage: NormalizedProductImage | null
  productAssetFolder: string | null
  slug: string
}): ProductFields {
  return {
    categoryId: args.categoryId,
    name,
    slug,
    description: args.description.trim(),
    basePriceCents: normalizePriceCents("Base price", args.basePriceCents),
    currency: normalizeCurrency(args.currency),
    status: args.status,
    sku: normalizeNullableText(args.sku),
    imageUrl: primaryImage?.imageUrl ?? null,
    cloudinaryPublicId: primaryImage?.cloudinaryPublicId ?? null,
    cloudinaryAssetFolder:
      productAssetFolder ?? primaryImage?.cloudinaryAssetFolder ?? null,
    sortOrder: normalizeSortOrder(args.sortOrder),
    updatedAt: now,
  }
}
