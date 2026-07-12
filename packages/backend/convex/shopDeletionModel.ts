import type { MutationCtx, QueryCtx } from "./_generated/server"
import {
  cloudinaryFolderForCollectionLogoId,
  cloudinaryFolderForProductId,
  cloudinaryPublicIdForCollectionLogoId,
} from "./cloudinaryFolders"
import { uniqueNonNullValues } from "./shopNormalize"
import {
  DELETE_BATCH_SIZE,
  PRODUCT_STATUSES,
  type CategoryId,
  type ProductDeletionPlan,
  type ProductId,
} from "./shopTypes"

export async function getProductDeletionPlan(
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
      cloudinaryFolderForProductId(productId),
      product.cloudinaryAssetFolder,
      ...images.map((image) => image.cloudinaryAssetFolder),
    ]),
  }
}

export async function getCategoryDeletionPlan(
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

  const childPlans = await Promise.all(
    children.map((child) => getCategoryDeletionPlan(ctx, child._id))
  )
  const productGroups = await Promise.all(
    PRODUCT_STATUSES.map(async (status) => {
      const products = await ctx.db
        .query("products")
        .withIndex("by_categoryId_and_status", (q) =>
          q.eq("categoryId", categoryId).eq("status", status)
        )
        .take(DELETE_BATCH_SIZE)

      if (products.length === DELETE_BATCH_SIZE) {
        throw new Error(
          "This category has too many products to delete at once."
        )
      }

      return products
    })
  )
  const productPlans = await Promise.all(
    productGroups
      .flat()
      .map((product) => getProductDeletionPlan(ctx, product._id))
  )

  return {
    cloudinaryPublicIds: uniqueNonNullValues([
      category.logoUrl
        ? cloudinaryPublicIdForCollectionLogoId(category._id)
        : null,
      ...childPlans.flatMap((plan) => plan.cloudinaryPublicIds),
      ...productPlans.flatMap((plan) => plan.cloudinaryPublicIds),
    ]),
    cloudinaryAssetFolders: uniqueNonNullValues([
      category.cloudinaryFolder,
      category.logoUrl
        ? cloudinaryFolderForCollectionLogoId(category._id)
        : null,
      ...childPlans.flatMap((plan) => plan.cloudinaryAssetFolders),
      ...productPlans.flatMap((plan) => plan.cloudinaryAssetFolders),
    ]),
  }
}

export async function deleteProductWithRelations(
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

  await Promise.all([
    ...images.map((image) => ctx.db.delete(image._id)),
    ...options.map((option) => ctx.db.delete(option._id)),
    ...metadata.map((item) => ctx.db.delete(item._id)),
  ])

  await ctx.db.delete(productId)
}

async function deleteProductsInCategory(
  ctx: MutationCtx,
  categoryId: CategoryId
) {
  const productGroups = await Promise.all(
    PRODUCT_STATUSES.map(async (status) => {
      const products = await ctx.db
        .query("products")
        .withIndex("by_categoryId_and_status", (q) =>
          q.eq("categoryId", categoryId).eq("status", status)
        )
        .take(DELETE_BATCH_SIZE)

      if (products.length === DELETE_BATCH_SIZE) {
        throw new Error(
          "This category has too many products to delete at once."
        )
      }

      return products
    })
  )

  await Promise.all(
    productGroups
      .flat()
      .map((product) => deleteProductWithRelations(ctx, product._id))
  )
}

export async function deleteCategoryTree(
  ctx: MutationCtx,
  categoryId: CategoryId
) {
  const children = await ctx.db
    .query("catalogCategories")
    .withIndex("by_parentId_and_sortOrder", (q) => q.eq("parentId", categoryId))
    .take(DELETE_BATCH_SIZE)

  if (children.length === DELETE_BATCH_SIZE) {
    throw new Error("This category has too many children to delete at once.")
  }

  await Promise.all(children.map((child) => deleteCategoryTree(ctx, child._id)))
  await deleteProductsInCategory(ctx, categoryId)
  await ctx.db.delete(categoryId)
}
