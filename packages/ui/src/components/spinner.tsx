import { cn } from "@workspace/ui/lib/utils"
import { Loader2Icon } from "lucide-react"

function Spinner({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"output">) {
  return (
    <output
      aria-label="Loading"
      className={cn("inline-grid size-4 place-items-center", className)}
      {...props}
    >
      <Loader2Icon aria-hidden="true" className="size-full animate-spin" />
    </output>
  )
}

export { Spinner }
