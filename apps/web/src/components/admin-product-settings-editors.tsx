import {
  buildFlockingSaveInput,
  buildSizeSaveInput,
  createEditableRow,
  flockingFormFromTemplate,
  removeEditableRow,
  sizeFormFromTemplate,
  updateEditableRows,
  useAutosave,
  type AutosaveState,
  type FlockingFormState,
  type OptionTemplate,
  type SaveFlockingInput,
  type SaveSizeInput,
  type SizeFormState,
} from "@/components/admin-product-settings-model"
import { EditableRows } from "@/components/admin-product-settings-rows"
import { Badge } from "@workspace/ui/components/badge"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Switch } from "@workspace/ui/components/switch"
import { ShirtIcon } from "lucide-react"
import { useCallback, useState, type ChangeEvent } from "react"

export function SizeOptionEditor({
  template,
  onSave,
}: {
  template: OptionTemplate | null
  onSave: (input: SaveSizeInput) => Promise<void>
}) {
  const [form, setForm] = useState(() => sizeFormFromTemplate(template))
  const buildInput = useCallback(
    (currentForm: SizeFormState) =>
      buildSizeSaveInput(currentForm, template?._id ?? null),
    [template?._id]
  )
  const autosave = useAutosave({ buildInput, form, onSave })
  const handleLabelChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({ ...current, label: event.target.value }))
    },
    []
  )
  const handleActiveChange = useCallback((isActive: boolean) => {
    setForm((current) => ({ ...current, isActive }))
  }, [])
  const handleRequiredChange = useCallback((isRequired: boolean) => {
    setForm((current) => ({ ...current, isRequired }))
  }, [])
  const handleAdd = useCallback(() => {
    setForm((current) => ({
      ...current,
      values: [...current.values, createEditableRow("")],
    }))
  }, [])
  const handleChange = useCallback((rowId: string, value: string) => {
    setForm((current) => ({
      ...current,
      values: updateEditableRows(current.values, rowId, value),
    }))
  }, [])
  const handleRemove = useCallback((rowId: string) => {
    setForm((current) => ({
      ...current,
      values: removeEditableRow(current.values, rowId),
    }))
  }, [])

  return (
    <section
      className="border bg-background p-4 sm:p-5"
      aria-labelledby="size-option-title"
    >
      <OptionEditorHeader
        eyebrow="Option 1"
        title="Size"
        titleId="size-option-title"
        template={template}
      />
      <div className="mt-5 grid gap-5">
        <div className="grid gap-2">
          <Label htmlFor="size-label">Label</Label>
          <Input
            id="size-label"
            value={form.label}
            onChange={handleLabelChange}
          />
        </div>
        <OptionSwitches
          idPrefix="size"
          isActive={form.isActive}
          isRequired={form.isRequired}
          optionName="Size"
          onActiveChange={handleActiveChange}
          onRequiredChange={handleRequiredChange}
        />
        <EditableRows
          addLabel="Add size"
          emptyValue="New size"
          inputLabel="Size value"
          rows={form.values}
          onAdd={handleAdd}
          onChange={handleChange}
          onRemove={handleRemove}
        />
        <AutosaveStatusText state={autosave} />
      </div>
    </section>
  )
}

