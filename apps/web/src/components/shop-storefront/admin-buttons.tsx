import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  EyeIcon,
  EyeOffIcon,
  PlusIcon,
} from "lucide-react"
import {
  type ComponentProps,
  type ReactNode,
  type MouseEvent as ReactMouseEvent,
  useCallback,
} from "react"

export function CardAdminOverlay({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-x-3 top-3 flex items-center justify-between gap-2 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100">
      <div className="pointer-events-none flex items-center gap-1 group-focus-within:pointer-events-auto group-hover:pointer-events-auto">
        {children}
      </div>
    </div>
  )
}

export function CardIconButton({
  title,
  variant = "outline",
  onClick,
  children,
}: {
  title: string
  variant?: ComponentProps<typeof Button>["variant"]
  onClick?: () => void
  children: ReactNode
}) {
  const handleClick = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      event.stopPropagation()
      onClick?.()
    },
    [onClick]
  )

  return (
    <Button
      type="button"
      size="icon-sm"
      variant={variant}
      title={title}
      aria-label={title}
      className="rounded-none bg-white shadow-sm hover:bg-[#f1f1f1]"
      onClick={handleClick}
    >
      {children}
    </Button>
  )
}

export function AdminOrderIconButton({
  direction,
  label,
  disabled,
  onClick,
}: {
  direction: "up" | "down" | "left" | "right"
  label: string
  disabled: boolean
  onClick?: () => void
}) {
  const Icon =
    direction === "up"
      ? ArrowUpIcon
      : direction === "down"
        ? ArrowDownIcon
        : direction === "left"
          ? ArrowLeftIcon
          : ArrowRightIcon
  const handleClick = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      event.stopPropagation()
      onClick?.()
    },
    [onClick]
  )

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      title={label}
      aria-label={label}
      disabled={disabled || !onClick}
      className="rounded-none bg-white shadow-sm hover:bg-[#f1f1f1]"
      onClick={handleClick}
    >
      <Icon />
    </Button>
  )
}

export function CategoryAddButton({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      title={label}
      aria-label={label}
      className="h-7 rounded-none bg-white px-2 shadow-sm hover:bg-[#f1f1f1]"
      onClick={onClick}
    >
      <PlusIcon />
      <span className="font-oswald text-xs leading-none font-bold tracking-normal uppercase">
        {label.replace("+ ", "")}
      </span>
    </Button>
  )
}

export function VisibilityIconButton({
  isVisible,
  title,
  className,
  onClick,
}: {
  isVisible: boolean
  title: string
  className?: string
  onClick: () => void
}) {
  const handleClick = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      event.stopPropagation()
      onClick()
    },
    [onClick]
  )

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      className={cn(
        "pointer-events-none absolute top-0 right-0 z-10 flex size-9 items-center justify-center bg-white/85 text-[#111] opacity-0 shadow-sm transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111]",
        isVisible && "bg-[#111] text-white hover:bg-[#222]",
        className
      )}
      onClick={handleClick}
    >
      {isVisible ? (
        <EyeIcon className="size-5" />
      ) : (
        <EyeOffIcon className="size-5" />
      )}
    </button>
  )
}
