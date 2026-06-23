import {
  centsToPriceInput,
  displayOptionLabel,
  getErrorMessage,
  hasConvexUrl,
  priceInputToCents,
  sortBySortOrder,
} from "@/lib/shop"
import { Link, createFileRoute } from "@tanstack/react-router"
/* eslint-disable max-lines, react-perf/jsx-no-new-function-as-prop */
import { api } from "@workspace/backend/api"
import { Badge } from "@workspace/ui/components/badge"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Switch } from "@workspace/ui/components/switch"
import { useMutation, useQuery } from "convex/react"
import type { GenericId } from "convex/values"
import {
  ArrowLeftIcon,
  ClipboardListIcon,
  PlusIcon,
  ShirtIcon,
  Trash2Icon,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"

export const Route = createFileRoute("/admin/settings")({
  component: ProductSettingsPage,
})

const DEFAULT_SIZE_VALUES = ["S", "M", "L", "XL"]
const DEFAULT_FLOCKING_FIELDS = ["Name", "Number"]
const SIZE_SORT_ORDER = 0
const FLOCKING_SORT_ORDER = 10
const AUTOSAVE_DELAY_MS = 700

type ProductOptionTemplateId = GenericId<"productOptionTemplates">

type OptionTemplate = {
  _id: ProductOptionTemplateId
  kind: "choice" | "personalization"
  label: string
  key: string
  isRequired: boolean
  priceDeltaCents: number
  sortOrder: number
  isActive: boolean
  updatedAt: number
  config:
    | {
        type: "choice"
        choices: Array<{
          label: string
          value: string
          priceDeltaCents: number
        }>
      }
    | {
        type: "personalization"
        fields: Array<{
          key: string
          label: string
          inputType: "text" | "number"
          required: boolean
        }>
      }
}

type EditableRow = {
  id: string
  value: string
}

type SizeFormState = {
  label: string
  isActive: boolean
  isRequired: boolean
  values: Array<EditableRow>
}

type FlockingFormState = {
  label: string
  isActive: boolean
  isRequired: boolean
  price: string
  fields: Array<EditableRow>
}

type SaveSizeInput = {
  templateId: ProductOptionTemplateId | null
  label: string
  isActive: boolean
  isRequired: boolean
  values: Array<string>
}

type SaveFlockingInput = {
  templateId: ProductOptionTemplateId | null
  label: string
  isActive: boolean
  isRequired: boolean
  price: string
  fields: Array<string>
}

type AutosaveStatus = "idle" | "pending" | "saving" | "saved" | "invalid"

type AutosaveState = {
  status: AutosaveStatus
  message: string
}

type AutosaveBuildResult<TInput> =
  | {
      input: TInput
      message?: string
    }
  | {
      input: null
      message: string
    }

function ProductSettingsPage() {
  if (!hasConvexUrl()) {
    return <MissingBackend />
  }

  return <ProductSettings />
}

function ProductSettings() {
  const data = useQuery(api.shop.listAdmin)
  const upsertOptionTemplate = useMutation(api.shop.upsertOptionTemplate)

  if (data === undefined) {
    return (
      <main className="min-h-svh bg-muted p-6">
        <div className="mx-auto h-[40rem] max-w-6xl animate-pulse rounded-lg bg-background" />
      </main>
    )
  }

  const optionTemplates = sortBySortOrder(data.optionTemplates)
  const sizeTemplate = findSizeTemplate(optionTemplates)
  const flockingTemplate = findFlockingTemplate(optionTemplates)

  async function handleSaveSize(input: SaveSizeInput) {
    await upsertOptionTemplate({
      templateId: input.templateId,
      kind: "choice",
      label: input.label,
      isRequired: input.isRequired,
      priceDeltaCents: 0,
      sortOrder: sizeTemplate?.sortOrder ?? SIZE_SORT_ORDER,
      isActive: input.isActive,
      choices: input.values,
      fields: [],
    })
  }

  async function handleSaveFlocking(input: SaveFlockingInput) {
    await upsertOptionTemplate({
      templateId: input.templateId,
      kind: "personalization",
      label: input.label,
      isRequired: input.isRequired,
      priceDeltaCents: priceInputToCents(input.price),
      sortOrder: flockingTemplate?.sortOrder ?? FLOCKING_SORT_ORDER,
      isActive: input.isActive,
      choices: [],
      fields: input.fields,
    })
  }

  return (
    <main className="min-h-svh bg-[linear-gradient(180deg,var(--background),var(--muted))]">
      <header className="border-b bg-background/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/admin" className={buttonVariants({ variant: "ghost" })}>
            <ArrowLeftIcon />
            Admin
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/admin/orders"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <ClipboardListIcon />
              Orders
            </Link>
            <Badge variant="destructive">
              Admin is public until auth exists
            </Badge>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-7 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase">
              Product settings
            </p>
            <h1 className="text-3xl font-semibold tracking-normal">
              Product options
            </h1>
          </div>
          <p className="max-w-md text-sm text-muted-foreground">
            Edit the two shared options that can be enabled from each product.
          </p>
        </div>

        <div className="grid gap-5">
          <SizeOptionEditor
            key={templateIdentityKey("size", sizeTemplate)}
            template={sizeTemplate}
            onSave={handleSaveSize}
          />
          <FlockingOptionEditor
            key={templateIdentityKey("flocking", flockingTemplate)}
            template={flockingTemplate}
            onSave={handleSaveFlocking}
          />
        </div>
      </section>
    </main>
  )
}

function SizeOptionEditor({
  template,
  onSave,
}: {
  template: OptionTemplate | null
  onSave: (input: SaveSizeInput) => Promise<void>
}) {
  const [form, setForm] = useState(() => sizeFormFromTemplate(template))
  const autosave = useAutosave({
    buildInput: (currentForm) =>
      buildSizeSaveInput(currentForm, template?._id ?? null),
    form,
    onSave,
  })

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
            onChange={(event) =>
              setForm((current) => ({ ...current, label: event.target.value }))
            }
          />
        </div>

        <OptionSwitches
          idPrefix="size"
          isActive={form.isActive}
          isRequired={form.isRequired}
          optionName="Size"
          onActiveChange={(isActive) =>
            setForm((current) => ({ ...current, isActive }))
          }
          onRequiredChange={(isRequired) =>
            setForm((current) => ({ ...current, isRequired }))
          }
        />

        <EditableRows
          addLabel="Add size"
          emptyValue="New size"
          inputLabel="Size value"
          rows={form.values}
          onAdd={() =>
            setForm((current) => ({
              ...current,
              values: [...current.values, createEditableRow("")],
            }))
          }
          onChange={(rowId, value) =>
            setForm((current) => ({
              ...current,
              values: updateEditableRows(current.values, rowId, value),
            }))
          }
          onRemove={(rowId) =>
            setForm((current) => ({
              ...current,
              values: removeEditableRow(current.values, rowId),
            }))
          }
        />

        <AutosaveStatusText state={autosave} />
      </div>
    </section>
  )
}

