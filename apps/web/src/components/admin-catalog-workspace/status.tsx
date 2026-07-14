import { ShopStorefront } from "@/components/shop-storefront"
import { Link } from "@tanstack/react-router"
import { Button } from "@workspace/ui/components/button"
import { buttonVariants } from "@workspace/ui/lib/button-variants"
import { useCallback } from "react"

import { EMPTY_ADMIN_CATEGORIES, EMPTY_ADMIN_PRODUCTS } from "./constants"
import type { AdminCategory } from "./types"

export function AdminCategoryUnavailable({
  categories,
}: {
  categories: Array<AdminCategory>
}) {
  return (
    <ShopStorefront
      mode="admin"
      categories={categories}
      childCategories={EMPTY_ADMIN_CATEGORIES}
      products={EMPTY_ADMIN_PRODUCTS}
      title="Catalog item unavailable"
      subtitle="This collection or group does not exist anymore."
    />
  )
}

export function BackendSetupState() {
  const handleRetry = useCallback(() => {
    window.location.reload()
  }, [])

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted p-6">
      <section className="w-full max-w-xl rounded-lg border bg-background p-6">
        <p className="text-xs font-bold tracking-[0.18em] text-muted-foreground uppercase">
          Admin backend
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-normal">
          Convex functions are not deployed yet
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          The admin UI is connected to{" "}
          <code className="rounded bg-muted px-1.5 py-1">
            {import.meta.env.VITE_CONVEX_URL}
          </code>
          , but the shop functions are not available on that deployment yet.
          Deploy the Convex backend or switch the web app back to a local Convex
          URL.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button type="button" onClick={handleRetry}>
            Retry
          </Button>
          <Link
            to="/"
            className={buttonVariants({ variant: "outline", size: "default" })}
          >
            Back to shop
          </Link>
        </div>
      </section>
    </main>
  )
}
