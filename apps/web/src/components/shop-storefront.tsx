import { ShopHeader } from "@/components/shop-header"
import { formatPrice, sortBySortOrder } from "@/lib/shop"
import { Link } from "@tanstack/react-router"
/* eslint-disable complexity, max-lines, max-lines-per-function, no-underscore-dangle, react-perf/jsx-no-new-function-as-prop, react-perf/jsx-no-new-object-as-prop */
import { Badge } from "@workspace/ui/components/badge"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import {
  ArchiveIcon,
  ArrowRightIcon,
  GripVerticalIcon,
  HeartIcon,
  PencilIcon,
  PlusIcon,
} from "lucide-react"
import { useRef } from "react"

export type StorefrontMode = "admin" | "public"

export type StorefrontCategory<CategoryId extends string = string> = {
  _id: CategoryId
  name: string
  parentId: CategoryId | null
  path?: string
  depth?: number
  sortOrder: number
  isActive?: boolean
}

export type StorefrontProduct<
  ProductId extends string = string,
  CategoryId extends string = string,
> = {
  _id: ProductId
  categoryId: CategoryId
  name: string
  slug?: string
  description: string
  basePriceCents: number
  currency: string
  imageUrl: string | null
  sortOrder?: number
  status?: string
}

type ShopStorefrontProps<
  TCategory extends StorefrontCategory,
  TProduct extends StorefrontProduct,
> = {
  mode: StorefrontMode
  categories: Array<TCategory>
  currentCategory?: TCategory | null
  childCategories: Array<TCategory>
  products: Array<TProduct>
  breadcrumbs?: Array<TCategory>
  title: string
  subtitle: string
  kicker?: string
  isLoading?: boolean
  canAddProduct?: boolean
  statusMessage?: string | null
  errorMessage?: string | null
  onAddCategory?: () => void
  onAddProduct?: () => void
  onEditCategory?: (category: TCategory) => void
  onEditProduct?: (product: TProduct) => void
  onArchiveProduct?: (productId: TProduct["_id"]) => void
  onReorderCategories?: (orderedCategoryIds: Array<TCategory["_id"]>) => void
  onReorderProducts?: (orderedProductIds: Array<TProduct["_id"]>) => void
}

const EMPTY_BREADCRUMBS: [] = []

function moveBefore<T extends { _id: string }>(
  items: Array<T>,
  draggedId: T["_id"],
  targetId: T["_id"]
) {
  const draggedItem = items.find((item) => item._id === draggedId)
  if (!draggedItem) {
    return items
  }

  const withoutDragged = items.filter((item) => item._id !== draggedId)
  const targetIndex = withoutDragged.findIndex((item) => item._id === targetId)

  if (targetIndex < 0) {
    return items
  }

  return [
    ...withoutDragged.slice(0, targetIndex),
    draggedItem,
    ...withoutDragged.slice(targetIndex),
  ]
}

function categoryHref(categoryId: string, mode: StorefrontMode) {
  return mode === "admin"
    ? `/admin/categories/${categoryId}`
    : `/categories/${categoryId}`
}

function rootHref(mode: StorefrontMode) {
  return mode === "admin" ? "/admin" : "/"
}

export function ShopStorefront<
  TCategory extends StorefrontCategory,
  TProduct extends StorefrontProduct,
