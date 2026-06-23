import {
  InvalidResetLink,
  ResetPasswordForm,
} from "@/components/reset-password-content"
import { Link, createFileRoute } from "@tanstack/react-router"
import { buttonVariants } from "@workspace/ui/lib/button-variants"
import { cn } from "@workspace/ui/lib/utils"
import { ArrowLeftIcon } from "lucide-react"

type ResetPasswordSearch = {
  error?: string
  token?: string
}

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search): ResetPasswordSearch => ({
    error: typeof search.error === "string" ? search.error : undefined,
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const search = Route.useSearch()

  return (
    <main className="grid min-h-svh place-items-center bg-white px-4 py-12 text-[#111]">
      <section className="w-full max-w-md border border-[#d9d9d9] bg-white p-6">
        <Link
          to="/"
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "mb-5 rounded-none"
          )}
        >
          <ArrowLeftIcon />
          Continue shopping
        </Link>

        {search.error || !search.token ? (
          <InvalidResetLink />
        ) : (
          <ResetPasswordForm token={search.token} />
        )}
      </section>
    </main>
  )
}
