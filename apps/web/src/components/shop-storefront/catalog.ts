import type { ProductId as CustomerProductId } from "@/lib/customer-state"
import { sortBySortOrder } from "@/lib/shop"

import { CATEGORY_CAROUSEL_PRIORITY_VISIBLE_PRODUCT_COUNT } from "./constants"
import type {
  HomeCatalogSection,
  StorefrontCategory,
  StorefrontProduct,
} from "./types"

export function moveByOffset<T>(
  items: Array<T>,
  index: number,
  offset: number
) {
  const targetIndex = index + offset

  if (index < 0 || targetIndex < 0 || targetIndex >= items.length) {
    return items
  }

  const nextItems = Array.from(items)
  const [movedItem] = nextItems.splice(index, 1)

  if (!movedItem) {
    return items
  }

  nextItems.splice(targetIndex, 0, movedItem)
  return nextItems
}

export function sortProducts<TProduct extends StorefrontProduct>(
  products: Array<TProduct>
) {
  return Array.from(products).toSorted((first, second) => {
    const firstOrder = first.sortOrder ?? Number.MAX_SAFE_INTEGER
    const secondOrder = second.sortOrder ?? Number.MAX_SAFE_INTEGER

    if (firstOrder !== secondOrder) {
      return firstOrder - secondOrder
    }

    return first.name.localeCompare(second.name)
  })
}

export function interleaveProductGroups<TProduct>(
  groups: Array<{ products: Array<TProduct> }>
) {
  const maxProductCount = Math.max(
    0,
    ...groups.map((group) => group.products.length)
  )
  const products: Array<TProduct> = []

  for (let productIndex = 0; productIndex < maxProductCount; productIndex++) {
    for (const group of groups) {
      const product = group.products[productIndex]

      if (product) {
        products.push(product)
      }
    }
  }

  return products
}

export function buildHomeCatalogSections<
  TCategory extends StorefrontCategory,
  TProduct extends StorefrontProduct<CustomerProductId, TCategory["_id"]>,
>({
  categories,
  products,
  rootCategories,
  hideEmptyCollections,
}: {
  categories: Array<TCategory>
  products: Array<TProduct>
  rootCategories: Array<TCategory>
  hideEmptyCollections: boolean
}): Array<HomeCatalogSection<TCategory, TProduct>> {
  const childrenByParentId = categoriesByParentId(categories)
  const productsByCategoryId = productsByCategory(products)

  return rootCategories.flatMap(
    (category): Array<HomeCatalogSection<TCategory, TProduct>> => {
      const childCategories = sortBySortOrder(
        childrenByParentId.get(category._id) ?? []
      )

      if (categoryCatalogKind(category, childCategories) === "group") {
        const collections = childCategories.flatMap((collection) => {
          if (categoryCatalogKind(collection) === "group") {
            return []
          }

          const collectionProducts =
            productsByCategoryId.get(collection._id) ?? []

          return hideEmptyCollections && collectionProducts.length === 0
            ? []
            : [{ collection, products: collectionProducts }]
        })

        return hideEmptyCollections && collections.length === 0
          ? []
          : [{ type: "group", group: category, collections }]
      }

      const collectionProducts = productsByCategoryId.get(category._id) ?? []

      return hideEmptyCollections && collectionProducts.length === 0
        ? []
        : [
            {
              type: "collection",
              collection: category,
              products: collectionProducts,
            },
          ]
    }
  )
}

function categoriesByParentId<TCategory extends StorefrontCategory>(
  categories: Array<TCategory>
) {
  const childrenByParentId = new Map<
    TCategory["_id"] | null,
    Array<TCategory>
  >()

  for (const category of categories) {
    const siblings = childrenByParentId.get(category.parentId) ?? []
    siblings.push(category)
    childrenByParentId.set(category.parentId, siblings)
  }

  return childrenByParentId
}

function productsByCategory<TProduct extends StorefrontProduct>(
  products: Array<TProduct>
) {
  const productsByCategoryId = new Map<
    TProduct["categoryId"],
    Array<TProduct>
  >()

  for (const product of products) {
    const categoryProducts = productsByCategoryId.get(product.categoryId) ?? []
    categoryProducts.push(product)
    productsByCategoryId.set(product.categoryId, categoryProducts)
  }

  for (const [categoryId, categoryProducts] of productsByCategoryId) {
    productsByCategoryId.set(categoryId, sortProducts(categoryProducts))
  }

  return productsByCategoryId
}

