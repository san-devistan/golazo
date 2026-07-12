import { cn } from "@workspace/ui/lib/utils"
import { ArrowRightIcon } from "lucide-react"
import type { ReactNode } from "react"

export const SHOP_UNDERLINE_LINK_CLASS_NAME =
  "group/underline-link inline-flex w-fit max-w-full min-w-0 text-left transition outline-none focus-visible:ring-2 focus-visible:ring-[#111]/30 focus-visible:outline-none"

type ShopUnderlineTextVariant = "collection" | "action" | "header"

const SHOP_UNDERLINE_TEXT_CLASSES = {
  collection: {
    root: "gap-3 border-b-[3px] pb-1",
    text: "font-oswald text-4xl leading-[0.92] font-bold tracking-normal sm:text-5xl",
    arrow: "size-7",
  },
  action: {
    root: "gap-2 border-b-[3px] pb-1",
    text: "font-oswald text-xl leading-none font-bold tracking-normal",
    arrow: "size-5",
  },
  header: {
    root: "max-w-32 gap-1.5 border-b pb-1",
    text: "font-oswald text-sm leading-none font-bold tracking-normal",
    arrow: "size-4",
  },
} satisfies Record<
  ShopUnderlineTextVariant,
  { root: string; text: string; arrow: string }
>

export function ShopUnderlineText({
  active = false,
  children,
  className,
  showArrow = true,
  variant = "collection",
}: {
  active?: boolean
  children: ReactNode
  className?: string
  showArrow?: boolean
  variant?: ShopUnderlineTextVariant
}) {
  const classes = SHOP_UNDERLINE_TEXT_CLASSES[variant]

  return (
    <span
      className={cn(
        "inline-flex max-w-full min-w-0 items-center border-transparent text-current uppercase transition-colors group-hover/underline-link:border-current group-focus-visible/underline-link:border-current",
        classes.root,
        active && "border-current",
        className
      )}
    >
      <span className={cn("min-w-0 truncate", classes.text)}>{children}</span>
      {showArrow && (
        <ArrowRightIcon
          className={cn(
            "shrink-0 transition-transform group-hover/underline-link:translate-x-1 group-focus-visible/underline-link:translate-x-1",
            classes.arrow
          )}
        />
      )}
    </span>
  )
}
