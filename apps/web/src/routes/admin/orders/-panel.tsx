import { formatPrice, getErrorMessage } from "@/lib/shop"
import { OrderContactDetails, OrderId } from "@/routes/admin/orders/-fields"
import {
  formatDateTime,
  formatShippingAddress,
  formTextValue,
  fulfillmentStatusFromFormData,
  nullableFormText,
  orderDate,
  orderToFormState,
  shortId,
} from "@/routes/admin/orders/-helpers"
import { OrderItemRow } from "@/routes/admin/orders/-item-row"
import { InlineStatusSelect } from "@/routes/admin/orders/-status-select"
import {
  DROP_ID_FIELD,
  TRACK_ID_FIELD,
  type AdminOrderRecord,
  type FulfillmentStatus,
  type UpdateFulfillmentInput,
} from "@/routes/admin/orders/-types"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { toast } from "@workspace/ui/lib/toast"
import { SaveIcon } from "lucide-react"
import {
  type ChangeEventHandler,
  type FormEvent,
  type ReactNode,
  useCallback,
  useState,
} from "react"

export function OrderPanel({
  record,
  onUpdate,
}: {
  record: AdminOrderRecord
  onUpdate: (input: UpdateFulfillmentInput) => Promise<void>
}) {
  const order = record.order
  const [isExpanded, setIsExpanded] = useState(false)
  const [form, setForm] = useState(() => orderToFormState(order))
  const [isSaving, setIsSaving] = useState(false)
  const commandId = order.commandId ?? shortId(order._id)
  const detailsId = `order-details-${order._id}`
  const shippingLines = formatShippingAddress(order.shippingAddress)
  const shippingAddressSummary = shippingLines.join(", ")

  const handleToggle = useCallback(() => {
    setIsExpanded((current) => !current)
  }, [])

  const handleStatusChange = useCallback(
    (fulfillmentStatus: FulfillmentStatus) => {
      setForm((current) => ({
        ...current,
        fulfillmentStatus,
      }))
      setIsExpanded(true)
    },
    []
  )

  const submitOrder = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      setIsSaving(true)

      try {
        const formData = new FormData(event.currentTarget)
        const fulfillmentStatus = fulfillmentStatusFromFormData(formData)
        const dropId = formTextValue(formData, DROP_ID_FIELD)
        const trackId = formTextValue(formData, TRACK_ID_FIELD)

        setForm({ fulfillmentStatus, dropId, trackId })
        await onUpdate({
          orderId: order._id,
          fulfillmentStatus,
          dropId: nullableFormText(dropId),
          trackId: nullableFormText(trackId),
        })
        toast.success("Order updated.")
      } catch (error) {
        toast.error(getErrorMessage(error))
      } finally {
        setIsSaving(false)
      }
    },
    [onUpdate, order._id]
  )

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      void submitOrder(event)
    },
    [submitOrder]
  )

  const handleDropIdChange = useCallback((dropId: string) => {
    setForm((current) => ({
      ...current,
      dropId,
    }))
  }, [])

  const handleTrackIdChange = useCallback((trackId: string) => {
    setForm((current) => ({
      ...current,
      trackId,
    }))
  }, [])

  return (
    <form
      className="border border-[#111] bg-background p-4"
      onSubmit={handleSubmit}
    >
      <div className="min-w-0">
        <OrderPanelHeader
          commandId={commandId}
          detailsId={detailsId}
          isExpanded={isExpanded}
          order={order}
          status={form.fulfillmentStatus}
          onStatusChange={handleStatusChange}
          onToggle={handleToggle}
        />

        {isExpanded ? (
          <div id={detailsId}>
            <OrderContactDetails
              address={shippingAddressSummary}
              customerEmail={order.customerEmail}
              customerPhone={order.customerPhone}
              shippingName={order.shippingName}
            />

            <div className="mt-4 border-t pt-4">
              <div className="divide-y">
                {record.items.map((item) => (
                  <OrderItemRow key={item._id} item={item} />
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-2 border-t pt-4 text-xs md:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
              <OrderId label="Stripe ID" value={order.stripePaymentIntentId} />
              <OrderId label="Customer ID" value={order.stripeCustomerId} />
              <EditableOrderId
                label="Drop ID"
                inputId={`drop-id-${order._id}`}
                name={DROP_ID_FIELD}
                value={form.dropId}
                onChange={handleDropIdChange}
              />
              <EditableOrderId
                label="Track ID"
                inputId={`track-id-${order._id}`}
                name={TRACK_ID_FIELD}
                value={form.trackId}
                onChange={handleTrackIdChange}
              />
              <SaveOrderButton isSaving={isSaving} />
            </div>
            {order.failureReason && (
              <p className="mt-3 text-sm text-destructive">
                {order.failureReason}
              </p>
            )}
          </div>
        ) : null}
      </div>
    </form>
  )
}

function OrderPanelHeader({
  commandId,
  detailsId,
  isExpanded,
  order,
  status,
  onStatusChange,
  onToggle,
}: {
  commandId: string
  detailsId: string
  isExpanded: boolean
  order: AdminOrderRecord["order"]
  status: FulfillmentStatus
  onStatusChange: (fulfillmentStatus: FulfillmentStatus) => void
  onToggle: () => void
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <OrderToggleButton
            detailsId={detailsId}
            isExpanded={isExpanded}
            onToggle={onToggle}
          >
            <h2 className="text-xl font-semibold hover:underline">
              {commandId}
            </h2>
          </OrderToggleButton>
          <InlineStatusSelect
            orderId={order._id}
            value={status}
            onChange={onStatusChange}
          />
        </div>
        <OrderToggleButton
          className="mt-1 block p-0 text-left text-sm text-muted-foreground hover:text-foreground"
          detailsId={detailsId}
          isExpanded={isExpanded}
          onToggle={onToggle}
        >
          {formatDateTime(orderDate(order))}
        </OrderToggleButton>
      </div>
      <OrderToggleButton
        className="p-0 text-right"
        detailsId={detailsId}
        isExpanded={isExpanded}
        onToggle={onToggle}
      >
        <div className="font-oswald text-2xl font-medium">
          {formatPrice(order.amountTotalCents, order.currency)}
        </div>
        <div className="text-xs text-muted-foreground">
          {order.productCount} item{order.productCount === 1 ? "" : "s"}
        </div>
      </OrderToggleButton>
    </div>
  )
}

function EditableOrderId({
  label,
  inputId,
  name,
  value,
  onChange,
}: {
  label: string
  inputId: string
  name: string
  value: string
  onChange: (value: string) => void
}) {
  const handleChange = useCallback<ChangeEventHandler<HTMLInputElement>>(
    (event) => {
      onChange(event.target.value)
    },
    [onChange]
  )

  return (
    <div className="min-w-0">
      <Label htmlFor={inputId} className="text-muted-foreground">
        {label}
      </Label>
      <Input
        id={inputId}
        name={name}
        value={value}
        placeholder="Pending"
        className="mt-1 h-8 rounded-none px-2 font-mono text-[11px]"
        onChange={handleChange}
      />
    </div>
  )
}

function OrderToggleButton({
  children,
  className = "min-w-0 p-0 text-left",
  detailsId,
  isExpanded,
  onToggle,
}: {
  children: ReactNode
  className?: string
  detailsId: string
  isExpanded: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      aria-controls={detailsId}
      aria-expanded={isExpanded}
      className={className}
      onClick={onToggle}
    >
      {children}
    </button>
  )
}

function SaveOrderButton({ isSaving }: { isSaving: boolean }) {
  return (
    <div className="flex items-end">
      <Button type="submit" disabled={isSaving} className="rounded-none">
        <SaveIcon />
        {isSaving ? "Saving" : "Save"}
      </Button>
    </div>
  )
}