export function FlockingOptionEditor({
  template,
  onSave,
}: {
  template: OptionTemplate | null
  onSave: (input: SaveFlockingInput) => Promise<void>
}) {
  const [form, setForm] = useState(() => flockingFormFromTemplate(template))
  const buildInput = useCallback(
    (currentForm: FlockingFormState) =>
      buildFlockingSaveInput(currentForm, template?._id ?? null),
    [template?._id]
  )
  const autosave = useAutosave({ buildInput, form, onSave })
  const handleLabelChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({ ...current, label: event.target.value }))
    },
    []
  )
  const handlePriceChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({ ...current, price: event.target.value }))
    },
    []
  )
  const handleActiveChange = useCallback((isActive: boolean) => {
    setForm((current) => ({ ...current, isActive }))
  }, [])
  const handleRequiredChange = useCallback((isRequired: boolean) => {
    setForm((current) => ({ ...current, isRequired }))
  }, [])
  const handleAdd = useCallback(() => {
    setForm((current) => ({
      ...current,
      fields: [...current.fields, createEditableRow("")],
    }))
  }, [])
  const handleChange = useCallback((rowId: string, value: string) => {
    setForm((current) => ({
      ...current,
      fields: updateEditableRows(current.fields, rowId, value),
    }))
  }, [])
  const handleRemove = useCallback((rowId: string) => {
    setForm((current) => ({
      ...current,
      fields: removeEditableRow(current.fields, rowId),
    }))
  }, [])

  return (
    <section
      className="border bg-background p-4 sm:p-5"
      aria-labelledby="flocking-option-title"
    >
      <OptionEditorHeader
        eyebrow="Option 2"
        title="Flocking"
        titleId="flocking-option-title"
        template={template}
      />
      <div className="mt-5 grid gap-5">
        <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
          <div className="grid gap-2">
            <Label htmlFor="flocking-label">Label</Label>
            <Input
              id="flocking-label"
              value={form.label}
              onChange={handleLabelChange}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="flocking-price">Extra price</Label>
            <Input
              id="flocking-price"
              inputMode="decimal"
              value={form.price}
              onChange={handlePriceChange}
            />
          </div>
        </div>
        <OptionSwitches
          idPrefix="flocking"
          isActive={form.isActive}
          isRequired={form.isRequired}
          optionName="Flocking"
          onActiveChange={handleActiveChange}
          onRequiredChange={handleRequiredChange}
        />
        <EditableRows
          addLabel="Add field"
          emptyValue="New field"
          inputLabel="Flocking field"
          rows={form.fields}
          onAdd={handleAdd}
          onChange={handleChange}
          onRemove={handleRemove}
        />
        <AutosaveStatusText state={autosave} />
      </div>
    </section>
  )
}

function OptionEditorHeader({
  eyebrow,
  title,
  titleId,
  template,
}: {
  eyebrow: string
  title: string
  titleId: string
  template: OptionTemplate | null
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center bg-foreground text-background">
          <ShirtIcon className="size-5" />
        </span>
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase">
            {eyebrow}
          </p>
          <h2 id={titleId} className="text-xl font-semibold tracking-normal">
            {title}
          </h2>
        </div>
      </div>
      <TemplateBadge template={template} />
    </div>
  )
}

function OptionSwitches({
  idPrefix,
  isActive,
  isRequired,
  optionName,
  onActiveChange,
  onRequiredChange,
}: {
  idPrefix: string
  isActive: boolean
  isRequired: boolean
  optionName: string
  onActiveChange: (isActive: boolean) => void
  onRequiredChange: (isRequired: boolean) => void
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <SwitchField
        id={`${idPrefix}-enabled`}
        ariaLabel={`${optionName} enabled`}
        checked={isActive}
        label="Enabled"
        onCheckedChange={onActiveChange}
      />
      <SwitchField
        id={`${idPrefix}-required`}
        ariaLabel={`${optionName} required`}
        checked={isRequired}
        label="Required"
        onCheckedChange={onRequiredChange}
      />
    </div>
  )
}

function SwitchField({
  id,
  ariaLabel,
  label,
  checked,
  onCheckedChange,
}: {
  id: string
  ariaLabel: string
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 border px-3 py-2">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      <Switch
        id={id}
        aria-label={ariaLabel}
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    </div>
  )
}

function TemplateBadge({ template }: { template: OptionTemplate | null }) {
  if (!template) {
    return <Badge variant="outline">Not saved</Badge>
  }

  return (
    <Badge variant={template.isActive ? "secondary" : "outline"}>
      {template.isActive ? "Active" : "Disabled"}
    </Badge>
  )
}

function AutosaveStatusText({ state }: { state: AutosaveState }) {
  return state.status === "idle" ? null : (
    <p className="text-right text-xs font-medium text-muted-foreground">
      {state.message}
    </p>
  )
}
