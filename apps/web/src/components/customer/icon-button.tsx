import { cn } from "@workspace/ui/lib/utils"
import type { ReactNode } from "react"

export function HeaderIconButton({
  label,
  count,
  isActive = false,
  onClick,
  children,
}: {
  label: string
  count?: number
  isActive?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "relative grid size-9 place-items-center transition outline-none hover:bg-[#f1f1f1] focus-visible:ring-2 focus-visible:ring-[#111]/30",
        isActive && "bg-[#111] text-white hover:bg-[#222]"
      )}
      onClick={onClick}
    >
      {children}
      {count !== undefined && count > 0 && (
        <span className="absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#111] px-1 text-[10px] leading-4 font-black text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  )
}
