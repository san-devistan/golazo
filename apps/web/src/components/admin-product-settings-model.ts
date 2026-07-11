import {
  centsToPriceInput,
  displayOptionLabel,
  getErrorMessage,
  priceInputToCents,
  slugify,
} from "@/lib/shop"
import type { GenericId } from "convex/values"
import { useEffect, useReducer, useRef } from "react"

export const DEFAULT_SIZE_VALUES = ["S", "M", "L", "XL"]
export const DEFAULT_FLOCKING_FIELDS = ["Name", "Number"]
export const SIZE_SORT_ORDER = 0
export const FLOCKING_SORT_ORDER = 10

const AUTOSAVE_DELAY_MS = 700
const INITIAL_AUTOSAVE_STATE: AutosaveState = {
  status: "idle",
  message: "",
}

export type ProductOptionTemplateId = GenericId<"productOptionTemplates">

export type OptionTemplate = {
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

export type EditableRow = {
  id: string
  value: string
}

export type SizeFormState = {
  label: string
  isActive: boolean
  isRequired: boolean
  values: Array<EditableRow>
}

export type FlockingFormState = {
  label: string
  isActive: boolean
  isRequired: boolean
  price: string
  fields: Array<EditableRow>
}

export type SaveSizeInput = {
  templateId: ProductOptionTemplateId | null
  label: string
  isActive: boolean
  isRequired: boolean
  values: Array<string>
}

export type SaveFlockingInput = {
  templateId: ProductOptionTemplateId | null
  label: string
  isActive: boolean
  isRequired: boolean
  price: string
  fields: Array<string>
}

export type AutosaveState = {
  status: "idle" | "pending" | "saving" | "saved" | "invalid"
  message: string
}

type AutosaveAction =
  | { type: "invalid"; message: string }
  | { type: "pending" }
  | { type: "saving" }
  | { type: "saved"; message: string }

type AutosaveBuildResult<TInput> =
  | { input: TInput; message?: string }
  | { input: null; message: string }

function autosaveReducer(
  _state: AutosaveState,
  action: AutosaveAction
): AutosaveState {
  if (action.type === "invalid") {
    return { status: "invalid", message: action.message }
  }

  if (action.type === "pending" || action.type === "saving") {
    return { status: action.type, message: "Saving" }
  }

  return { status: "saved", message: action.message }
}

export function useAutosave<TForm, TInput>({
  buildInput,
  form,
  onSave,
}: {
  buildInput: (form: TForm) => AutosaveBuildResult<TInput>
  form: TForm
  onSave: (input: TInput) => Promise<void>
}): AutosaveState {
  const [state, dispatch] = useReducer(autosaveReducer, INITIAL_AUTOSAVE_STATE)
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
        dispatch({
          type: "invalid",
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
    dispatch({ type: "pending" })

    const timeoutId = window.setTimeout(() => {
      dispatch({ type: "saving" })
      void onSaveRef
        .current(input)
        .then(() => {
          if (saveRunRef.current !== saveRun) return null
          lastSavedKeyRef.current = inputKey
          dispatch({ type: "saved", message: result.message ?? "Saved" })
          return null
        })
        .catch((error: unknown) => {
          if (saveRunRef.current !== saveRun) return null
          dispatch({ type: "invalid", message: getErrorMessage(error) })
          return null
        })
    }, AUTOSAVE_DELAY_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [form])

  return state
}

export function buildSizeSaveInput(
  form: SizeFormState,
  templateId: ProductOptionTemplateId | null
): AutosaveBuildResult<SaveSizeInput> {
  const label = form.label.trim()
  const values = activeRowValues(form.values)

  if (!label) return { input: null, message: "Enter a label." }
  if (values.length === 0) {
    return { input: null, message: "Add at least one size." }
  }
  if (hasDuplicateNormalizedValues(values)) {
    return { input: null, message: "Size values must be unique." }
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

export function buildFlockingSaveInput(
  form: FlockingFormState,
  templateId: ProductOptionTemplateId | null
): AutosaveBuildResult<SaveFlockingInput> {
  const label = form.label.trim()
  const fields = activeRowValues(form.fields)

  if (!label) return { input: null, message: "Enter a label." }
  if (!isValidPriceInput(form.price)) {
    return { input: null, message: "Enter a valid price." }
  }
  if (fields.length === 0) {
    return { input: null, message: "Add at least one flocking field." }
  }
  if (hasDuplicateNormalizedValues(fields)) {
    return { input: null, message: "Flocking fields must be unique." }
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

export function findSizeTemplate(templates: Array<OptionTemplate>) {
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

export function findFlockingTemplate(templates: Array<OptionTemplate>) {
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

export function templateIdentityKey(
  prefix: string,
  template: OptionTemplate | null
) {
  return template ? `${prefix}-${template._id}` : prefix
}

export function sizeFormFromTemplate(
  template: OptionTemplate | null
): SizeFormState {
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

export function flockingFormFromTemplate(
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

export function createEditableRow(value: string): EditableRow {
  return {
    id: `row-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    value,
  }
}

export function updateEditableRows(
  rows: Array<EditableRow>,
  rowId: string,
  value: string
) {
  return rows.map((row) => (row.id === rowId ? { ...row, value } : row))
}

export function removeEditableRow(rows: Array<EditableRow>, rowId: string) {
  return rows.length <= 1 ? rows : rows.filter((row) => row.id !== rowId)
}

function editableRowsFromValues(values: Array<string>) {
  return values.map((value, index) => ({
    id: `row-${index}-${value.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    value,
  }))
}

function activeRowValues(rows: Array<EditableRow>) {
  return rows.flatMap((row) => {
    const value = row.value.trim()

    return value ? [value] : []
  })
}

function hasDuplicateNormalizedValues(values: Array<string>) {
  const seenValues = new Set<string>()

  return values.some((value) => {
    const normalizedValue = slugify(value)

    if (seenValues.has(normalizedValue)) return true
    seenValues.add(normalizedValue)
    return false
  })
}
