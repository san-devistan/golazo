import {
  ShopStorefront,
  type StorefrontCategory,
  type StorefrontProduct,
} from "@/components/shop-storefront"
import { hasConvexUrl, sortBySortOrder } from "@/lib/shop"
import { Link, createFileRoute } from "@tanstack/react-router"
import { api } from "@workspace/backend/api"
import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { useQuery } from "convex/react"
import { ArrowRightIcon } from "lucide-react"
import { useMemo } from "react"

export const Route = createFileRoute("/")({ component: HomePage })

const EMPTY_CATEGORIES: Array<StorefrontCategory> = []
const EMPTY_PRODUCTS: Array<StorefrontProduct> = []

function HomePage() {
  if (!hasConvexUrl()) {
    return <MissingBackend />
  }

  return <CatalogHome />
}

function CatalogHome() {
  const data = useQuery(api.shop.listCatalog)
  const categories: Array<StorefrontCategory> =
    data?.categories ?? EMPTY_CATEGORIES
  const products: Array<StorefrontProduct> = data?.products ?? EMPTY_PRODUCTS

  const firstLevelCategories = useMemo(
    () =>
      sortBySortOrder(
        categories.filter((category) => category.parentId === null)
      ),
    [categories]
  )

  return (
    <ShopStorefront
      mode="public"
      categories={categories}
      childCategories={firstLevelCategories}
      products={products}
      title="Maillots de football"
      subtitle="Parcours les sélections par compétition, équipe nationale ou club. Les produits restent dans la même arborescence que celle utilisée par l'administration."
      isLoading={data === undefined}
    />
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
        <Link to="/admin" className={cn(buttonVariants(), "mt-4")}>
          Open admin
          <ArrowRightIcon />
        </Link>
      </section>
    </main>
  )
}
