import {
  ShopStorefront,
  type StorefrontCategory,
  type StorefrontProduct,
} from "@/components/shop-storefront"
import { normalizeCatalogPath } from "@/lib/catalog-navigation"
import { hasConvexUrl, sortBySortOrder } from "@/lib/shop"
import { categoryPathPageQueryOptions } from "@/lib/shop-queries"
import { useSuspenseQuery } from "@tanstack/react-query"
import { Link, createFileRoute } from "@tanstack/react-router"
/* eslint-disable no-underscore-dangle */
import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { ArrowLeftIcon } from "lucide-react"
import { useMemo } from "react"

export const Route = createFileRoute("/$")({
  loader: async ({ params, context: { queryClient } }) => {
    if (!hasConvexUrl()) {
      return
    }

    const pathParams = params as { _splat?: string }
    const path = normalizeCatalogPath(pathParams._splat ?? "")

    await queryClient.ensureQueryData(categoryPathPageQueryOptions(path))
  },
  component: CategoryPathPage,
})

const EMPTY_CATEGORIES: Array<StorefrontCategory> = []
const EMPTY_PRODUCTS: Array<StorefrontProduct> = []

function CategoryPathPage() {
  const params = Route.useParams() as { _splat?: string }
  const path = normalizeCatalogPath(params._splat ?? "")

  if (!hasConvexUrl()) {
    return <MissingBackend />
  }

  return <CategoryPathLoader path={path} />
}

function CategoryPathLoader({ path }: { path: string }) {
  const { data } = useSuspenseQuery(categoryPathPageQueryOptions(path))
  const categories = data?.categories ?? EMPTY_CATEGORIES
  const products = data?.products ?? EMPTY_PRODUCTS
  const currentCategory = data?.currentCategory ?? null

  const children = useMemo(
    () =>
      currentCategory
        ? sortBySortOrder(
            categories.filter(
              (category) => category.parentId === currentCategory._id
            )
          )
        : EMPTY_CATEGORIES,
    [categories, currentCategory]
  )

  if (!currentCategory) {
    return <UnavailableCategory />
  }

  return (
    <ShopStorefront
      mode="public"
      categories={categories}
      currentCategory={currentCategory}
      childCategories={children}
      products={products}
      title={currentCategory.name}
    />
  )
}

function UnavailableCategory() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted p-6">
      <section className="w-full max-w-lg rounded-lg border bg-background p-6 text-center">
        <h1 className="text-xl font-semibold">Category unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This category is hidden or no longer exists.
        </p>
        <Link to="/" className={cn(buttonVariants(), "mt-4")}>
          <ArrowLeftIcon />
          Back to categories
        </Link>
      </section>
    </main>
  )
}

function MissingBackend() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted p-6">
      <section className="w-full max-w-lg rounded-lg border bg-background p-6">
        <h1 className="text-xl font-semibold">Connect Convex first</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Set `VITE_CONVEX_URL` in `apps/web/.env.local`, then restart the web
          dev server.
        </p>
      </section>
    </main>
  )
}
