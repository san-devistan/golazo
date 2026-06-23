export type CatalogNavigationMode = "admin" | "public"

export type CatalogNavigationCategory = {
  _id: string
  name: string
  path?: string | null
}

export type CatalogBreadcrumb = {
  href: string
  label: string
  path: string
}

export function normalizeCatalogPath(path: string) {
  return path.split("/").filter(Boolean).join("/")
}

export function catalogRootHref(mode: CatalogNavigationMode) {
  return mode === "admin" ? "/admin" : "/"
}

function catalogPathHref(path: string, mode: CatalogNavigationMode) {
  const normalizedPath = normalizeCatalogPath(path)

  if (!normalizedPath) {
    return catalogRootHref(mode)
  }

  return mode === "admin" ? `/admin/${normalizedPath}` : `/${normalizedPath}`
}

export function categoryHref(
  category: CatalogNavigationCategory,
  mode: CatalogNavigationMode
) {
  return category.path
    ? catalogPathHref(category.path, mode)
    : legacyCategoryHref(category._id, mode)
}

export function categoryBackHref(
  category: CatalogNavigationCategory,
  mode: CatalogNavigationMode
) {
  if (!category.path) {
    return catalogRootHref(mode)
  }

  const segments = normalizeCatalogPath(category.path).split("/")
  const parentPath = segments.slice(0, -1).join("/")

  return parentPath ? catalogPathHref(parentPath, mode) : catalogRootHref(mode)
}

export function buildCategoryBreadcrumbs(
  categories: Array<CatalogNavigationCategory>,
  currentCategory: CatalogNavigationCategory,
  mode: CatalogNavigationMode
): Array<CatalogBreadcrumb> {
  if (!currentCategory.path) {
    return []
  }

  const categoriesByPath = new Map(
    categories.flatMap((category) =>
      category.path
        ? [[normalizeCatalogPath(category.path), category] as const]
        : []
    )
  )
  const segments = normalizeCatalogPath(currentCategory.path).split("/")

  return segments.map((segment, index) => {
    const path = segments.slice(0, index + 1).join("/")
    const category = categoriesByPath.get(path)

    return {
      href: catalogPathHref(path, mode),
      label: category?.name ?? segment,
      path,
    }
  })
}

function legacyCategoryHref(categoryId: string, mode: CatalogNavigationMode) {
  return mode === "admin"
    ? `/admin/categories/${categoryId}`
    : `/categories/${categoryId}`
}
