import { getErrorMessage } from "@/lib/shop"

export function betterAuthErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message
  }

  return getErrorMessage(error)
}

export function displayCartConfigurationValue({
  label,
  value,
}: {
  label: string
  value: string
}) {
  if (label.trim().toLowerCase() !== "flocking") {
    return value
  }

  return value.replace(/\b(?:name|number):\s*/gi, "").trim()
}
