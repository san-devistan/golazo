import { isFulfillmentStatus } from "@/routes/admin/orders/helpers"
import {
  FULFILLMENT_OPTIONS,
  FULFILLMENT_STATUS_FIELD,
  type CheckoutOrderId,
  type FulfillmentStatus,
} from "@/routes/admin/orders/types"
import { Label } from "@workspace/ui/components/label"
import {
  NativeSelect,
  NativeSelectOption,
} from "@workspace/ui/components/native-select"
import { type ChangeEventHandler, useCallback } from "react"

export function InlineStatusSelect({
  orderId,
  value,
  onChange,
}: {
  orderId: CheckoutOrderId
  value: FulfillmentStatus
  onChange: (value: FulfillmentStatus) => void
}) {
  const handleChange = useCallback<ChangeEventHandler<HTMLSelectElement>>(
    (event) => {
      const nextValue = event.target.value

      if (isFulfillmentStatus(nextValue)) {
        onChange(nextValue)
      }
    },
    [onChange]
  )

  return (
    <div className="inline-flex items-center">
      <Label htmlFor={`fulfillment-${orderId}`} className="sr-only">
        Status
      </Label>
      <NativeSelect
        id={`fulfillment-${orderId}`}
        name={FULFILLMENT_STATUS_FIELD}
        size="sm"
        value={value}
        className="w-auto [&_select]:h-6 [&_select]:rounded-full [&_select]:border-transparent [&_select]:bg-secondary [&_select]:py-0 [&_select]:pr-7 [&_select]:pl-2.5 [&_select]:text-xs [&_select]:font-medium [&_svg]:right-2 [&_svg]:size-3"
        onChange={handleChange}
      >
        {FULFILLMENT_OPTIONS.map((option) => (
          <NativeSelectOption key={option.value} value={option.value}>
            {option.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  )
}
