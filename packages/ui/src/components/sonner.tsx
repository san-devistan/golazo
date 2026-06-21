"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import type { CSSProperties } from "react"
import { Toaster as Sonner, toast, type ToasterProps } from "sonner"

type ToasterStyle = CSSProperties & {
  "--border-radius": string
  "--normal-bg": string
  "--normal-border": string
  "--normal-text": string
}

const toasterIcons = {
  success: <CircleCheckIcon className="size-4" />,
  info: <InfoIcon className="size-4" />,
  warning: <TriangleAlertIcon className="size-4" />,
  error: <OctagonXIcon className="size-4" />,
  loading: <Loader2Icon className="size-4 animate-spin" />,
}

const toasterStyle: ToasterStyle = {
  "--normal-bg": "var(--popover)",
  "--normal-text": "var(--popover-foreground)",
  "--normal-border": "var(--border)",
  "--border-radius": "var(--radius)",
}

const toastOptions = {
  classNames: {
    toast: "cn-toast",
  },
} satisfies ToasterProps["toastOptions"]

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={toToasterTheme(theme)}
      className="toaster group"
      icons={toasterIcons}
      style={toasterStyle}
      toastOptions={toastOptions}
      {...props}
    />
  )
}

function toToasterTheme(theme: string | undefined): ToasterProps["theme"] {
  if (theme === "light" || theme === "dark" || theme === "system") {
    return theme
  }

  return "system"
}

export { Toaster, toast }