>({
  mode,
  categories,
  currentCategory,
  childCategories,
  products,
  breadcrumbs = EMPTY_BREADCRUMBS,
  title,
  subtitle,
  kicker = "Acheter",
  isLoading = false,
  canAddProduct = false,
  statusMessage,
  errorMessage,
  onAddCategory,
  onAddProduct,
  onEditCategory,
  onEditProduct,
  onArchiveProduct,
  onReorderCategories,
  onReorderProducts,
}: ShopStorefrontProps<TCategory, TProduct>) {
  const visibleCategories = sortBySortOrder(childCategories)
  const visibleProducts = sortProducts(products)
  const hasProducts = visibleProducts.length > 0
  const hasCategories = visibleCategories.length > 0
  const isAdmin = mode === "admin"

  return (
    <main className="min-h-svh bg-white text-[#111]">
      <ShopHeader
        categories={categories}
        currentCategoryId={currentCategory?._id}
        adminMode={isAdmin}
      />

      {isAdmin && (
        <AdminToolbar
          canAddProduct={canAddProduct}
          onAddCategory={onAddCategory}
          onAddProduct={onAddProduct}
        />
      )}

      <section className="mx-auto max-w-[1536px] px-4 pt-6 pb-10 sm:px-6 lg:px-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#d9d9d9] pb-4 text-sm font-semibold">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <a href={rootHref(mode)} className="underline underline-offset-4">
              {isAdmin ? "Admin" : "Accueil"}
            </a>
            {breadcrumbs.map((category) => (
              <a
                key={category._id}
                href={categoryHref(category._id, mode)}
                className="underline underline-offset-4"
              >
                {category.name}
              </a>
            ))}
          </div>
          <a href={rootHref(mode)} className="underline underline-offset-4">
            Tout voir
          </a>
        </div>

        <div className="mb-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div>
            <p className="mb-2 text-xs font-bold tracking-[0.18em] uppercase">
              {kicker}
            </p>
            <h1 className="max-w-4xl text-4xl leading-none font-black tracking-normal uppercase sm:text-5xl lg:text-6xl">
              {title}
            </h1>
          </div>
          <p className="text-sm leading-6 text-[#555]">{subtitle}</p>
        </div>

        {(errorMessage || statusMessage) && (
          <div
            className={cn(
              "mb-6 border px-4 py-3 text-sm font-semibold",
              errorMessage
                ? "border-red-400 bg-red-50 text-red-700"
                : "border-[#d9d9d9] bg-[#f5f5f5]"
            )}
          >
            {errorMessage ?? statusMessage}
          </div>
        )}

        <FilterStrip
          isAdmin={isAdmin}
          categoryCount={visibleCategories.length}
          productCount={visibleProducts.length}
        />

        {isLoading ? (
          <StorefrontSkeleton />
        ) : hasCategories ? (
          <CategoryLane
            mode={mode}
            categories={visibleCategories}
            allCategories={categories}
            onAddCategory={onAddCategory}
            onEditCategory={onEditCategory}
            onReorderCategories={onReorderCategories}
          />
        ) : hasProducts ? (
          <ProductLane
            mode={mode}
            products={visibleProducts}
            onEditProduct={onEditProduct}
            onArchiveProduct={onArchiveProduct}
            onAddProduct={canAddProduct ? onAddProduct : undefined}
            onReorderProducts={onReorderProducts}
          />
        ) : (
          <EmptyShelf isAdmin={isAdmin} onAddProduct={onAddProduct} />
        )}

        {hasCategories && hasProducts && (
          <section className="mt-12">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="text-2xl font-black tracking-normal uppercase">
                Sélection
              </h2>
              <Badge variant="outline">{visibleProducts.length}</Badge>
            </div>
            <ProductLane
              mode={mode}
              products={visibleProducts}
              onEditProduct={onEditProduct}
              onArchiveProduct={onArchiveProduct}
              onAddProduct={canAddProduct ? onAddProduct : undefined}
              onReorderProducts={onReorderProducts}
            />
          </section>
        )}
      </section>
    </main>
  )
}

function AdminToolbar({
  canAddProduct,
  onAddCategory,
  onAddProduct,
}: {
  canAddProduct: boolean
  onAddCategory?: () => void
  onAddProduct?: () => void
}) {
  return (
    <div className="sticky top-[73px] z-30 border-b border-[#111] bg-[#111] text-white">
      <div className="mx-auto flex max-w-[1536px] flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm sm:px-6 lg:px-10">
        <div className="font-semibold">Admin merchandising</div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={onAddCategory}
          >
            <PlusIcon />
            Category
          </Button>
          {canAddProduct && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={onAddProduct}
            >
              <PlusIcon />
              Product
            </Button>
          )}
          <a
            href="/admin/settings"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "border-white bg-transparent text-white hover:bg-white hover:text-[#111]"
            )}
          >
            Product settings
          </a>
        </div>
      </div>
    </div>
  )
}

function FilterStrip({
  isAdmin,
  categoryCount,
  productCount,
}: {
  isAdmin: boolean
  categoryCount: number
  productCount: number
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="border border-[#111] bg-[#111] px-3 py-2 text-sm text-white"
        >
          Exclusivités membres
        </button>
        <button
          type="button"
          className="border border-[#b7b7b7] px-3 py-2 text-sm"
        >
          Nouveautés
        </button>
        <button
          type="button"
          className="border border-[#b7b7b7] px-3 py-2 text-sm"
        >
          Bientôt disponible
        </button>
      </div>
      <div className="flex gap-4 text-sm font-semibold">
        <span>{categoryCount} catégories</span>
        <span>{productCount} produits</span>
        {isAdmin && <span>Drag to reorder</span>}
      </div>
    </div>
  )
}

