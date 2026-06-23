import {
  CheckoutSuccess,
  type CheckoutSuccessSearch,
} from "@/components/checkout-success"
import { MissingBackend } from "@/components/missing-backend"
import { hasConvexUrl } from "@/lib/shop"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/checkout/success")({
  validateSearch: validateCheckoutSuccessSearch,
  component: CheckoutSuccessPage,
})

function validateCheckoutSuccessSearch(
  search: Record<string, unknown>
): CheckoutSuccessSearch {
  return typeof search.session_id === "string" && search.session_id.trim()
    ? { session_id: search.session_id }
    : {}
}

function CheckoutSuccessPage() {
  const search = Route.useSearch()

  if (!hasConvexUrl()) {
    return <MissingBackend />
  }

  return <CheckoutSuccess search={search} />
}
