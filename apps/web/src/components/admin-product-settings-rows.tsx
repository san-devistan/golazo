import type { EditableRow } from "@/components/admin-product-settings-model"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { PlusIcon, Trash2Icon } from "lucide-react"
import { useCallback, type ChangeEvent } from "react"

export function EditableRows({
  rows,
  inputLabel,
  addLabel,
  emptyValue,
  onAdd,
  onChange,
  onRemove,
}: {
  rows: Array<EditableRow>
  inputLabel: string
  addLabel: string
  emptyValue: string
  onAdd: () => void
  onChange: (rowId: string, value: string) => void
  onRemove: (rowId: string) => void
}) {
  return (
    <div className="grid gap-3">
      <div className="grid gap-2">
        {rows.map((row, index) => (
          <EditableRowField
            key={row.id}
            row={row}
            index={index}
            inputLabel={inputLabel}
            emptyValue={emptyValue}
            canRemove={rows.length > 1}
            onChange={onChange}
            onRemove={onRemove}
          />
        ))}
      </div>
      <Button type="button" variant="outline" className="w-fit" onClick={onAdd}>
        <PlusIcon />
        {addLabel}
      </Button>
    </div>
  )
}

function EditableRowField({
  row,
  index,
  inputLabel,
  emptyValue,
  canRemove,
  onChange,
  onRemove,
}: {
  row: EditableRow
  index: number
  inputLabel: string
  emptyValue: string
  canRemove: boolean
  onChange: (rowId: string, value: string) => void
  onRemove: (rowId: string) => void
}) {
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onChange(row.id, event.target.value)
    },
    [onChange, row.id]
  )
  const handleRemove = useCallback(() => {
    onRemove(row.id)
  }, [onRemove, row.id])

  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-2">
      <Label htmlFor={`${row.id}-value`} className="sr-only">
        {inputLabel} {index + 1}
      </Label>
      <Input
        id={`${row.id}-value`}
        value={row.value}
        placeholder={emptyValue}
        onChange={handleChange}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Remove ${inputLabel.toLowerCase()} ${index + 1}`}
        disabled={!canRemove}
        onClick={handleRemove}
      >
        <Trash2Icon />
      </Button>
    </div>
  )
}