function CategoryLane<TCategory extends StorefrontCategory>({
  mode,
  categories,
  allCategories,
  onAddCategory,
  onEditCategory,
  onReorderCategories,
}: {
  mode: StorefrontMode
  categories: Array<TCategory>
  allCategories: Array<TCategory>
  onAddCategory?: () => void
  onEditCategory?: (category: TCategory) => void
  onReorderCategories?: (orderedCategoryIds: Array<TCategory["_id"]>) => void
}) {
  const draggedCategoryIdRef = useRef<TCategory["_id"] | null>(null)
  const isAdmin = mode === "admin"

  return (
    <div className="grid gap-x-2 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
      {isAdmin && onAddCategory && (
        <AddMerchandisingTile label="Category" onClick={onAddCategory} />
      )}
      {categories.map((category) => (
        <article
          key={category._id}
          draggable={isAdmin}
          onDragStart={() => {
            draggedCategoryIdRef.current = category._id
          }}
          onDragEnd={() => {
            draggedCategoryIdRef.current = null
          }}
          onDragOver={(event) => {
            if (isAdmin) {
              event.preventDefault()
            }
          }}
          onDrop={() => {
            const draggedCategoryId = draggedCategoryIdRef.current
            if (!draggedCategoryId || !onReorderCategories) {
              return
            }

            onReorderCategories(
              moveBefore(categories, draggedCategoryId, category._id).map(
                (item) => item._id
              )
            )
            draggedCategoryIdRef.current = null
          }}
          className={cn(
            "group relative min-w-0",
            isAdmin && "cursor-grab active:cursor-grabbing"
          )}
        >
          <a href={categoryHref(category._id, mode)} className="block">
            <div className="flex aspect-[4/5] items-end bg-[#ededed] p-5 transition group-hover:bg-[#e3e3e3]">
              <div>
                <div className="mb-3 text-xs font-bold tracking-[0.2em] text-[#777] uppercase">
                  {category.path ?? "category"}
                </div>
                <h2 className="text-3xl leading-none font-black tracking-normal uppercase">
                  {category.name}
                </h2>
                <p className="mt-3 text-sm text-[#555]">
                  {
                    allCategories.filter(
                      (item) => item.parentId === category._id
                    ).length
                  }{" "}
                  sous-catégories
                </p>
              </div>
              <ArrowRightIcon className="absolute right-5 bottom-5 size-5 transition group-hover:translate-x-1" />
            </div>
          </a>
          {isAdmin && (
            <div className="mt-3 flex items-center justify-between gap-2">
              <Badge variant={category.isActive ? "secondary" : "outline"}>
                {category.isActive ? "Visible" : "Hidden"}
              </Badge>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  title="Drag category"
                >
                  <GripVerticalIcon />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  title="Edit category"
                  onClick={() => onEditCategory?.(category)}
                >
                  <PencilIcon />
                </Button>
              </div>
            </div>
          )}
        </article>
      ))}
    </div>
  )
}

function ProductLane<TProduct extends StorefrontProduct>({
  mode,
  products,
  onEditProduct,
  onArchiveProduct,
  onAddProduct,
  onReorderProducts,
}: {
  mode: StorefrontMode
  products: Array<TProduct>
  onEditProduct?: (product: TProduct) => void
  onArchiveProduct?: (productId: TProduct["_id"]) => void
  onAddProduct?: () => void
  onReorderProducts?: (orderedProductIds: Array<TProduct["_id"]>) => void
}) {
  const draggedProductIdRef = useRef<TProduct["_id"] | null>(null)
  const isAdmin = mode === "admin"

  return (
    <div className="grid gap-x-2 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
      {isAdmin && onAddProduct && (
        <AddMerchandisingTile label="Product" onClick={onAddProduct} />
      )}
      {products.map((product) => (
        <article
          key={product._id}
          draggable={isAdmin}
          onDragStart={() => {
            draggedProductIdRef.current = product._id
          }}
          onDragEnd={() => {
            draggedProductIdRef.current = null
          }}
          onDragOver={(event) => {
            if (isAdmin) {
              event.preventDefault()
            }
          }}
          onDrop={() => {
            const draggedProductId = draggedProductIdRef.current
            if (!draggedProductId || !onReorderProducts) {
              return
            }

            onReorderProducts(
              moveBefore(products, draggedProductId, product._id).map(
                (item) => item._id
              )
            )
            draggedProductIdRef.current = null
          }}
          className={cn(isAdmin && "cursor-grab active:cursor-grabbing")}
        >
          <ProductMedia
            product={product}
            mode={mode}
            onEditProduct={onEditProduct}
          />
          <div className="mt-3 space-y-1 px-2">
            <div className="flex items-start justify-between gap-3">
              <div className="font-bold">
                {formatPrice(product.basePriceCents, product.currency)}
              </div>
              {product.status && (
                <Badge
                  variant={
                    product.status === "published" ? "secondary" : "outline"
                  }
                >
                  {product.status}
                </Badge>
              )}
            </div>
            <h3 className="line-clamp-2 text-sm font-medium uppercase">
              {product.name}
            </h3>
            <p className="line-clamp-2 min-h-10 text-sm text-[#777]">
              {product.description || "Performance"}
            </p>
            {isAdmin && (
              <ProductAdminActions
                product={product}
                onArchiveProduct={onArchiveProduct}
                onEditProduct={onEditProduct}
              />
            )}
          </div>
        </article>
      ))}
    </div>
  )
}

