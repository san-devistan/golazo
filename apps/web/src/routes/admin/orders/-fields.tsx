export function OrderContactDetails({
  address,
  customerEmail,
  customerPhone,
  shippingName,
}: {
  address: string
  customerEmail?: string | null
  customerPhone?: string | null
  shippingName?: string | null
}) {
  return (
    <div className="mt-4 grid gap-x-6 gap-y-3 border-t pt-4 text-sm sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,2fr)]">
      <OrderInfoField
        fallback="Email pending"
        label="Customer"
        value={customerEmail}
      />
      <OrderInfoField
        fallback="Phone pending"
        label="Phone"
        value={customerPhone}
      />
      <OrderInfoField
        fallback="Recipient pending"
        label="Ship to"
        value={shippingName}
      />
      <OrderInfoField
        fallback="Address pending"
        label="Address"
        value={address}
        valueClassName="whitespace-normal"
      />
    </div>
  )
}

export function OrderId({
  label,
  value,
}: {
  label: string
  value?: string | null
}) {
  const displayValue = value?.trim() || "Pending"

  return (
    <div className="min-w-0">
      <div className="text-muted-foreground">{label}</div>
      <div className="truncate font-mono text-[11px]">{displayValue}</div>
    </div>
  )
}

function OrderInfoField({
  label,
  value,
  fallback,
  valueClassName,
}: {
  label: string
  value?: string | null
  fallback?: string
  valueClassName?: string
}) {
  const displayValue = value?.trim() || fallback || "Not set"
  const colorClassName = value?.trim() ? "" : " text-muted-foreground"
  const displayClassName = `mt-1 truncate${colorClassName}${
    valueClassName ? ` ${valueClassName}` : ""
  }`

  return (
    <div className="min-w-0">
      <div className="text-xs font-medium text-muted-foreground uppercase">
        {label}
      </div>
      <div className={displayClassName}>{displayValue}</div>
    </div>
  )
}