function FlockingOptionEditor({
  template,
  onSave,
}: {
  template: OptionTemplate | null
  onSave: (input: SaveFlockingInput) => Promise<void>
}) {
  const [form, setForm] = useState(() => flockingFormFromTemplate(template))
  const autosave = useAutosave({
    buildInput: (currentForm) =>
      buildFlockingSaveInput(currentForm, template?._id ?? null),
    form,
    onSave,
  })

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
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  label: event.target.value,
                }))
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="flocking-price">Extra price</Label>
            <Input
              id="flocking-price"
              inputMode="decimal"
              value={form.price}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  price: event.target.value,
                }))
              }
            />
          </div>
        </div>

        <OptionSwitches
          idPrefix="flocking"
          isActive={form.isActive}
          isRequired={form.isRequired}
          optionName="Flocking"
          onActiveChange={(isActive) =>
            setForm((current) => ({ ...current, isActive }))
          }
          onRequiredChange={(isRequired) =>
            setForm((current) => ({ ...current, isRequired }))
          }
        />

        <EditableRows
          addLabel="Add field"
          emptyValue="New field"
          inputLabel="Flocking field"
          rows={form.fields}
          onAdd={() =>
            setForm((current) => ({
              ...current,
              fields: [...current.fields, createEditableRow("")],
            }))
          }
          onChange={(rowId, value) =>
            setForm((current) => ({
              ...current,
              fields: updateEditableRows(current.fields, rowId, value),
            }))
          }
          onRemove={(rowId) =>
            setForm((current) => ({
              ...current,
              fields: removeEditableRow(current.fields, rowId),
            }))
          }
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

