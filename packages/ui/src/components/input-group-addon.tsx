"use client"

import { inputGroupAddonVariants } from "@workspace/ui/lib/input-group-variants"
import { cn } from "@workspace/ui/lib/utils"
import type { VariantProps } from "class-variance-authority"
import * as React from "react"

function InputGroupAddon({
  className,
  align = "inline-start",
  ...props
}: React.ComponentProps<"fieldset"> &
  VariantProps<typeof inputGroupAddonVariants>) {
  const focusInput = React.useCallback(
    (target: EventTarget | null, currentTarget: HTMLFieldSetElement) => {
      if (target instanceof HTMLElement && target.closest("button")) {
        return
      }

      currentTarget.parentElement?.querySelector("input")?.focus()
    },
    []
  )
  const handleClick = React.useCallback<
    React.MouseEventHandler<HTMLFieldSetElement>
  >((event) => focusInput(event.target, event.currentTarget), [focusInput])
  const handleKeyDown = React.useCallback<
    React.KeyboardEventHandler<HTMLFieldSetElement>
  >(
    (event) => {
      if (event.key === "Enter" || event.key === " ") {
        focusInput(event.target, event.currentTarget)
      }
    },
    [focusInput]
  )

  return (
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, react-doctor/no-noninteractive-element-interactions -- The addon may contain buttons, so it cannot be a button itself.
    <fieldset
      data-slot="input-group-addon"
      data-align={align}
      className={cn(
        inputGroupAddonVariants({ align }),
        "m-0 min-w-0 border-0",
        className
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      {...props}
    />
  )
}

export { InputGroupAddon }