export function categoryCatalogKind(
  category: StorefrontCategory,
  childCategories: Array<StorefrontCategory> = []
) {
  return category.kind ?? (childCategories.length > 0 ? "group" : "collection")
}

export function catalogNodeLabel(category: StorefrontCategory) {
  return categoryCatalogKind(category) === "group" ? "group" : "collection"
}

export function isHiddenCategory(category: StorefrontCategory) {
  return category.isActive === false
}

export function isHiddenProduct(product: StorefrontProduct) {
  return Boolean(product.status && product.status !== "published")
}

export function buildCategoryProductSections<
  TCategory extends StorefrontCategory,
  TProduct extends StorefrontProduct<CustomerProductId, TCategory["_id"]>,
>({
  categories,
  products,
  sectionCategories,
}: {
  categories: Array<TCategory>
  products: Array<TProduct>
  sectionCategories: Array<TCategory>
}) {
  const childrenByParentId = new Map<
    TCategory["_id"] | null,
    Array<TCategory>
  >()
  const productsByCategoryId = new Map<TCategory["_id"], Array<TProduct>>()
  const orderedProductsByCategoryId = new Map<
    TCategory["_id"],
    Array<TProduct>
  >()

  for (const category of categories) {
    const siblings = childrenByParentId.get(category.parentId) ?? []
    siblings.push(category)
    childrenByParentId.set(category.parentId, siblings)
  }

  for (const product of products) {
    const categoryProducts = productsByCategoryId.get(product.categoryId) ?? []
    categoryProducts.push(product)
    productsByCategoryId.set(product.categoryId, categoryProducts)
  }

  for (const [categoryId, categoryProducts] of productsByCategoryId) {
    productsByCategoryId.set(categoryId, sortProducts(categoryProducts))
  }

  function childCategories(categoryId: TCategory["_id"]) {
    return sortBySortOrder(childrenByParentId.get(categoryId) ?? [])
  }

  function orderedProductsForCategory(category: TCategory): Array<TProduct> {
    const cachedProducts = orderedProductsByCategoryId.get(category._id)

    if (cachedProducts) {
      return cachedProducts
    }

    const directProducts = productsByCategoryId.get(category._id) ?? []
    const childProductGroups = childCategories(category._id).flatMap(
      (child) => {
        const childProducts = orderedProductsForCategory(child)

        return childProducts.length > 0 ? [{ products: childProducts }] : []
      }
    )

    if (childProductGroups.length === 0) {
      orderedProductsByCategoryId.set(category._id, directProducts)

      return directProducts
    }

    const productGroups =
      directProducts.length > 0
        ? [{ products: directProducts }, ...childProductGroups]
        : childProductGroups
    const orderedProducts = prioritizeCategoryProductGroups(productGroups)

    orderedProductsByCategoryId.set(category._id, orderedProducts)

    return orderedProducts
  }

  return sectionCategories.map((category) => ({
    category,
    products: orderedProductsForCategory(category),
  }))
}

function prioritizeCategoryProductGroups<TProduct>(
  groups: Array<{ products: Array<TProduct> }>
) {
  const priorityCounts = categoryProductPriorityCounts(groups)

  return [
    ...groups.flatMap((group, index) =>
      group.products.slice(0, priorityCounts[index] ?? 0)
    ),
    ...groups.flatMap((group, index) =>
      group.products.slice(priorityCounts[index] ?? 0)
    ),
  ]
}

function categoryProductPriorityCounts(
  groups: Array<{ products: { length: number } }>
) {
  const counts = groups.map(() => 0)
  let remainingPriorityProducts = Math.min(
    CATEGORY_CAROUSEL_PRIORITY_VISIBLE_PRODUCT_COUNT,
    groups.reduce((total, group) => total + group.products.length, 0)
  )

  while (remainingPriorityProducts > 0) {
    let allocatedInPass = false

    for (const [index, group] of groups.entries()) {
      const currentCount = counts[index] ?? 0

      if (
        remainingPriorityProducts > 0 &&
        currentCount < group.products.length
      ) {
        counts[index] = currentCount + 1
        remainingPriorityProducts -= 1
        allocatedInPass = true
      }
    }

    if (!allocatedInPass) {
      break
    }
  }

  return counts
}
