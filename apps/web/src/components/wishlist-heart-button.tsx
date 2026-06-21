import { cn } from "@workspace/ui/lib/utils"
import { HeartIcon } from "lucide-react"
import type { ButtonHTMLAttributes } from "react"

type WishlistHeartButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "aria-label" | "aria-pressed" | "type"
> & {
  favoriteLabel?: string
  iconClassName?: string
  isFavorite: boolean
  unfavoriteLabel?: string
}

export function WishlistHeartButton({
  className,
  favoriteLabel = "Remove from wishlist",
  iconClassName,
  isFavorite,
  unfavoriteLabel = "Add to wishlist",
  ...props
}: WishlistHeartButtonProps) {
  return (
    <button
      type="button"
      aria-label={isFavorite ? favoriteLabel : unfavoriteLabel}
      aria-pressed={isFavorite}
      className={cn(
        "group/wishlist-heart grid shrink-0 place-items-center border border-foreground bg-background text-foreground transition outline-none hover:bg-background focus-visible:ring-3 focus-visible:ring-ring/50",
        className
      )}
      {...props}
    >
      <HeartIcon
        className={cn(
          "fill-none stroke-current transition",
          isFavorite && "fill-current",
          iconClassName
        )}
      />
    </button>
  )
}
