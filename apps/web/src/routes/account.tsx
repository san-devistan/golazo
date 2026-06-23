import { AccountPage } from "@/routes/account/page"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/account")({
  component: AccountPage,
})
