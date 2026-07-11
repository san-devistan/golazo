import { normalizeCatalogPath } from "@/lib/catalog-navigation"
import type { GenericId } from "convex/values"

export type ShopHeaderCategory = {
  _id: string
  name: string
  parentId: string | null
  path?: string | null
  sortOrder: number
}

export type ShopHeaderProduct = {
  _id: GenericId<"products">
  categoryId: string
  name: string
  slug?: string | null
  basePriceCents: number
  currency: string
  imageUrl: string | null
  imageUrls?: Array<string>
  sortOrder?: number
}

export type ShopHeaderMode = "admin" | "public"

export type CategoriesByParentId = Map<string | null, Array<ShopHeaderCategory>>
export type ProductsByCategoryId = Map<string, Array<ShopHeaderProduct>>

export const EMPTY_HEADER_CATEGORIES: Array<ShopHeaderCategory> = []
export const EMPTY_HEADER_PRODUCTS: Array<ShopHeaderProduct> = []

function sortCategories<T extends ShopHeaderCategory>(categories: Array<T>) {
  return Array.from(categories).toSorted((first, second) => {
    if (first.sortOrder !== second.sortOrder) {
      return first.sortOrder - second.sortOrder
    }

    return first.name.localeCompare(second.name)
  })
}

export function groupCategoriesByParentId<T extends ShopHeaderCategory>(
  categories: Array<T>
) {
  const categoriesByParentId = new Map<string | null, Array<T>>()

  for (const category of categories) {
    const siblingCategories = categoriesByParentId.get(category.parentId)

    if (siblingCategories) {
      siblingCategories.push(category)
    } else {
      categoriesByParentId.set(category.parentId, [category])
    }
  }

  for (const [parentId, siblingCategories] of categoriesByParentId) {
    categoriesByParentId.set(parentId, sortCategories(siblingCategories))
  }

  return categoriesByParentId
}

export function isCategoryActive(
  category: ShopHeaderCategory,
  currentCategoryId?: string | null,
  currentCategoryPath?: string | null
) {
  if (currentCategoryId === category._id) {
    return true
  }

  if (!category.path || !currentCategoryPath) {
    return false
  }

  const categoryPath = normalizeCatalogPath(category.path)
  const activePath = normalizeCatalogPath(currentCategoryPath)

  return (
    activePath === categoryPath || activePath.startsWith(`${categoryPath}/`)
  )
}

function sortHeaderProducts(products: Array<ShopHeaderProduct>) {
  return Array.from(products).toSorted((first, second) => {
    const firstOrder = first.sortOrder ?? Number.MAX_SAFE_INTEGER
    const secondOrder = second.sortOrder ?? Number.MAX_SAFE_INTEGER

    if (firstOrder !== secondOrder) {
      return firstOrder - secondOrder
    }

    return first.name.localeCompare(second.name)
  })
}

export function groupHeaderProductsByCategoryId(
  products: Array<ShopHeaderProduct>
) {
  const productsByCategoryId: ProductsByCategoryId = new Map()

  for (const product of products) {
    const categoryProducts = productsByCategoryId.get(product.categoryId)

    if (categoryProducts) {
      categoryProducts.push(product)
    } else {
      productsByCategoryId.set(product.categoryId, [product])
    }
  }

  for (const [categoryId, categoryProducts] of productsByCategoryId) {
    productsByCategoryId.set(categoryId, sortHeaderProducts(categoryProducts))
  }

  return productsByCategoryId
}

export function headerProductsForCategoryTree({
  category,
  categoriesByParentId,
  productsByCategoryId,
}: {
  category: ShopHeaderCategory
  categoriesByParentId: CategoriesByParentId
  productsByCategoryId: ProductsByCategoryId
}): Array<ShopHeaderProduct> {
  const products = [...(productsByCategoryId.get(category._id) ?? [])]
  const children =
    categoriesByParentId.get(category._id) ?? EMPTY_HEADER_CATEGORIES

  for (const child of children) {
    products.push(
      ...headerProductsForCategoryTree({
        category: child,
        categoriesByParentId,
        productsByCategoryId,
      })
    )
  }

  return sortHeaderProducts(products)
}
