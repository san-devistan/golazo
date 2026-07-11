import type { MutationCtx, QueryCtx } from "./_generated/server"
import {
  cloudinaryFolderForCatalogPath,
  cloudinaryFolderForProductId,
} from "./cloudinaryFolders"
import {
  normalizeNullableText,
  normalizeRequiredText,
  normalizeSortOrder,
} from "./shopNormalize"
import {
  CATEGORY_PAGE_CHILD_LIMIT,
  CATEGORY_PAGE_PRODUCTS_PER_SECTION,
  PRODUCT_IMAGE_LIMIT,
  type CategoryDoc,
  type CategoryId,
  type CategoryPlacement,
  type ProductDoc,
  type ProductId,
} from "./shopTypes"

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

function uniqueProductImageUrls({
  images,
  product,
}: {
  images: Array<{ imageUrl: string }>
  product: ProductDoc
}) {
  const imageUrls = new Set<string>()

  if (product.imageUrl) {
    imageUrls.add(product.imageUrl)
  }

  for (const image of images) {
    imageUrls.add(image.imageUrl)
  }

  return Array.from(imageUrls)
}

export async function listImagesForProduct(
  ctx: QueryCtx | MutationCtx,
  productId: ProductId
) {
  return await ctx.db
    .query("productImages")
    .withIndex("by_productId_and_sortOrder", (q) =>
      q.eq("productId", productId)
    )
    .take(PRODUCT_IMAGE_LIMIT)
}

async function productWithImageUrls(ctx: QueryCtx, product: ProductDoc) {
  const images = await listImagesForProduct(ctx, product._id)

  return {
    ...product,
    imageUrls: uniqueProductImageUrls({ images, product }),
  }
}

export async function productsWithImageUrls(
  ctx: QueryCtx,
  products: Array<ProductDoc>
) {
  return await Promise.all(
    products.map((product) => productWithImageUrls(ctx, product))
  )
}

export async function listPublishedProductsForCategories(
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

  return await productsWithImageUrls(ctx, productGroups.flat())
}

export async function listOptionsForProduct(
  ctx: QueryCtx,
  productId: ProductId
) {
  return await ctx.db
    .query("productOptions")
    .withIndex("by_productId_and_sortOrder", (q) =>
      q.eq("productId", productId)
    )
    .take(100)
}

export async function listMetadataForProduct(
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

  return visibility === "productPage"
    ? metadata.filter((item) => item.showOnProductPage ?? true)
    : metadata
}

export async function listOptionTemplates(ctx: QueryCtx) {
  return await ctx.db
    .query("productOptionTemplates")
    .withIndex("by_sortOrder")
    .take(100)
}

function cloudinaryFolderForPath(path: string) {
  return cloudinaryFolderForCatalogPath(path)
}

export async function getCategoryOrThrow(
  ctx: QueryCtx | MutationCtx,
  categoryId: CategoryId
) {
  const category = await ctx.db.get(categoryId)
  if (!category) {
    throw new Error("Category not found.")
  }

  return category
}

export async function getCategoryPlacement(
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

export async function assertNoCategoryCycle(
  ctx: MutationCtx,
  categoryId: CategoryId | null,
  parentId: CategoryId | null
) {
  if (categoryId === null || parentId === null) {
    return
  }

  if (parentId === categoryId) {
    throw new Error("A category cannot be moved under itself.")
  }

  const parent = await getCategoryOrThrow(ctx, parentId)
  await assertNoCategoryCycle(ctx, categoryId, parent.parentId)
}

export async function assertUniqueSiblingSlug(
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

export async function syncDescendantCategoryPaths(
  ctx: MutationCtx,
  parent: CategoryDoc,
  now: number
) {
  const children = await ctx.db
    .query("catalogCategories")
    .withIndex("by_parentId_and_sortOrder", (q) => q.eq("parentId", parent._id))
    .take(200)

  await Promise.all(
    children.map(async (child) => {
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
    })
  )
}

export async function productCloudinaryUploadFolder(
  ctx: QueryCtx,
  productId: ProductId
) {
  const product = await ctx.db.get(productId)
  if (!product) {
    throw new Error("Product not found.")
  }

  const images = await listImagesForProduct(ctx, productId)
  const imageFolder =
    images.find((image) => normalizeNullableText(image.cloudinaryAssetFolder))
      ?.cloudinaryAssetFolder ?? null

  if (imageFolder) {
    return imageFolder
  }

  const productFolder = normalizeNullableText(product.cloudinaryAssetFolder)
  return productFolder || cloudinaryFolderForProductId(productId)
}

export { normalizeRequiredText, normalizeSortOrder }
