import type { QueryCtx } from "./_generated/server"
import { normalizeRequiredText } from "./shopNormalize"
import {
  listImagesForProduct,
  listMetadataForProduct,
  listOptionTemplates,
  listOptionsForProduct,
  listPublishedProductsForCategories,
  productsWithImageUrls,
} from "./shopQueryModel"
import type { CategoryDoc, CategoryId, ProductDoc } from "./shopTypes"

async function activeCategories(ctx: QueryCtx) {
  const categories = await ctx.db
    .query("catalogCategories")
    .withIndex("by_path")
    .take(300)

  return categories.filter((category) => category.isActive)
}

export async function listCatalogHandler(ctx: QueryCtx) {
  const categories = await activeCategories(ctx)
  const activeCategoryIds = new Set(categories.map((category) => category._id))
  const products = await ctx.db
    .query("products")
    .withIndex("by_status_and_createdAt", (q) => q.eq("status", "published"))
    .order("desc")
    .take(120)
  const activeProducts = products.filter((product) =>
    activeCategoryIds.has(product.categoryId)
  )

  return {
    categories,
    products: await productsWithImageUrls(ctx, activeProducts),
  }
}

async function categoryPagePayload(
  ctx: QueryCtx,
  currentCategory: CategoryDoc
) {
  const categories = await activeCategories(ctx)
  const childCategoryIds = categories
    .filter((category) => category.parentId === currentCategory._id)
    .map((category) => category._id)
  const products = await listPublishedProductsForCategories(ctx, [
    currentCategory._id,
    ...childCategoryIds,
  ])

  return { currentCategory, categories, products }
}

export async function getCategoryPageHandler(
  ctx: QueryCtx,
  args: { categoryId: CategoryId }
) {
  const currentCategory = await ctx.db.get(args.categoryId)

  return currentCategory?.isActive
    ? await categoryPagePayload(ctx, currentCategory)
    : null
}

export async function getCategoryPageByPathHandler(
  ctx: QueryCtx,
  args: { path: string }
) {
  const path = normalizeRequiredText("Category path", args.path)
  const currentCategory = await ctx.db
    .query("catalogCategories")
    .withIndex("by_path", (q) => q.eq("path", path))
    .unique()

  return currentCategory?.isActive
    ? await categoryPagePayload(ctx, currentCategory)
    : null
}

async function productDetailPayload(
  ctx: QueryCtx,
  product: ProductDoc,
  metadataVisibility: "all" | "productPage",
  includeInactiveCategories: boolean
) {
  const category = await ctx.db.get(product.categoryId)
  if (!category || (!includeInactiveCategories && !category.isActive)) {
    return null
  }

  const categories = await ctx.db
    .query("catalogCategories")
    .withIndex("by_path")
    .take(300)

  return {
    product,
    category,
    categories: includeInactiveCategories
      ? categories
      : categories.filter((item) => item.isActive),
    images: await listImagesForProduct(ctx, product._id),
    options: await listOptionsForProduct(ctx, product._id),
    metadata: await listMetadataForProduct(
      ctx,
      product._id,
      metadataVisibility
    ),
  }
}

export async function getProductHandler(ctx: QueryCtx, args: { slug: string }) {
  const product = await ctx.db
    .query("products")
    .withIndex("by_slug", (q) => q.eq("slug", args.slug))
    .unique()

  if (!product || product.status !== "published") {
    return null
  }

  return await productDetailPayload(ctx, product, "productPage", false)
}

export async function getAdminProductHandler(
  ctx: QueryCtx,
  args: { slug: string }
) {
  const slug = normalizeRequiredText("Product slug", args.slug)
  const product = await ctx.db
    .query("products")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique()

  return product ? await productDetailPayload(ctx, product, "all", true) : null
}

export async function getProductInCategoryPathHandler(
  ctx: QueryCtx,
  args: { categoryPath: string; productSlug: string }
) {
  const categoryPath = normalizeRequiredText("Category path", args.categoryPath)
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

  return await productDetailPayload(ctx, product, "productPage", false)
}

export async function listAdminHandler(ctx: QueryCtx) {
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
}
