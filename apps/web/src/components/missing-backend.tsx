import { Link } from "@tanstack/react-router"
import { buttonVariants } from "@workspace/ui/lib/button-variants"
import { cn } from "@workspace/ui/lib/utils"
import { ArrowRightIcon } from "lucide-react"

function MissingBackend({
  showAdminLink = false,
}: {
  showAdminLink?: boolean
}) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted p-6">
      <section className="w-full max-w-lg rounded-lg border bg-background p-6">
        <h1 className="text-xl font-semibold">Connect Convex first</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Set `VITE_CONVEX_URL` in `apps/web/.env.local`, then restart the web
          dev server.
        </p>
        {showAdminLink ? (
          <Link to="/admin" className={cn(buttonVariants(), "mt-4")}>
            Open admin
            <ArrowRightIcon />
          </Link>
        ) : null}
      </section>
    </main>
  )
}

export { MissingBackend }
