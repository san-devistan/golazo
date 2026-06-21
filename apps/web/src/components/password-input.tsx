import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"
import { EyeIcon, EyeOffIcon } from "lucide-react"
import { type ComponentProps, useCallback, useState } from "react"

type PasswordInputProps = Omit<ComponentProps<"input">, "type">

export function PasswordInput({
  className,
  disabled,
  ...props
}: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false)
  const ToggleIcon = isVisible ? EyeOffIcon : EyeIcon
  const toggleLabel = isVisible ? "Hide password" : "Show password"
  const handleToggleVisibility = useCallback(() => {
    setIsVisible((current) => !current)
  }, [])

  return (
    <div className="relative">
      <Input
        {...props}
        type={isVisible ? "text" : "password"}
        disabled={disabled}
        className={cn("pr-10", className)}
      />
      <button
        type="button"
        aria-label={toggleLabel}
        aria-pressed={isVisible}
        title={toggleLabel}
        disabled={disabled}
        className="absolute top-1/2 right-1 grid size-7 -translate-y-1/2 place-items-center rounded-none text-muted-foreground transition outline-none hover:text-[#111] focus-visible:ring-2 focus-visible:ring-[#111]/30 disabled:pointer-events-none disabled:opacity-50"
        onClick={handleToggleVisibility}
      >
        <ToggleIcon aria-hidden="true" className="size-4" />
      </button>
    </div>
  )
}
