export function hasConvexUrl() {
  return Boolean(import.meta.env.VITE_CONVEX_URL)
}

export function formatPrice(cents: number, currency: string) {
  const normalizedCurrency = currency.toUpperCase()

  if (normalizedCurrency === "EUR") {
    return `${(cents / 100).toFixed(2)} €`
  }

  return `${normalizedCurrency} ${(cents / 100).toFixed(2)}`
}

export function priceInputToCents(value: string) {
  const normalizedValue = value.trim().replace(",", ".")
  const amount = Number.parseFloat(normalizedValue)

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Enter a valid positive price.")
  }

  return Math.round(amount * 100)
}

export function centsToPriceInput(cents: number) {
  return (cents / 100).toFixed(2)
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    const uncaughtError = error.message.match(/Uncaught Error:\s*([^\n]+)/)

    return uncaughtError?.[1]?.trim() ?? error.message
  }

  return "Something went wrong."
}

export function displayOptionLabel(label: string) {
  return label.trim().toLowerCase() === "jersey flocking" ? "Flocking" : label
}

export function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return slug || "item"
}

export function sortBySortOrder<T extends { sortOrder: number; name?: string }>(
  items: Array<T>
): Array<T> {
  const sortedItems = Array.from(items)

  return sortedItems.toSorted((first: T, second: T) => {
    if (first.sortOrder !== second.sortOrder) {
      return first.sortOrder - second.sortOrder
    }

    return (first.name ?? "").localeCompare(second.name ?? "")
  })
}
