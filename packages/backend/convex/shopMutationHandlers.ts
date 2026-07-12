import type { MutationCtx, QueryCtx } from "./_generated/server"
import {
  deleteCategoryTree,
  deleteProductWithRelations,
  getCategoryDeletionPlan,
  getProductDeletionPlan,
} from "./shopDeletionModel"
import {
  normalizeRequiredText,
  normalizeSortOrder,
  normalizeTemplateInput,
  slugify,
} from "./shopNormalize"
import {
  patchProductOptionsForTemplate,
  upsertProductRecord,
} from "./shopProductModel"
import {
  assertNoCategoryCycle,
  assertUniqueSiblingSlug,
  getCategoryOrThrow,
  getCategoryPlacement,
  productCloudinaryUploadFolder,
  syncDescendantCategoryPaths,
} from "./shopQueryModel"
import type {
  CategoryId,
  CategoryKind,
  ProductId,
  ProductOptionTemplateId,
  ProductStatus,
  ProductUpsertArgs,
} from "./shopTypes"

export async function upsertOptionTemplateHandler(
  ctx: MutationCtx,
  args: Parameters<typeof normalizeTemplateInput>[0] & {
    templateId: ProductOptionTemplateId | null
  }
) {
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

  await ctx.db.patch(args.templateId, { ...fields, updatedAt: now })
  await patchProductOptionsForTemplate(ctx, args.templateId, fields, now)

  return args.templateId
}

export async function archiveOptionTemplateHandler(
  ctx: MutationCtx,
  args: { templateId: ProductOptionTemplateId }
) {
  const template = await ctx.db.get(args.templateId)
  if (!template) {
    throw new Error("Option template not found.")
  }

  await ctx.db.patch(args.templateId, {
    isActive: false,
    updatedAt: Date.now(),
  })

  return null
}

export async function upsertCategoryHandler(
  ctx: MutationCtx,
  args: {
    categoryId: CategoryId | null
    kind?: CategoryKind
    name: string
    parentId: CategoryId | null
    sortOrder: number
    isActive: boolean
  }
) {
  const now = Date.now()
  const name = normalizeRequiredText("Category name", args.name)
  const slug = slugify(name)
  const kind = args.kind ?? "collection"
  const placement = await getCategoryPlacement(ctx, args.parentId, slug, kind)

  await assertNoCategoryCycle(ctx, args.categoryId, args.parentId)
  await assertUniqueSiblingSlug(ctx, args.categoryId, args.parentId, slug)

  if (args.categoryId === null) {
    return await ctx.db.insert("catalogCategories", {
      name,
      slug,
      kind,
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
  const sortOrder = normalizeSortOrder(args.sortOrder)

  await ctx.db.patch(args.categoryId, {
    name,
    slug,
    kind,
    parentId: args.parentId,
    path: placement.path,
    depth: placement.depth,
    cloudinaryFolder: placement.cloudinaryFolder,
    sortOrder,
    isActive: args.isActive,
    updatedAt: now,
  })
  await syncDescendantCategoryPaths(
    ctx,
    {
      ...existingCategory,
      name,
      slug,
      kind,
      parentId: args.parentId,
      path: placement.path,
      depth: placement.depth,
      cloudinaryFolder: placement.cloudinaryFolder,
      sortOrder,
      isActive: args.isActive,
      updatedAt: now,
    },
    now
  )

  return args.categoryId
}

export async function setCategoryVisibilityHandler(
  ctx: MutationCtx,
  args: { categoryId: CategoryId; isActive: boolean }
) {
  await getCategoryOrThrow(ctx, args.categoryId)
  await ctx.db.patch(args.categoryId, {
    isActive: args.isActive,
    updatedAt: Date.now(),
  })

  return null
}

export async function upsertProductHandler(
  ctx: MutationCtx,
  args: ProductUpsertArgs
) {
  const result = await upsertProductRecord(ctx, args)
  return result.productId
}

export async function reorderCategoriesHandler(
  ctx: MutationCtx,
  args: { parentId: CategoryId | null; orderedCategoryIds: Array<CategoryId> }
) {
  const now = Date.now()

  await Promise.all(
    args.orderedCategoryIds.map(async (categoryId, index) => {
      const category = await ctx.db.get(categoryId)
      if (!category || category.parentId !== args.parentId) {
        throw new Error("Category order does not match this folder.")
      }

      await ctx.db.patch(categoryId, { sortOrder: index, updatedAt: now })
    })
  )

  return null
}

export async function reorderProductsHandler(
  ctx: MutationCtx,
  args: { categoryId: CategoryId; orderedProductIds: Array<ProductId> }
) {
  const now = Date.now()

  await Promise.all(
    args.orderedProductIds.map(async (productId, index) => {
      const product = await ctx.db.get(productId)
      if (!product || product.categoryId !== args.categoryId) {
        throw new Error("Product order does not match this category.")
      }

      await ctx.db.patch(productId, { sortOrder: index, updatedAt: now })
    })
  )

  return null
}

export async function setProductVisibilityHandler(
  ctx: MutationCtx,
  args: { productId: ProductId; status: ProductStatus }
) {
  const product = await ctx.db.get(args.productId)
  if (!product) {
    throw new Error("Product not found.")
  }

  await ctx.db.patch(args.productId, {
    status: args.status,
    updatedAt: Date.now(),
  })

  return null
}

export async function archiveProductHandler(
  ctx: MutationCtx,
  args: { productId: ProductId }
) {
  const product = await ctx.db.get(args.productId)
  if (!product) {
    throw new Error("Product not found.")
  }

  await ctx.db.patch(args.productId, {
    status: "archived",
    updatedAt: Date.now(),
  })

  return null
}

export async function getProductCloudinaryDeletionPlanHandler(
  ctx: QueryCtx,
  args: { productId: ProductId }
) {
  return await getProductDeletionPlan(ctx, args.productId)
}

export async function getCategoryCloudinaryDeletionPlanHandler(
  ctx: QueryCtx,
  args: { categoryId: CategoryId }
) {
  return await getCategoryDeletionPlan(ctx, args.categoryId)
}

export async function getProductCloudinaryUploadFolderHandler(
  ctx: QueryCtx,
  args: { productId: ProductId }
) {
  return await productCloudinaryUploadFolder(ctx, args.productId)
}

export async function upsertProductRecordForCloudinaryCleanupHandler(
  ctx: MutationCtx,
  args: ProductUpsertArgs
) {
  return await upsertProductRecord(ctx, args)
}

export async function deleteProductRecordHandler(
  ctx: MutationCtx,
  args: { productId: ProductId }
) {
  const product = await ctx.db.get(args.productId)
  if (!product) {
    throw new Error("Product not found.")
  }

  await deleteProductWithRelations(ctx, args.productId)

  return null
}

export async function deleteCategoryRecordHandler(
  ctx: MutationCtx,
  args: { categoryId: CategoryId }
) {
  await getCategoryOrThrow(ctx, args.categoryId)
  await deleteCategoryTree(ctx, args.categoryId)

  return null
}
