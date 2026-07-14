import { BASE_CURRENCY } from "@/lib/money"
import {
  centsToPriceInput,
  displayOptionLabel,
  priceInputToCents,
  sortBySortOrder,
} from "@/lib/shop"

import type {
  AdminCategory,
  AdminOptionTemplate,
  AdminProductRecord,
  CategoryFormState,
  CategoryId,
  CategoryKind,
  ProductFormState,
  ProductImageFormState,
  ProductMetadataType,
  ProductOptionId,
  ProductRecordStatus,
  ProductStatus,
} from "./types"

export function createLocalId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function nullableText(value: string) {
  const nextValue = value.trim()
  return nextValue ? nextValue : null
}

export function parseSortOrder(value: string, fallback: number) {
  const parsedValue = Number.parseInt(value, 10)
  return Number.isFinite(parsedValue) ? parsedValue : fallback
}

export function productVisibilityStatus(
  status: ProductRecordStatus
): ProductStatus {
  return status === "published" ? "published" : "draft"
}

export function categoryKindForAdmin(
  category: AdminCategory,
  categories: Array<AdminCategory>
): CategoryKind {
  if (category.kind) {
    return category.kind
  }

  return categories.some((item) => item.parentId === category._id)
    ? "group"
    : "collection"
}

export function categoryLabel(kind: CategoryKind) {
  return kind === "group" ? "group" : "collection"
}

export function categoryTitle(kind: CategoryKind) {
  return kind === "group" ? "Group" : "Collection"
}

export function categoryFormAutosaveKey(form: CategoryFormState) {
  return JSON.stringify({
    categoryId: form.categoryId,
    kind: form.kind,
    name: form.name,
    logoUrl: form.logoUrl,
    parentId: form.parentId,
    sortOrder: form.sortOrder,
    isActive: form.isActive,
  })
}

export function productFormAutosaveKey(form: ProductFormState) {
  return JSON.stringify({
    productId: form.productId,
    categoryId: form.categoryId,
    name: form.name,
    description: form.description,
    basePrice: form.basePrice,
    currency: form.currency,
    status: form.status,
    sku: form.sku,
    cloudinaryAssetFolder: form.cloudinaryAssetFolder,
    images: form.images.map((image) => ({
      imageId: image.imageId,
      imageUrl: image.imageUrl,
      cloudinaryPublicId: image.cloudinaryPublicId,
      cloudinaryAssetFolder: image.cloudinaryAssetFolder,
    })),
    sortOrder: form.sortOrder,
    optionTemplateIds: form.optionTemplateIds,
    optionIdsByTemplateId: form.optionIdsByTemplateId,
    metadata: form.metadata.map((item) => ({
      metadataId: item.metadataId,
      label: item.label,
      type: item.type,
      value: item.value,
      showOnProductPage: item.showOnProductPage,
    })),
  })
}

export function metadataTypeFromValue(value: string): ProductMetadataType {
  if (value === "number" || value === "boolean" || value === "link") {
    return value
  }

  return "text"
}

export function emptyCategoryForm(
  kind: CategoryKind,
  parentId: CategoryId | null,
  sortOrder: number
): CategoryFormState {
  return {
    categoryId: null,
    kind,
    name: "",
    logoUrl: "",
    parentId,
    sortOrder: String(sortOrder),
    isActive: true,
  }
}

export function emptyProductForm(
  categoryId: CategoryId | null,
  templates: Array<AdminOptionTemplate>,
  sortOrder: number
): ProductFormState {
  return {
    productId: null,
    categoryId,
    name: "",
    description: "",
    basePrice: "29.90",
    currency: BASE_CURRENCY,
    status: "published",
    sku: "",
    cloudinaryAssetFolder: "",
    images: [],
    sortOrder: String(sortOrder),
    optionTemplateIds: templates.flatMap((template) =>
      template.isActive && template.isRequired ? [template._id] : []
    ),
    optionIdsByTemplateId: {},
    metadata: [],
  }
}

export function productRecordToForm(
  record: AdminProductRecord
): ProductFormState {
  const optionIdsByTemplateId = Object.fromEntries(
    record.options.flatMap((option) =>
      option.templateId ? [[option.templateId, option._id]] : []
    )
  ) as Record<string, ProductOptionId>

  return {
    productId: record.product._id,
    categoryId: record.product.categoryId,
    name: record.product.name,
    description: record.product.description,
    basePrice: centsToPriceInput(record.product.basePriceCents),
    currency: BASE_CURRENCY,
    status: productVisibilityStatus(record.product.status),
    sku: record.product.sku ?? "",
    cloudinaryAssetFolder: productRecordCloudinaryAssetFolder(record),
    images: productRecordImagesToForm(record),
    sortOrder: String(record.product.sortOrder ?? 0),
    optionTemplateIds: record.options.flatMap((option) =>
      option.templateId ? [option.templateId] : []
    ),
    optionIdsByTemplateId,
    metadata: record.metadata.map((item) => ({
      localId: createLocalId("metadata"),
      metadataId: item._id,
      label: item.label,
      type: item.type ?? (item.linkUrl ? "link" : "text"),
      value: item.value,
      showOnProductPage: item.showOnProductPage ?? true,
    })),
  }
}

