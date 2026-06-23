import { ProductSettings } from "@/components/admin-product-settings"
import { MissingBackend } from "@/components/missing-backend"
import { hasConvexUrl } from "@/lib/shop"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/admin/settings")({
  component: ProductSettingsPage,
})

function ProductSettingsPage() {
  if (!hasConvexUrl()) {
    return <MissingBackend />
  }

  return <ProductSettings />
}
