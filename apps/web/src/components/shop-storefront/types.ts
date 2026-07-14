import type { ProductId as CustomerProductId } from "@/lib/customer-state"

export type StorefrontMode = "admin" | "public"

export type StorefrontCategory<CategoryId extends string = string> = {
  _id: CategoryId
  name: string
  kind?: "collection" | "group"
  parentId: CategoryId | null
  path?: string
  depth?: number
  logoUrl?: string | null
  sortOrder: number
  isActive?: boolean
}

export type StorefrontProduct<
  TProductId extends string = CustomerProductId,
  CategoryId extends string = string,
> = {
  _id: TProductId
  categoryId: CategoryId
  name: string
  slug?: string
  description: string
  basePriceCents: number
  currency: string
  imageUrl: string | null
  imageUrls?: Array<string>
  sortOrder?: number
  status?: string
}

export type ProductCardTextDensity = "default" | "compact"
export type ProductCardMediaChrome = "full" | "minimal"

export type ShopStorefrontProps<
  TCategory extends StorefrontCategory,
  TProduct extends StorefrontProduct<CustomerProductId, TCategory["_id"]>,
> = {
  mode: StorefrontMode
  categories: Array<TCategory>
  currentCategory?: TCategory | null
  childCategories: Array<TCategory>
  products: Array<TProduct>
  title?: string
  subtitle?: string
  kicker?: string
  isLoading?: boolean
  onAddToCategory?: (category: TCategory) => void
  onEditCategory?: (category: TCategory) => void
  onToggleCategoryVisibility?: (category: TCategory) => void
  onEditProduct?: (product: TProduct) => void
  onDeleteProduct?: (product: TProduct) => void
  onToggleProductVisibility?: (product: TProduct) => void
  onReorderCategories?: (orderedCategoryIds: Array<TCategory["_id"]>) => void
  onReorderProducts?: (
    categoryId: TProduct["categoryId"],
    orderedProductIds: Array<TProduct["_id"]>
  ) => void
}

export type StorefrontContentState<
  TCategory extends StorefrontCategory,
  TProduct extends StorefrontProduct<CustomerProductId, TCategory["_id"]>,
> =
  | {
      type: "loading"
    }
  | {
      type: "category"
      currentCategory: TCategory
      categoryProductSections: Array<{
        category: TCategory
        products: Array<TProduct>
      }>
      directProducts: Array<TProduct>
    }
  | {
      type: "empty"
    }
  | {
      type: "homeCatalog"
      sections: Array<HomeCatalogSection<TCategory, TProduct>>
      hideEmptyCollections: boolean
    }
  | {
      type: "categoryProductSections"
      categoryProductSections: Array<{
        category: TCategory
        products: Array<TProduct>
      }>
      hideEmptySections: boolean
    }
  | {
      type: "categoryLane"
      visibleCategories: Array<TCategory>
    }

export type HomeCatalogSection<
  TCategory extends StorefrontCategory,
  TProduct extends StorefrontProduct<CustomerProductId, TCategory["_id"]>,
> =
  | {
      type: "collection"
      collection: TCategory
      products: Array<TProduct>
    }
  | {
      type: "group"
      group: TCategory
      collections: Array<CollectionProducts<TCategory, TProduct>>
    }

export type CollectionProducts<
  TCategory extends StorefrontCategory,
  TProduct extends StorefrontProduct<CustomerProductId, TCategory["_id"]>,
> = {
  collection: TCategory
  products: Array<TProduct>
}
