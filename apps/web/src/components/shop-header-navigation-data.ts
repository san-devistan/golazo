import { normalizeCatalogPath } from "@/lib/catalog-navigation"

export type ShopHeaderCategory = {
  _id: string
  name: string
  parentId: string | null
  path?: string | null
  sortOrder: number
}

export type ShopHeaderMode = "admin" | "public"

export type CategoriesByParentId = Map<string | null, Array<ShopHeaderCategory>>

export const EMPTY_HEADER_CATEGORIES: Array<ShopHeaderCategory> = []

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