function EditableRows({
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
          <div
            key={row.id}
            className="grid grid-cols-[1fr_auto] items-center gap-2"
          >
            <Label htmlFor={`${row.id}-value`} className="sr-only">
              {inputLabel} {index + 1}
            </Label>
            <Input
              id={`${row.id}-value`}
              value={row.value}
              placeholder={emptyValue}
              onChange={(event) => onChange(row.id, event.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove ${inputLabel.toLowerCase()} ${index + 1}`}
              disabled={rows.length <= 1}
              onClick={() => onRemove(row.id)}
            >
              <Trash2Icon />
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" className="w-fit" onClick={onAdd}>
        <PlusIcon />
        {addLabel}
      </Button>
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
  if (state.status === "idle") {
    return null
  }

  return (
    <p className="text-right text-xs font-medium text-muted-foreground">
      {state.message}
    </p>
  )
}

function useAutosave<TForm, TInput>({
  buildInput,
  form,
  onSave,
}: {
  buildInput: (form: TForm) => AutosaveBuildResult<TInput>
  form: TForm
  onSave: (input: TInput) => Promise<void>
}): AutosaveState {
  const [state, setState] = useState<AutosaveState>({
    status: "idle",
    message: "",
  })
  const didMountRef = useRef(false)
  const lastSavedKeyRef = useRef<string | null>(null)
  const saveRunRef = useRef(0)
  const buildInputRef = useRef(buildInput)
  const onSaveRef = useRef(onSave)

  buildInputRef.current = buildInput
  onSaveRef.current = onSave

  useEffect(() => {
    const result = buildInputRef.current(form)

    if (result.input === null) {
      if (didMountRef.current) {
        setState({
          status: "invalid",
          message: result.message ?? "Invalid input",
        })
      }
      return undefined
    }

    const input = result.input
    const inputKey = JSON.stringify(input)

    if (!didMountRef.current) {
      didMountRef.current = true
      lastSavedKeyRef.current = inputKey
      return undefined
    }

    if (inputKey === lastSavedKeyRef.current) {
      return undefined
    }

    const saveRun = saveRunRef.current + 1
    saveRunRef.current = saveRun
    setState({ status: "pending", message: "Saving" })

    const timeoutId = window.setTimeout(() => {
      setState({ status: "saving", message: "Saving" })
      void onSaveRef
        .current(input)
        .then(() => {
          if (saveRunRef.current !== saveRun) {
            return null
          }

          lastSavedKeyRef.current = inputKey
          setState({
            status: "saved",
            message: result.message ?? "Saved",
          })
          return null
        })
        .catch((error: unknown) => {
          if (saveRunRef.current !== saveRun) {
            return null
          }

          setState({
            status: "invalid",
            message: getErrorMessage(error),
          })
          return null
        })
    }, AUTOSAVE_DELAY_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [form])

  return state
}

function buildSizeSaveInput(
  form: SizeFormState,
  templateId: ProductOptionTemplateId | null
): AutosaveBuildResult<SaveSizeInput> {
  const label = form.label.trim()
  const values = activeRowValues(form.values)

  if (!label) {
    return { input: null, message: "Enter a label." }
  }

  if (values.length === 0) {
    return { input: null, message: "Add at least one size." }
  }

  return {
    input: {
      templateId,
      label,
      isActive: form.isActive,
      isRequired: form.isRequired,
      values,
    },
  }
}

function buildFlockingSaveInput(
  form: FlockingFormState,
  templateId: ProductOptionTemplateId | null
): AutosaveBuildResult<SaveFlockingInput> {
  const label = form.label.trim()
  const fields = activeRowValues(form.fields)

  if (!label) {
    return { input: null, message: "Enter a label." }
  }

  if (!isValidPriceInput(form.price)) {
    return { input: null, message: "Enter a valid price." }
  }

  if (fields.length === 0) {
    return { input: null, message: "Add at least one flocking field." }
  }

  return {
    input: {
      templateId,
      label,
      isActive: form.isActive,
      isRequired: form.isRequired,
      price: form.price,
      fields,
    },
  }
}

function isValidPriceInput(value: string) {
  try {
    priceInputToCents(value)
    return true
  } catch {
    return false
  }
}

function findSizeTemplate(templates: Array<OptionTemplate>) {
  return (
    templates.find(
      (template) => template.kind === "choice" && template.key === "size"
    ) ??
    templates.find(
      (template) =>
        template.kind === "choice" &&
        template.label.toLowerCase().includes("size")
    ) ??
    templates.find((template) => template.kind === "choice") ??
    null
  )
}

function findFlockingTemplate(templates: Array<OptionTemplate>) {
  return (
    templates.find(
      (template) =>
        template.kind === "personalization" &&
        (template.key === "flocking" || template.key === "jersey-flocking")
    ) ??
    templates.find(
      (template) =>
        template.kind === "personalization" &&
        template.label.toLowerCase().includes("flocking")
    ) ??
    templates.find((template) => template.kind === "personalization") ??
    null
  )
}

function templateIdentityKey(prefix: string, template: OptionTemplate | null) {
  return template ? `${prefix}-${template._id}` : prefix
}

function sizeFormFromTemplate(template: OptionTemplate | null): SizeFormState {
  if (template?.config.type === "choice") {
    return {
      label: displayOptionLabel(template.label),
      isActive: template.isActive,
      isRequired: template.isRequired,
      values: editableRowsFromValues(
        template.config.choices.map((choice) => choice.label)
      ),
    }
  }

  return {
    label: "Size",
    isActive: true,
    isRequired: true,
    values: editableRowsFromValues(DEFAULT_SIZE_VALUES),
  }
}

function flockingFormFromTemplate(
  template: OptionTemplate | null
): FlockingFormState {
  if (template?.config.type === "personalization") {
    return {
      label: displayOptionLabel(template.label),
      isActive: template.isActive,
      isRequired: template.isRequired,
      price: centsToPriceInput(template.priceDeltaCents),
      fields: editableRowsFromValues(
        template.config.fields.map((field) => field.label)
      ),
    }
  }

  return {
    label: "Flocking",
    isActive: true,
    isRequired: false,
    price: "4.00",
    fields: editableRowsFromValues(DEFAULT_FLOCKING_FIELDS),
  }
}

function editableRowsFromValues(values: Array<string>) {
  return values.map((value, index) => ({
    id: `row-${index}-${value.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    value,
  }))
}

function createEditableRow(value: string): EditableRow {
  return {
    id: `row-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    value,
  }
}

function updateEditableRows(
  rows: Array<EditableRow>,
  rowId: string,
  value: string
) {
  return rows.map((row) => (row.id === rowId ? { ...row, value } : row))
}

function removeEditableRow(rows: Array<EditableRow>, rowId: string) {
  if (rows.length <= 1) {
    return rows
  }

  return rows.filter((row) => row.id !== rowId)
}

function activeRowValues(rows: Array<EditableRow>) {
  return rows.flatMap((row) => {
    const value = row.value.trim()

    return value ? [value] : []
  })
}

function MissingBackend() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted p-6">
      <section className="w-full max-w-lg rounded-lg border bg-background p-6">
        <h1 className="text-xl font-semibold">Connect Convex first</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Set `VITE_CONVEX_URL` in `apps/web/.env.local`, then restart the web
          dev server.
        </p>
      </section>
    </main>
  )
}