export function productRecordCloudinaryAssetFolder(record: AdminProductRecord) {
  return (
    sortBySortOrder(record.images).find((image) => image.cloudinaryAssetFolder)
      ?.cloudinaryAssetFolder ??
    record.product.cloudinaryAssetFolder ??
    ""
  )
}

export function productRecordImagesToForm(
  record: AdminProductRecord
): Array<ProductImageFormState> {
  const images =
    record.images.length > 0
      ? sortBySortOrder(record.images)
      : record.product.imageUrl
        ? [
            {
              _id: null,
              imageUrl: record.product.imageUrl,
              cloudinaryPublicId: record.product.cloudinaryPublicId,
              cloudinaryAssetFolder: record.product.cloudinaryAssetFolder,
              sortOrder: 0,
            },
          ]
        : []

  return images.map((image) => ({
    localId: createLocalId("image"),
    imageId: image._id,
    imageUrl: image.imageUrl,
    cloudinaryPublicId: image.cloudinaryPublicId ?? "",
    cloudinaryAssetFolder: image.cloudinaryAssetFolder ?? "",
  }))
}

export function buildOptionsFromTemplates(
  form: ProductFormState,
  templates: Array<AdminOptionTemplate>
) {
  const activeTemplateIds = new Set(form.optionTemplateIds)

  return templates.flatMap((template, index) => {
    if (!template.isActive || !activeTemplateIds.has(template._id)) {
      return []
    }

    return [
      {
        optionId: form.optionIdsByTemplateId[template._id] ?? null,
        templateId: template._id,
        label: displayOptionLabel(template.label),
        key: template.key,
        isRequired: template.isRequired,
        priceDeltaCents: template.priceDeltaCents,
        sortOrder: template.sortOrder || index,
        config: template.config,
      },
    ]
  })
}

export function productUpsertPayload({
  form,
  productRecords,
  templates,
}: {
  form: ProductFormState
  productRecords: Array<AdminProductRecord>
  templates: Array<AdminOptionTemplate>
}) {
  if (!form.categoryId) {
    throw new Error("Select a collection before saving the product.")
  }

  const productSortFallback = productRecords.filter(
    (record) => record.product.categoryId === form.categoryId
  ).length

  return {
    productId: form.productId,
    categoryId: form.categoryId,
    name: form.name,
    description: form.description,
    basePriceCents: priceInputToCents(form.basePrice),
    currency: BASE_CURRENCY,
    status: form.status,
    sku: nullableText(form.sku),
    cloudinaryAssetFolder: nullableText(form.cloudinaryAssetFolder),
    sortOrder: parseSortOrder(form.sortOrder, productSortFallback),
    images: form.images.map((image, index) => ({
      imageId: image.imageId,
      imageUrl: image.imageUrl,
      cloudinaryPublicId: nullableText(image.cloudinaryPublicId),
      cloudinaryAssetFolder: nullableText(image.cloudinaryAssetFolder),
      sortOrder: index,
    })),
    options: buildOptionsFromTemplates(form, templates),
    metadata: form.metadata.map((item, index) => ({
      metadataId: item.metadataId,
      label: item.label,
      type: item.type,
      value: item.value,
      linkUrl: null,
      showOnProductPage: item.showOnProductPage,
      sortOrder: index,
    })),
  }
}

export function sortProductRecords(records: Array<AdminProductRecord>) {
  return Array.from(records).toSorted((first, second) => {
    const firstOrder = first.product.sortOrder ?? Number.MAX_SAFE_INTEGER
    const secondOrder = second.product.sortOrder ?? Number.MAX_SAFE_INTEGER

    if (firstOrder !== secondOrder) {
      return firstOrder - secondOrder
    }

    return first.product.name.localeCompare(second.product.name)
  })
}

export function parentAdminHref(category: AdminCategory) {
  const parentPath = category.path.split("/").slice(0, -1).join("/")

  return parentPath ? `/admin/${parentPath}` : "/admin"
}

export function resolveCurrentCategory({
  categories,
  categoryId,
  categoryPath,
}: {
  categories: Array<AdminCategory>
  categoryId?: CategoryId
  categoryPath?: string
}) {
  if (categoryId !== undefined) {
    return categories.find((category) => category._id === categoryId) ?? null
  }

  if (categoryPath) {
    return categories.find((category) => category.path === categoryPath) ?? null
  }

  return null
}
