import { AdminOrdersPage } from "@/routes/admin/orders/page"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/admin/orders")({
  component: AdminOrdersPage,
})
