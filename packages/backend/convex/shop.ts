/* eslint-disable max-lines, no-await-in-loop, no-underscore-dangle */

import { v, type Infer } from "convex/values"

import type { Id } from "./_generated/dataModel.d.ts"
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server"
import {
  cloudinaryFolderForCatalogPath,
  cloudinaryFolderForProductId,
} from "./cloudinaryFolders"
import {
  productImageWriteValidator,
  productMetadataWriteValidator,
  productOptionWriteValidator,
  productOptionTemplateWriteValidator,
  productStatusValidator,
} from "./shopValidators"

const DELETE_BATCH_SIZE = 200
const CATEGORY_PAGE_CHILD_LIMIT = 60
const CATEGORY_PAGE_PRODUCTS_PER_SECTION = 80
const PRODUCT_IMAGE_LIMIT = 12
const PRODUCT_STATUSES = ["draft", "published", "archived"] as const

type ProductImageWrite = Infer<typeof productImageWriteValidator>
type ProductOptionWrite = Infer<typeof productOptionWriteValidator>
type ProductOptionConfig = ProductOptionWrite["config"]
type ProductMetadataWrite = Infer<typeof productMetadataWriteValidator>
type ProductOptionTemplateWrite = Infer<
  typeof productOptionTemplateWriteValidator
>
type ProductStatus = Infer<typeof productStatusValidator>
type CategoryId = Id<"catalogCategories">
type ProductId = Id<"products">
type ProductOptionTemplateId = Id<"productOptionTemplates">
type ProductDeletionPlan = {
  cloudinaryPublicIds: Array<string>
  cloudinaryAssetFolders: Array<string>
}

type CategoryDoc = {
  _id: CategoryId
  name: string
  slug: string
  parentId: CategoryId | null
  path: string
  depth: number
  cloudinaryFolder: string
  sortOrder: number
  isActive: boolean
  createdAt: number
  updatedAt: number
}

type CategoryPlacement = {
  path: string
  depth: number
  cloudinaryFolder: string
}

function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return slug || "item"
}

function normalizeRequiredText(label: string, value: string) {
  const nextValue = value.trim()
  if (!nextValue) {
    throw new Error(`${label} is required.`)
  }

  return nextValue
}

function normalizeNullableText(value: string | null) {
  const nextValue = value?.trim() ?? ""
  return nextValue ? nextValue : null
}

function normalizeMetadataLinkUrl(value: string | null | undefined) {
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
    throw new Error("Metadata link must be a valid URL.")
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Metadata link must be an HTTP or HTTPS URL.")
  }

  return url.href
}

function normalizeSortOrder(value: number) {
  if (!Number.isInteger(value)) {
    throw new Error("Sort order must be an integer.")
  }

  return value
}

function sortProductsByOrder<
  T extends { sortOrder?: number; name: string; _creationTime: number },
>(products: Array<T>) {
  const sortedProducts = Array.from(products)

  sortedProducts.sort((first: T, second: T) => {
    const firstOrder = first.sortOrder ?? Number.MAX_SAFE_INTEGER
    const secondOrder = second.sortOrder ?? Number.MAX_SAFE_INTEGER

    if (firstOrder !== secondOrder) {
      return firstOrder - secondOrder
    }

    if (first._creationTime !== second._creationTime) {
      return first._creationTime - second._creationTime
    }

    return first.name.localeCompare(second.name)
  })

  return sortedProducts
}

async function listPublishedProductsForCategories(
  ctx: QueryCtx,
  categoryIds: Array<CategoryId>
) {
  const productGroups = await Promise.all(
    categoryIds
      .slice(0, CATEGORY_PAGE_CHILD_LIMIT + 1)
      .map(async (categoryId) => {
        const products = await ctx.db
          .query("products")
          .withIndex("by_categoryId_and_status_and_sortOrder", (q) =>
            q.eq("categoryId", categoryId).eq("status", "published")
          )
          .take(CATEGORY_PAGE_PRODUCTS_PER_SECTION)

        return sortProductsByOrder(products)
      })
  )

  return productGroups.flat()
}

