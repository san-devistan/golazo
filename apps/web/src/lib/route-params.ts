import type { CategoryId } from "@/lib/shop-queries"

export function categoryIdFromRouteParam(value: string): CategoryId {
  const categoryId = value.trim()

  if (!isCategoryId(categoryId)) {
    throw new Error("Category id route param is required.")
  }

  return categoryId
}

function isCategoryId(value: string): value is CategoryId {
  return value.length > 0
}
