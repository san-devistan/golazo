import { AdminEmails } from "@/components/admin-emails"
import { MissingBackend } from "@/components/missing-backend"
import { hasConvexUrl } from "@/lib/shop"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/admin/emails")({
  component: AdminEmailsPage,
})

function AdminEmailsPage() {
  if (!hasConvexUrl()) {
    return <MissingBackend />
  }

  return <AdminEmails />
}
