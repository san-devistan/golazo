import { v } from "convex/values"

import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server"
import {
  archiveOptionTemplateHandler,
  archiveProductHandler,
  deleteCategoryRecordHandler,
  deleteProductRecordHandler,
  getCategoryCloudinaryDeletionPlanHandler,
  getProductCloudinaryDeletionPlanHandler,
  getProductCloudinaryUploadFolderHandler,
  reorderCategoriesHandler,
  reorderProductsHandler,
  setCategoryVisibilityHandler,
  setProductVisibilityHandler,
  upsertCategoryHandler,
  upsertOptionTemplateHandler,
  upsertProductHandler,
  upsertProductRecordForCloudinaryCleanupHandler,
} from "./shopMutationHandlers"
import {
  getAdminProductHandler,
  getCategoryPageByPathHandler,
  getCategoryPageHandler,
  getProductHandler,
  getProductInCategoryPathHandler,
  listAdminHandler,
  listCatalogHandler,
} from "./shopQueryHandlers"
import {
  categoryKindValidator,
  productOptionTemplateWriteValidator,
  productUpsertArgsValidator,
} from "./shopValidators"

export const listCatalog = query({
  args: {},
  handler: listCatalogHandler,
})

export const getCategoryPage = query({
  args: {
    categoryId: v.id("catalogCategories"),
  },
  handler: getCategoryPageHandler,
})

export const getCategoryPageByPath = query({
  args: {
    path: v.string(),
  },
  handler: getCategoryPageByPathHandler,
})

export const getProduct = query({
  args: {
    slug: v.string(),
  },
  handler: getProductHandler,
})

export const getAdminProduct = query({
  args: {
    slug: v.string(),
  },
  handler: getAdminProductHandler,
})

export const getProductInCategoryPath = query({
  args: {
    categoryPath: v.string(),
    productSlug: v.string(),
  },
  handler: getProductInCategoryPathHandler,
})

export const listAdmin = query({
  args: {},
  handler: listAdminHandler,
})

export const upsertOptionTemplate = mutation({
  args: productOptionTemplateWriteValidator,
  handler: upsertOptionTemplateHandler,
})

export const archiveOptionTemplate = mutation({
  args: {
    templateId: v.id("productOptionTemplates"),
  },
  handler: archiveOptionTemplateHandler,
})

export const upsertCategory = mutation({
  args: {
    categoryId: v.union(v.id("catalogCategories"), v.null()),
    kind: v.optional(categoryKindValidator),
    name: v.string(),
    logoUrl: v.optional(v.union(v.string(), v.null())),
    parentId: v.union(v.id("catalogCategories"), v.null()),
    sortOrder: v.number(),
    isActive: v.boolean(),
  },
  handler: upsertCategoryHandler,
})

export const setCategoryVisibility = mutation({
  args: {
    categoryId: v.id("catalogCategories"),
    isActive: v.boolean(),
  },
  handler: setCategoryVisibilityHandler,
})

export const upsertProduct = mutation({
  args: productUpsertArgsValidator,
  handler: upsertProductHandler,
})

export const reorderCategories = mutation({
  args: {
    parentId: v.union(v.id("catalogCategories"), v.null()),
    orderedCategoryIds: v.array(v.id("catalogCategories")),
  },
  handler: reorderCategoriesHandler,
})

export const reorderProducts = mutation({
  args: {
    categoryId: v.id("catalogCategories"),
    orderedProductIds: v.array(v.id("products")),
  },
  handler: reorderProductsHandler,
})

export const setProductVisibility = mutation({
  args: {
    productId: v.id("products"),
    status: v.union(v.literal("draft"), v.literal("published")),
  },
  handler: setProductVisibilityHandler,
})

export const archiveProduct = mutation({
  args: {
    productId: v.id("products"),
  },
  handler: archiveProductHandler,
})

export const getProductCloudinaryDeletionPlan = internalQuery({
  args: {
    productId: v.id("products"),
  },
  handler: getProductCloudinaryDeletionPlanHandler,
})

export const getCategoryCloudinaryDeletionPlan = internalQuery({
  args: {
    categoryId: v.id("catalogCategories"),
  },
  handler: getCategoryCloudinaryDeletionPlanHandler,
})

export const getProductCloudinaryUploadFolder = internalQuery({
  args: {
    productId: v.id("products"),
  },
  handler: getProductCloudinaryUploadFolderHandler,
})

export const upsertProductRecordForCloudinaryCleanup = internalMutation({
  args: productUpsertArgsValidator,
  handler: upsertProductRecordForCloudinaryCleanupHandler,
})

export const deleteProductRecord = internalMutation({
  args: {
    productId: v.id("products"),
  },
  handler: deleteProductRecordHandler,
})

export const deleteCategoryRecord = internalMutation({
  args: {
    categoryId: v.id("catalogCategories"),
  },
  handler: deleteCategoryRecordHandler,
})