function normalizePriceCents(label: string, value: number) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer amount in cents.`)
  }

  return value
}

function normalizeCurrency(value: string) {
  const currency = normalizeRequiredText("Currency", value).toUpperCase()
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error("Currency must be a three-letter ISO code.")
  }

  return currency
}

function uniqueNonNullValues(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values.flatMap((value) => {
        const nextValue = value?.trim() ?? ""
        return nextValue ? [nextValue] : []
      })
    )
  )
}

function cloudinaryFolderForPath(path: string) {
  return cloudinaryFolderForCatalogPath(path)
}

async function getCategoryOrThrow(
  ctx: QueryCtx | MutationCtx,
  categoryId: CategoryId
) {
  const category = await ctx.db.get(categoryId)
  if (!category) {
    throw new Error("Category not found.")
  }

  return category
}

async function getCategoryPlacement(
  ctx: QueryCtx | MutationCtx,
  parentId: CategoryId | null,
  slug: string
): Promise<CategoryPlacement> {
  if (parentId === null) {
    return {
      path: slug,
      depth: 0,
      cloudinaryFolder: cloudinaryFolderForPath(slug),
    }
  }

  const parent = await getCategoryOrThrow(ctx, parentId)
  const path = `${parent.path}/${slug}`

  return {
    path,
    depth: parent.depth + 1,
    cloudinaryFolder: cloudinaryFolderForPath(path),
  }
}

async function assertNoCategoryCycle(
  ctx: MutationCtx,
  categoryId: CategoryId | null,
  parentId: CategoryId | null
) {
  if (categoryId === null) {
    return
  }

  let nextParentId = parentId
  while (nextParentId !== null) {
    if (nextParentId === categoryId) {
      throw new Error("A category cannot be moved under itself.")
    }

    const parent = await getCategoryOrThrow(ctx, nextParentId)
    nextParentId = parent.parentId
  }
}

async function assertUniqueSiblingSlug(
  ctx: MutationCtx,
  categoryId: CategoryId | null,
  parentId: CategoryId | null,
  slug: string
) {
  const sibling = await ctx.db
    .query("catalogCategories")
    .withIndex("by_parentId_and_slug", (q) =>
      q.eq("parentId", parentId).eq("slug", slug)
    )
    .unique()

  if (sibling && sibling._id !== categoryId) {
    throw new Error("A category with this name already exists here.")
  }
}

async function syncDescendantCategoryPaths(
  ctx: MutationCtx,
  parent: CategoryDoc,
  now: number
) {
  const children = await ctx.db
    .query("catalogCategories")
    .withIndex("by_parentId_and_sortOrder", (q) => q.eq("parentId", parent._id))
    .take(200)

  for (const child of children) {
    const path = `${parent.path}/${child.slug}`
    const updatedChild = {
      ...child,
      path,
      depth: parent.depth + 1,
      cloudinaryFolder: cloudinaryFolderForPath(path),
      updatedAt: now,
    }

    await ctx.db.patch(child._id, {
      path: updatedChild.path,
      depth: updatedChild.depth,
      cloudinaryFolder: updatedChild.cloudinaryFolder,
      updatedAt: updatedChild.updatedAt,
    })
    await syncDescendantCategoryPaths(ctx, updatedChild, now)
  }
}

function assertUniqueKeys(items: Array<{ key: string }>, label: string) {
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

    return {
      type: "choice",
      choices,
    }
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

  return {
    type: "personalization",
    fields,
  }
}

function normalizeOptionInput(option: ProductOptionWrite) {
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

  if (option.templateId === null) {
    return normalizedOption
  }

  return {
    ...normalizedOption,
    templateId: option.templateId,
  }
}

function normalizeTemplateConfig(
  template: ProductOptionTemplateWrite
): ProductOptionConfig {
  if (template.kind === "choice") {
    const choices = template.choices.map((choice) => {
      const label = normalizeRequiredText("Choice label", choice)

      return {
        label,
        value: slugify(label),
        priceDeltaCents: 0,
      }
    })

    if (choices.length === 0) {
      throw new Error("Selection options need at least one value.")
    }

    assertUniqueValues(choices, "Choice")

    return {
      type: "choice",
      choices,
    }
  }

  const fields = template.fields.map((field) => {
    const label = normalizeRequiredText("Field label", field)
    const inputType = label.toLowerCase().includes("number")
      ? ("number" as const)
      : ("text" as const)

    return {
      key: slugify(label),
      label,
      inputType,
      required: true,
    }
  })

  if (fields.length === 0) {
    throw new Error("Toggle options need at least one field.")
  }

  assertUniqueKeys(fields, "Toggle field")

  return {
    type: "personalization",
    fields,
  }
}

function normalizeTemplateInput(template: ProductOptionTemplateWrite) {
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

function normalizeMetadataInput(metadata: ProductMetadataWrite) {
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

type NormalizedProductImage = {
  imageUrl: string
  cloudinaryPublicId: string | null
  cloudinaryAssetFolder: string | null
  sortOrder: number
}

type ProductFields = {
  categoryId: CategoryId
  name: string
  slug: string
  description: string
  basePriceCents: number
  currency: string
  status: ProductStatus
  sku: string | null
  imageUrl: string | null
  cloudinaryPublicId: string | null
  cloudinaryAssetFolder: string | null
  sortOrder: number
  updatedAt: number
}

function normalizeProductImages(
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

function productAssetFolderForWrite({
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

function savedProductAssetFolder({
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

async function saveProductDocument(
  ctx: MutationCtx,
  {
    productId,
    fields,
    now,
  }: {
    productId: ProductId | null
    fields: ProductFields
    now: number
  }
) {
  if (productId === null) {
    return await ctx.db.insert("products", {
      ...fields,
      createdAt: now,
    })
  }

  const existingProduct = await ctx.db.get(productId)
  if (!existingProduct) {
    throw new Error("Product not found.")
  }

  await ctx.db.patch(productId, fields)

  return productId
}

async function listImagesForProduct(ctx: QueryCtx, productId: ProductId) {
  return await ctx.db
    .query("productImages")
    .withIndex("by_productId_and_sortOrder", (q) =>
      q.eq("productId", productId)
    )
    .take(PRODUCT_IMAGE_LIMIT)
}

async function listOptionsForProduct(ctx: QueryCtx, productId: ProductId) {
  return await ctx.db
    .query("productOptions")
    .withIndex("by_productId_and_sortOrder", (q) =>
      q.eq("productId", productId)
    )
    .take(100)
}

async function listMetadataForProduct(
  ctx: QueryCtx,
  productId: ProductId,
  visibility: "all" | "productPage" = "all"
) {
  const metadata = await ctx.db
    .query("productMetadata")
    .withIndex("by_productId_and_sortOrder", (q) =>
      q.eq("productId", productId)
    )
    .take(100)

  if (visibility === "productPage") {
    return metadata.filter((item) => item.showOnProductPage ?? true)
  }

  return metadata
}

async function listOptionTemplates(ctx: QueryCtx) {
  return await ctx.db
    .query("productOptionTemplates")
    .withIndex("by_sortOrder")
    .take(100)
}

async function patchProductOptionsForTemplate(
  ctx: MutationCtx,
  templateId: ProductOptionTemplateId,
  fields: ReturnType<typeof normalizeTemplateInput>,
  now: number
) {
  const options = await ctx.db
    .query("productOptions")
    .withIndex("by_templateId", (q) => q.eq("templateId", templateId))
    .take(200)

  for (const option of options) {
    await ctx.db.patch(option._id, {
      label: fields.label,
      key: fields.key,
      isRequired: fields.isRequired,
      priceDeltaCents: fields.priceDeltaCents,
      sortOrder: fields.sortOrder,
      config: fields.config,
      updatedAt: now,
    })
  }
}

async function syncProductOptions(
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

  for (const existingOption of existingOptions) {
    if (!retainedOptionIds.has(existingOption._id)) {
      await ctx.db.delete(existingOption._id)
    }
  }

  for (const [index, option] of options.entries()) {
    const normalizedOption = normalizedOptions[index]
    if (!normalizedOption) {
      continue
    }

    if (option.optionId === null) {
      await ctx.db.insert("productOptions", {
        productId,
        ...normalizedOption,
        createdAt: now,
        updatedAt: now,
      })
      continue
    }

    const existingOption = await ctx.db.get(option.optionId)
    if (!existingOption || existingOption.productId !== productId) {
      throw new Error("Option not found for this product.")
    }

    await ctx.db.patch(option.optionId, {
      ...normalizedOption,
      updatedAt: now,
    })
  }
}

async function syncProductMetadata(
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

  for (const existingItem of existingMetadata) {
    if (!retainedMetadataIds.has(existingItem._id)) {
      await ctx.db.delete(existingItem._id)
    }
  }

  for (const [index, item] of metadata.entries()) {
    const normalizedItem = normalizedMetadata[index]
    if (!normalizedItem) {
      continue
    }

    if (item.metadataId === null) {
      await ctx.db.insert("productMetadata", {
        productId,
        ...normalizedItem,
        createdAt: now,
        updatedAt: now,
      })
      continue
    }

    const existingItem = await ctx.db.get(item.metadataId)
    if (!existingItem || existingItem.productId !== productId) {
      throw new Error("Metadata not found for this product.")
    }

    await ctx.db.patch(item.metadataId, {
      ...normalizedItem,
      updatedAt: now,
    })
  }
}

async function syncProductImages({
  ctx,
  productId,
  images,
  normalizedImages,
  now,
}: {
  ctx: MutationCtx
  productId: ProductId
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

  for (const existingImage of existingImages) {
    if (!retainedImageIds.has(existingImage._id)) {
      await ctx.db.delete(existingImage._id)
    }
  }

  for (const [index, image] of images.entries()) {
    const normalizedImage = normalizedImages[index]
    if (!normalizedImage) {
      continue
    }

    if (image.imageId === null) {
      await ctx.db.insert("productImages", {
        productId,
        ...normalizedImage,
        createdAt: now,
        updatedAt: now,
      })
      continue
    }

    const existingImage = await ctx.db.get(image.imageId)
    if (!existingImage || existingImage.productId !== productId) {
      throw new Error("Image not found for this product.")
    }

    await ctx.db.patch(image.imageId, {
      ...normalizedImage,
      updatedAt: now,
    })
  }
}

async function getProductDeletionPlan(
  ctx: QueryCtx,
  productId: ProductId
): Promise<ProductDeletionPlan> {
  const product = await ctx.db.get(productId)
  if (!product) {
    throw new Error("Product not found.")
  }

  const images = await ctx.db
    .query("productImages")
    .withIndex("by_productId_and_sortOrder", (q) =>
      q.eq("productId", productId)
    )
    .take(DELETE_BATCH_SIZE)

  if (images.length === DELETE_BATCH_SIZE) {
    throw new Error("This product has too many images to delete at once.")
  }

  return {
    cloudinaryPublicIds: uniqueNonNullValues([
      product.cloudinaryPublicId,
      ...images.map((image) => image.cloudinaryPublicId),
    ]),
    cloudinaryAssetFolders: uniqueNonNullValues([
      product.cloudinaryAssetFolder,
      ...images.map((image) => image.cloudinaryAssetFolder),
    ]),
  }
}

async function getCategoryDeletionPlan(
  ctx: QueryCtx,
  categoryId: CategoryId
): Promise<ProductDeletionPlan> {
  const category = await ctx.db.get(categoryId)
  if (!category) {
    throw new Error("Category not found.")
  }

  const children = await ctx.db
    .query("catalogCategories")
    .withIndex("by_parentId_and_sortOrder", (q) => q.eq("parentId", categoryId))
    .take(DELETE_BATCH_SIZE)

  if (children.length === DELETE_BATCH_SIZE) {
    throw new Error("This category has too many children to delete at once.")
  }

  const childPlans = []
  for (const child of children) {
    childPlans.push(await getCategoryDeletionPlan(ctx, child._id))
  }

  const productPlans = []
  for (const status of PRODUCT_STATUSES) {
    const products = await ctx.db
      .query("products")
      .withIndex("by_categoryId_and_status", (q) =>
        q.eq("categoryId", categoryId).eq("status", status)
      )
      .take(DELETE_BATCH_SIZE)

    if (products.length === DELETE_BATCH_SIZE) {
      throw new Error("This category has too many products to delete at once.")
    }

    for (const product of products) {
      productPlans.push(await getProductDeletionPlan(ctx, product._id))
    }
  }

  return {
    cloudinaryPublicIds: uniqueNonNullValues([
      ...childPlans.flatMap((plan) => plan.cloudinaryPublicIds),
      ...productPlans.flatMap((plan) => plan.cloudinaryPublicIds),
    ]),
    cloudinaryAssetFolders: uniqueNonNullValues([
      category.cloudinaryFolder,
      ...childPlans.flatMap((plan) => plan.cloudinaryAssetFolders),
      ...productPlans.flatMap((plan) => plan.cloudinaryAssetFolders),
    ]),
  }
}

async function deleteProductWithRelations(
  ctx: MutationCtx,
  productId: ProductId
) {
  const images = await ctx.db
    .query("productImages")
    .withIndex("by_productId_and_sortOrder", (q) =>
      q.eq("productId", productId)
    )
    .take(DELETE_BATCH_SIZE)
  if (images.length === DELETE_BATCH_SIZE) {
    throw new Error("This product has too many images to delete at once.")
  }

  const options = await ctx.db
    .query("productOptions")
    .withIndex("by_productId_and_sortOrder", (q) =>
      q.eq("productId", productId)
    )
    .take(DELETE_BATCH_SIZE)
  if (options.length === DELETE_BATCH_SIZE) {
    throw new Error("This product has too many options to delete at once.")
  }

  const metadata = await ctx.db
    .query("productMetadata")
    .withIndex("by_productId_and_sortOrder", (q) =>
      q.eq("productId", productId)
    )
    .take(DELETE_BATCH_SIZE)
  if (metadata.length === DELETE_BATCH_SIZE) {
    throw new Error("This product has too much metadata to delete at once.")
  }

  for (const image of images) {
    await ctx.db.delete(image._id)
  }

  for (const option of options) {
    await ctx.db.delete(option._id)
  }

  for (const item of metadata) {
    await ctx.db.delete(item._id)
  }

  await ctx.db.delete(productId)
}

async function deleteProductsInCategory(
  ctx: MutationCtx,
  categoryId: CategoryId
) {
  for (const status of PRODUCT_STATUSES) {
    const products = await ctx.db
      .query("products")
      .withIndex("by_categoryId_and_status", (q) =>
        q.eq("categoryId", categoryId).eq("status", status)
      )
      .take(DELETE_BATCH_SIZE)

    if (products.length === DELETE_BATCH_SIZE) {
      throw new Error("This category has too many products to delete at once.")
    }

    for (const product of products) {
      await deleteProductWithRelations(ctx, product._id)
    }
  }
}

async function deleteCategoryTree(ctx: MutationCtx, categoryId: CategoryId) {
  const children = await ctx.db
    .query("catalogCategories")
    .withIndex("by_parentId_and_sortOrder", (q) => q.eq("parentId", categoryId))
    .take(DELETE_BATCH_SIZE)

  if (children.length === DELETE_BATCH_SIZE) {
    throw new Error("This category has too many children to delete at once.")
  }

  for (const child of children) {
    await deleteCategoryTree(ctx, child._id)
  }

  await deleteProductsInCategory(ctx, categoryId)
  await ctx.db.delete(categoryId)
}

export const listCatalog = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db
      .query("catalogCategories")
      .withIndex("by_path")
      .take(300)
    const activeCategories = categories.filter((category) => category.isActive)
    const activeCategoryIds = new Set(
      activeCategories.map((category) => category._id)
    )
    const products = await ctx.db
      .query("products")
      .withIndex("by_status_and_createdAt", (q) => q.eq("status", "published"))
      .order("desc")
      .take(120)

    return {
      categories: activeCategories,
      products: products.filter((product) =>
        activeCategoryIds.has(product.categoryId)
      ),
    }
  },
})

export const getCategoryPage = query({
  args: {
    categoryId: v.id("catalogCategories"),
  },
  handler: async (ctx, args) => {
    const currentCategory = await ctx.db.get(args.categoryId)
    if (!currentCategory?.isActive) {
      return null
    }

    const categories = await ctx.db
      .query("catalogCategories")
      .withIndex("by_path")
      .take(300)
    const activeCategories = categories.filter((category) => category.isActive)
    const childCategoryIds = activeCategories
      .filter((category) => category.parentId === currentCategory._id)
      .map((category) => category._id)
    const products = await listPublishedProductsForCategories(ctx, [
      currentCategory._id,
      ...childCategoryIds,
    ])

    return {
      currentCategory,
      categories: activeCategories,
      products,
    }
  },
})

export const getCategoryPageByPath = query({
  args: {
    path: v.string(),
  },
  handler: async (ctx, args) => {
    const path = normalizeRequiredText("Category path", args.path)
    const currentCategory = await ctx.db
      .query("catalogCategories")
      .withIndex("by_path", (q) => q.eq("path", path))
      .unique()

    if (!currentCategory?.isActive) {
      return null
    }

    const categories = await ctx.db
      .query("catalogCategories")
      .withIndex("by_path")
      .take(300)
    const activeCategories = categories.filter((category) => category.isActive)
    const childCategoryIds = activeCategories
      .filter((category) => category.parentId === currentCategory._id)
      .map((category) => category._id)
    const products = await listPublishedProductsForCategories(ctx, [
      currentCategory._id,
      ...childCategoryIds,
    ])

    return {
      currentCategory,
      categories: activeCategories,
      products,
    }
  },
})

export const getProduct = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db
      .query("products")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique()

    if (!product || product.status !== "published") {
      return null
    }

    const category = await ctx.db.get(product.categoryId)
    if (!category?.isActive) {
      return null
    }

    const categories = await ctx.db
      .query("catalogCategories")
      .withIndex("by_path")
      .take(300)

    return {
      product,
      category,
      categories: categories.filter((item) => item.isActive),
      images: await listImagesForProduct(ctx, product._id),
      options: await listOptionsForProduct(ctx, product._id),
      metadata: await listMetadataForProduct(ctx, product._id, "productPage"),
    }
  },
})

export const getAdminProduct = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const slug = normalizeRequiredText("Product slug", args.slug)
    const product = await ctx.db
      .query("products")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique()

    if (!product) {
      return null
    }

    const category = await ctx.db.get(product.categoryId)
    if (!category) {
      return null
    }

    const categories = await ctx.db
      .query("catalogCategories")
      .withIndex("by_path")
      .take(300)

    return {
      product,
      category,
      categories,
      images: await listImagesForProduct(ctx, product._id),
      options: await listOptionsForProduct(ctx, product._id),
      metadata: await listMetadataForProduct(ctx, product._id),
    }
  },
})

export const getProductInCategoryPath = query({
  args: {
    categoryPath: v.string(),
    productSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const categoryPath = normalizeRequiredText(
      "Category path",
      args.categoryPath
    )
    const productSlug = normalizeRequiredText("Product slug", args.productSlug)
    const category = await ctx.db
      .query("catalogCategories")
      .withIndex("by_path", (q) => q.eq("path", categoryPath))
      .unique()

    if (!category?.isActive) {
      return null
    }

    const product = await ctx.db
      .query("products")
      .withIndex("by_slug", (q) => q.eq("slug", productSlug))
      .unique()

    if (
      !product ||
      product.status !== "published" ||
      product.categoryId !== category._id
    ) {
      return null
    }

    const categories = await ctx.db
      .query("catalogCategories")
      .withIndex("by_path")
      .take(300)

    return {
      product,
      category,
      categories: categories.filter((item) => item.isActive),
      images: await listImagesForProduct(ctx, product._id),
      options: await listOptionsForProduct(ctx, product._id),
      metadata: await listMetadataForProduct(ctx, product._id, "productPage"),
    }
  },
})

export const listAdmin = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db
      .query("catalogCategories")
      .withIndex("by_path")
      .take(300)
    const products = await ctx.db
      .query("products")
      .withIndex("by_createdAt")
      .order("desc")
      .take(200)

    return {
      categories,
      optionTemplates: await listOptionTemplates(ctx),
      products: await Promise.all(
        products.map(async (product) => ({
          product,
          images: await listImagesForProduct(ctx, product._id),
          options: await listOptionsForProduct(ctx, product._id),
          metadata: await listMetadataForProduct(ctx, product._id),
        }))
      ),
    }
  },
})

export const upsertOptionTemplate = mutation({
  args: productOptionTemplateWriteValidator,
  handler: async (ctx, args) => {
    const now = Date.now()
    const fields = normalizeTemplateInput(args)
    const duplicateTemplate = await ctx.db
      .query("productOptionTemplates")
      .withIndex("by_key", (q) => q.eq("key", fields.key))
      .unique()

    if (duplicateTemplate && duplicateTemplate._id !== args.templateId) {
      throw new Error("An option with this label already exists.")
    }

    if (args.templateId === null) {
      return await ctx.db.insert("productOptionTemplates", {
        ...fields,
        createdAt: now,
        updatedAt: now,
      })
    }

    const existingTemplate = await ctx.db.get(args.templateId)
    if (!existingTemplate) {
      throw new Error("Option template not found.")
    }

    await ctx.db.patch(args.templateId, {
      ...fields,
      updatedAt: now,
    })
    await patchProductOptionsForTemplate(ctx, args.templateId, fields, now)

    return args.templateId
  },
})

export const archiveOptionTemplate = mutation({
  args: {
    templateId: v.id("productOptionTemplates"),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId)
    if (!template) {
      throw new Error("Option template not found.")
    }

    await ctx.db.patch(args.templateId, {
      isActive: false,
      updatedAt: Date.now(),
    })

    return null
  },
})

export const upsertCategory = mutation({
  args: {
    categoryId: v.union(v.id("catalogCategories"), v.null()),
    name: v.string(),
    parentId: v.union(v.id("catalogCategories"), v.null()),
    sortOrder: v.number(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const name = normalizeRequiredText("Category name", args.name)
    const slug = slugify(name)
    const placement = await getCategoryPlacement(ctx, args.parentId, slug)

    await assertNoCategoryCycle(ctx, args.categoryId, args.parentId)
    await assertUniqueSiblingSlug(ctx, args.categoryId, args.parentId, slug)

    if (args.categoryId === null) {
      return await ctx.db.insert("catalogCategories", {
        name,
        slug,
        parentId: args.parentId,
        path: placement.path,
        depth: placement.depth,
        cloudinaryFolder: placement.cloudinaryFolder,
        sortOrder: normalizeSortOrder(args.sortOrder),
        isActive: args.isActive,
        createdAt: now,
        updatedAt: now,
      })
    }

    const existingCategory = await getCategoryOrThrow(ctx, args.categoryId)

    await ctx.db.patch(args.categoryId, {
      name,
      slug,
      parentId: args.parentId,
      path: placement.path,
      depth: placement.depth,
      cloudinaryFolder: placement.cloudinaryFolder,
      sortOrder: normalizeSortOrder(args.sortOrder),
      isActive: args.isActive,
      updatedAt: now,
    })

    await syncDescendantCategoryPaths(
      ctx,
      {
        ...existingCategory,
        name,
        slug,
        parentId: args.parentId,
        path: placement.path,
        depth: placement.depth,
        cloudinaryFolder: placement.cloudinaryFolder,
        sortOrder: normalizeSortOrder(args.sortOrder),
        isActive: args.isActive,
        updatedAt: now,
      },
      now
    )

    return args.categoryId
  },
})

export const setCategoryVisibility = mutation({
  args: {
    categoryId: v.id("catalogCategories"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await getCategoryOrThrow(ctx, args.categoryId)

    await ctx.db.patch(args.categoryId, {
      isActive: args.isActive,
      updatedAt: Date.now(),
    })

    return null
  },
})

export const upsertProduct = mutation({
  args: {
    productId: v.union(v.id("products"), v.null()),
    categoryId: v.id("catalogCategories"),
    name: v.string(),
    description: v.string(),
    basePriceCents: v.number(),
    currency: v.string(),
    status: productStatusValidator,
    sku: v.union(v.string(), v.null()),
    cloudinaryAssetFolder: v.union(v.string(), v.null()),
    sortOrder: v.number(),
    images: v.array(productImageWriteValidator),
    options: v.array(productOptionWriteValidator),
    metadata: v.array(productMetadataWriteValidator),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    await getCategoryOrThrow(ctx, args.categoryId)
    const name = normalizeRequiredText("Product name", args.name)
    const slug = slugify(name)
    const duplicateProduct = await ctx.db
      .query("products")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique()

    if (duplicateProduct && duplicateProduct._id !== args.productId) {
      throw new Error("A product with this name already exists.")
    }

    const productAssetFolder = productAssetFolderForWrite({
      productId: args.productId,
      cloudinaryAssetFolder: args.cloudinaryAssetFolder,
    })
    const productImages = normalizeProductImages(
      args.images,
      productAssetFolder
    )
    const primaryImage = productImages[0] ?? null
    const productFields = {
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

    const productId = await saveProductDocument(ctx, {
      productId: args.productId,
      fields: productFields,
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

    await syncProductImages({
      ctx,
      productId,
      images: args.images,
      normalizedImages: productImages,
      now,
    })
    await syncProductOptions(ctx, productId, args.options, now)
    await syncProductMetadata(ctx, productId, args.metadata, now)

    return productId
  },
})

export const reorderCategories = mutation({
  args: {
    parentId: v.union(v.id("catalogCategories"), v.null()),
    orderedCategoryIds: v.array(v.id("catalogCategories")),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    for (const [index, categoryId] of args.orderedCategoryIds.entries()) {
      const category = await ctx.db.get(categoryId)
      if (!category || category.parentId !== args.parentId) {
        throw new Error("Category order does not match this folder.")
      }

      await ctx.db.patch(categoryId, {
        sortOrder: index,
        updatedAt: now,
      })
    }

    return null
  },
})

export const reorderProducts = mutation({
  args: {
    categoryId: v.id("catalogCategories"),
    orderedProductIds: v.array(v.id("products")),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    for (const [index, productId] of args.orderedProductIds.entries()) {
      const product = await ctx.db.get(productId)
      if (!product || product.categoryId !== args.categoryId) {
        throw new Error("Product order does not match this category.")
      }

      await ctx.db.patch(productId, {
        sortOrder: index,
        updatedAt: now,
      })
    }

    return null
  },
})

export const setProductVisibility = mutation({
  args: {
    productId: v.id("products"),
    status: v.union(v.literal("draft"), v.literal("published")),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId)
    if (!product) {
      throw new Error("Product not found.")
    }

    await ctx.db.patch(args.productId, {
      status: args.status,
      updatedAt: Date.now(),
    })

    return null
  },
})

export const archiveProduct = mutation({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId)
    if (!product) {
      throw new Error("Product not found.")
    }

    await ctx.db.patch(args.productId, {
      status: "archived",
      updatedAt: Date.now(),
    })

    return null
  },
})

export const getProductCloudinaryDeletionPlan = internalQuery({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    return await getProductDeletionPlan(ctx, args.productId)
  },
})

export const getCategoryCloudinaryDeletionPlan = internalQuery({
  args: {
    categoryId: v.id("catalogCategories"),
  },
  handler: async (ctx, args) => {
    return await getCategoryDeletionPlan(ctx, args.categoryId)
  },
})

export const deleteProductRecord = internalMutation({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId)
    if (!product) {
      throw new Error("Product not found.")
    }

    await deleteProductWithRelations(ctx, args.productId)

    return null
  },
})

export const deleteCategoryRecord = internalMutation({
  args: {
    categoryId: v.id("catalogCategories"),
  },
  handler: async (ctx, args) => {
    await getCategoryOrThrow(ctx, args.categoryId)
    await deleteCategoryTree(ctx, args.categoryId)

    return null
  },
})