function AddMerchandisingTile({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex aspect-[4/5] min-w-0 items-center justify-center border border-dashed border-[#111] bg-white p-5 text-center transition hover:bg-[#f5f5f5]"
    >
      <span>
        <span className="mx-auto mb-4 grid size-12 place-items-center bg-[#111] text-white transition group-hover:scale-105">
          <PlusIcon className="size-6" />
        </span>
        <span className="block text-sm font-black tracking-normal uppercase">
          Add {label}
        </span>
      </span>
    </button>
  )
}

function ProductAdminActions<TProduct extends StorefrontProduct>({
  product,
  onEditProduct,
  onArchiveProduct,
}: {
  product: TProduct
  onEditProduct?: (product: TProduct) => void
  onArchiveProduct?: (productId: TProduct["_id"]) => void
}) {
  return (
    <div className="flex justify-between gap-2 pt-2">
      <Button type="button" size="icon-sm" variant="ghost" title="Drag product">
        <GripVerticalIcon />
      </Button>
      <div className="flex gap-1">
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          title="Edit product"
          onClick={() => onEditProduct?.(product)}
        >
          <PencilIcon />
        </Button>
        {product.status !== "archived" && (
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            title="Archive product"
            onClick={() => onArchiveProduct?.(product._id)}
          >
            <ArchiveIcon />
          </Button>
        )}
      </div>
    </div>
  )
}

function ProductMedia<TProduct extends StorefrontProduct>({
  product,
  mode,
  onEditProduct,
}: {
  product: TProduct
  mode: StorefrontMode
  onEditProduct?: (product: TProduct) => void
}) {
  const media = (
    <div className="relative aspect-[4/5] overflow-hidden bg-[#eceff1]">
      {product.imageUrl ? (
        <img
          src={product.imageUrl}
          alt={product.name}
          className="size-full object-contain transition duration-300 hover:scale-[1.03]"
        />
      ) : (
        <div className="flex size-full items-center justify-center px-6 text-center text-sm font-semibold text-[#777]">
          Image produit
        </div>
      )}
      <button
        type="button"
        aria-label="Add to favorites"
        className="absolute top-5 right-5 flex size-9 items-center justify-center bg-white/80"
      >
        <HeartIcon className="size-5" />
      </button>
    </div>
  )

  if (mode === "admin") {
    return (
      <button
        type="button"
        className="block w-full text-left"
        onClick={() => onEditProduct?.(product)}
      >
        {media}
      </button>
    )
  }

  if (!product.slug) {
    return media
  }

  return (
    <Link to="/products/$slug" params={{ slug: product.slug }}>
      {media}
    </Link>
  )
}

function sortProducts<TProduct extends StorefrontProduct>(
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

function StorefrontSkeleton() {
  return (
    <div className="grid gap-x-2 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
      {[0, 1, 2, 3].map((item) => (
        <div key={item}>
          <div className="aspect-[4/5] animate-pulse bg-[#eceff1]" />
          <div className="mt-3 h-4 w-24 animate-pulse bg-[#eceff1]" />
          <div className="mt-2 h-4 w-40 animate-pulse bg-[#eceff1]" />
        </div>
      ))}
    </div>
  )
}

function EmptyShelf({
  isAdmin,
  onAddProduct,
}: {
  isAdmin: boolean
  onAddProduct?: () => void
}) {
  return (
    <div className="border border-[#d9d9d9] bg-[#f5f5f5] p-10 text-center">
      <h2 className="text-2xl font-black tracking-normal uppercase">
        Aucun produit pour le moment
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-[#555]">
        Cette sélection est prête à recevoir les prochains maillots.
      </p>
      {isAdmin && (
        <Button type="button" className="mt-5" onClick={onAddProduct}>
          <PlusIcon />
          Product
        </Button>
      )}
    </div>
  )
}
