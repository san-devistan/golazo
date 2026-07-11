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
        "relative grid size-[34px] place-items-center bg-transparent text-[#111] transition outline-none hover:opacity-65 focus-visible:ring-2 focus-visible:ring-[#111]/30",
        isActive && "text-[#111]"
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
