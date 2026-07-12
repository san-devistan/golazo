import { Link } from "@tanstack/react-router"
import { buttonVariants } from "@workspace/ui/lib/button-variants"
import { cn } from "@workspace/ui/lib/utils"
import { ArrowLeftIcon } from "lucide-react"

function CategoryUnavailableState() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted p-6">
      <section className="w-full max-w-lg rounded-lg border bg-background p-6 text-center">
        <h1 className="text-xl font-semibold">Collection unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This collection is hidden or no longer exists.
        </p>
        <Link to="/" className={cn(buttonVariants(), "mt-4")}>
          <ArrowLeftIcon />
          Back to categories
        </Link>
      </section>
    </main>
  )
}

export { CategoryUnavailableState }
