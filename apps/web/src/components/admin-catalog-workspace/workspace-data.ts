import { sortBySortOrder } from "@/lib/shop"
import { useMemo } from "react"

import { EMPTY_ADMIN_CATEGORIES, EMPTY_PRODUCT_RECORDS } from "./constants"
import {
  categoryKindForAdmin,
  resolveCurrentCategory,
  sortProductRecords,
} from "./model"
import type {
  AdminCategory,
  AdminOptionTemplate,
  AdminProductRecord,
  CategoryId,
} from "./types"

export type AdminCatalogQueryData =
  | {
      categories: Array<AdminCategory>
      optionTemplates: Array<AdminOptionTemplate>
      products: Array<AdminProductRecord>
    }
  | undefined

export function useAdminCatalogWorkspaceData({
  categoryId,
  categoryPath,
  data,
}: {
  categoryId?: CategoryId
  categoryPath?: string
  data: AdminCatalogQueryData
}) {
  const categories = data?.categories ?? EMPTY_ADMIN_CATEGORIES
  const templates = data?.optionTemplates ?? []
  const currentCategory = resolveCurrentCategory({
    categories,
    categoryId,
    categoryPath,
  })
  const currentCategoryKind = currentCategory
    ? categoryKindForAdmin(currentCategory, categories)
    : null
  const parentId = currentCategory?._id ?? null
  const childCategories = useMemo(
    () =>
      sortBySortOrder(
        categories.filter((category) => category.parentId === parentId)
      ),
    [categories, parentId]
  )
  const productRecords = data?.products ?? EMPTY_PRODUCT_RECORDS
  const pageCategoryIds = useMemo(
    () =>
      pageCategoryIdsFor({
        childCategories,
        currentCategory,
        currentCategoryKind,
      }),
    [childCategories, currentCategory, currentCategoryKind]
  )
  const pageProductRecords = useMemo(
    () =>
      sortProductRecords(
        productRecords.filter(
          (record) =>
            !currentCategory || pageCategoryIds.has(record.product.categoryId)
        )
      ),
    [currentCategory, pageCategoryIds, productRecords]
  )
  const directProductRecords = useMemo(
    () =>
      sortProductRecords(
        currentCategory && currentCategoryKind === "collection"
          ? productRecords.filter(
              (record) => record.product.categoryId === currentCategory._id
            )
          : EMPTY_PRODUCT_RECORDS
      ),
    [currentCategory, currentCategoryKind, productRecords]
  )
  const productRecordsById = useMemo(
    () => new Map(productRecords.map((record) => [record.product._id, record])),
    [productRecords]
  )
  const groupCategories = useMemo(
    () =>
      sortBySortOrder(
        categories.filter(
          (category) =>
            category.parentId === null &&
            categoryKindForAdmin(category, categories) === "group"
        )
      ),
    [categories]
  )
  const productAssignableCategories = useMemo(
    () =>
      productAssignableCategoriesFor({
        categories,
        childCategories,
        currentCategory,
        currentCategoryKind,
      }),
    [categories, childCategories, currentCategory, currentCategoryKind]
  )
  const pageProducts = useMemo(
    () => pageProductRecords.map((record) => record.product),
    [pageProductRecords]
  )

  return {
    canAddCollection:
      currentCategory === null || currentCategoryKind === "group",
    canAddGroup: currentCategory === null,
    canAddProduct: currentCategoryKind === "collection",
    categories,
    childCategories,
    currentCategory,
    currentCategoryKind,
    directProductRecords,
    groupCategories,
    pageProducts,
    parentId,
    productAssignableCategories,
    productRecords,
    productRecordsById,
    templates,
  }
}

function pageCategoryIdsFor({
  childCategories,
  currentCategory,
  currentCategoryKind,
}: {
  childCategories: Array<AdminCategory>
  currentCategory: AdminCategory | null
  currentCategoryKind: "collection" | "group" | null
}) {
  if (!currentCategory) {
    return new Set<CategoryId>()
  }

  if (currentCategoryKind === "group") {
    return new Set<CategoryId>(childCategories.map((category) => category._id))
  }

  return new Set<CategoryId>([currentCategory._id])
}

function productAssignableCategoriesFor({
  categories,
  childCategories,
  currentCategory,
  currentCategoryKind,
}: {
  categories: Array<AdminCategory>
  childCategories: Array<AdminCategory>
  currentCategory: AdminCategory | null
  currentCategoryKind: "collection" | "group" | null
}) {
  if (!currentCategory) {
    return []
  }

  if (currentCategoryKind === "group") {
    return childCategories.filter(
      (category) => categoryKindForAdmin(category, categories) === "collection"
    )
  }

  return [currentCategory]
}
