import {
  ShopStorefront,
  type StorefrontCategory,
  type StorefrontProduct,
} from "@/components/shop-storefront"
import { hasConvexUrl, sortBySortOrder } from "@/lib/shop"
import { categoryPageQueryOptions, type CategoryId } from "@/lib/shop-queries"
import { useSuspenseQuery } from "@tanstack/react-query"
import { Link, createFileRoute } from "@tanstack/react-router"
/* eslint-disable typescript/no-unsafe-type-assertion */
import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { ArrowLeftIcon } from "lucide-react"
import { useMemo } from "react"

export const Route = createFileRoute("/categories/$categoryId")({
  loader: async ({ params, context: { queryClient } }) => {
    if (!hasConvexUrl()) {
      return
    }

    await queryClient.ensureQueryData(
      categoryPageQueryOptions(params.categoryId as CategoryId)
    )
  },
  component: CategoryPage,
})

const EMPTY_CATEGORIES: Array<StorefrontCategory> = []
const EMPTY_PRODUCTS: Array<StorefrontProduct> = []

function CategoryPage() {
  const { categoryId } = Route.useParams()

  if (!hasConvexUrl()) {
    return <MissingBackend />
  }

  return <CategoryLoader categoryId={categoryId as CategoryId} />
}

function CategoryLoader({ categoryId }: { categoryId: CategoryId }) {
  const { data } = useSuspenseQuery(categoryPageQueryOptions(categoryId))
  const categories = data?.categories ?? EMPTY_CATEGORIES
  const products = data?.products ?? EMPTY_PRODUCTS
  const currentCategory = data?.currentCategory as
    | StorefrontCategory
    | undefined

  const children = useMemo(
    () =>
      sortBySortOrder(
        categories.filter((category) => category.parentId === categoryId)
      ),
    [categories, categoryId]
  )
  if (data === null) {
    return <UnavailableCategory />
  }

  return (
    <ShopStorefront
      mode="public"
      categories={categories}
      currentCategory={currentCategory}
      childCategories={children}
      products={products}
      title={data.currentCategory.name}
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
