import {
  FULFILLMENT_OPTIONS,
  FULFILLMENT_STATUS_FIELD,
  type AdminOrderRecord,
  type FulfillmentFormState,
  type FulfillmentStatus,
  type ShippingAddress,
} from "@/routes/admin/orders/types"

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "short",
  timeStyle: "short",
  hourCycle: "h23",
})

export function metadataLinkHref(
  item: AdminOrderRecord["items"][number]["metadata"][number]
) {
  const rawValue = item.type === "link" ? item.value : item.linkUrl
  const value = rawValue?.trim()
  if (!value) {
    return null
  }

  const urlText = /^[a-z][a-z0-9+.-]*:/i.test(value)
    ? value
    : `https://${value}`

  try {
    const url = new URL(urlText)

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null
    }

    return url.href
  } catch {
    return null
  }
}

export function orderToFormState(
  order: AdminOrderRecord["order"]
): FulfillmentFormState {
  return {
    fulfillmentStatus: order.fulfillmentStatus ?? "unfulfilled",
    dropId: order.dropId ?? "",
    trackId: order.trackId ?? "",
  }
}

export function nullableFormText(value: string) {
  const normalizedValue = value.trim()

  return normalizedValue ? normalizedValue : null
}

export function formTextValue(formData: FormData, name: string) {
  const value = formData.get(name)

  return typeof value === "string" ? value : ""
}

export function fulfillmentStatusFromFormData(
  formData: FormData
): FulfillmentStatus {
  const value = formTextValue(formData, FULFILLMENT_STATUS_FIELD)

  if (isFulfillmentStatus(value)) {
    return value
  }

  throw new Error("Choose a valid order status.")
}

export function isFulfillmentStatus(value: string): value is FulfillmentStatus {
  return FULFILLMENT_OPTIONS.some((option) => option.value === value)
}

export function shortId(value: string) {
  return value.slice(-8).toUpperCase()
}

export function formatDateTime(value: number) {
  return DATE_TIME_FORMATTER.format(new Date(value))
}

export function orderDate(order: AdminOrderRecord["order"]) {
  return order.completedAt ?? order.createdAt
}

export function formatShippingAddress(
  address: ShippingAddress | null | undefined
) {
  if (!address) {
    return []
  }

  const cityLine = [address.postalCode, address.city].filter(Boolean).join(" ")
  const regionLine = [address.state, address.country].filter(Boolean).join(", ")

  return [address.line1, address.line2, cityLine, regionLine].filter(
    (line): line is string => Boolean(line)
  )
}
