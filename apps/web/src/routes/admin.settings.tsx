import {
  centsToPriceInput,
  getErrorMessage,
  hasConvexUrl,
  priceInputToCents,
  sortBySortOrder,
} from "@/lib/shop"
import { Link, createFileRoute } from "@tanstack/react-router"
/* eslint-disable max-lines, max-lines-per-function, no-underscore-dangle, react/jsx-max-depth, react-perf/jsx-no-new-function-as-prop */
import { api } from "@workspace/backend/api"
import { Badge } from "@workspace/ui/components/badge"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"
import { useMutation, useQuery } from "convex/react"
import type { GenericId } from "convex/values"
import { ArrowLeftIcon, SaveIcon, SettingsIcon } from "lucide-react"
import { useState } from "react"

export const Route = createFileRoute("/admin/settings")({
  component: ProductSettingsPage,
})

type ProductOptionTemplateId = GenericId<"productOptionTemplates">

type OptionTemplate = {
  _id: ProductOptionTemplateId
  kind: "choice" | "personalization"
  label: string
  isRequired: boolean
  priceDeltaCents: number
  sortOrder: number
  isActive: boolean
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

type SelectionFormState = {
  templateId: ProductOptionTemplateId | null
  label: string
  isRequired: boolean
  valuesText: string
  sortOrder: string
  isActive: boolean
}

type ToggleFormState = {
  templateId: ProductOptionTemplateId | null
  label: string
  price: string
  fieldsText: string
  sortOrder: string
  isActive: boolean
}

function emptySelectionForm(): SelectionFormState {
  return {
    templateId: null,
    label: "Size",
    isRequired: true,
    valuesText: "S\nM\nL\nXL",
    sortOrder: "0",
    isActive: true,
  }
}

function emptyToggleForm(): ToggleFormState {
  return {
    templateId: null,
    label: "Jersey Flocking",
    price: "4.00",
    fieldsText: "Name\nNumber",
    sortOrder: "10",
    isActive: true,
  }
}

function splitLines(value: string) {
  return value.split(/\r?\n/).flatMap((line) => {
    const trimmedLine = line.trim()

    return trimmedLine ? [trimmedLine] : []
  })
}

function parseSortOrder(value: string, fallback: number) {
  const parsedValue = Number.parseInt(value, 10)
  return Number.isFinite(parsedValue) ? parsedValue : fallback
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
  const archiveOptionTemplate = useMutation(api.shop.archiveOptionTemplate)
  const [selectionForm, setSelectionForm] = useState(emptySelectionForm)
  const [toggleForm, setToggleForm] = useState(emptyToggleForm)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const optionTemplates = sortBySortOrder(data?.optionTemplates ?? [])

  if (data === undefined) {
    return (
      <main className="min-h-svh bg-muted p-6">
        <div className="mx-auto h-[40rem] max-w-6xl animate-pulse rounded-lg bg-background" />
      </main>
    )
  }

  async function handleSaveSelection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setStatusMessage(null)

    try {
      await upsertOptionTemplate({
        templateId: selectionForm.templateId,
        kind: "choice",
        label: selectionForm.label,
        isRequired: selectionForm.isRequired,
        priceDeltaCents: 0,
        sortOrder: parseSortOrder(selectionForm.sortOrder, 0),
        isActive: selectionForm.isActive,
        choices: splitLines(selectionForm.valuesText),
        fields: [],
      })
      setStatusMessage("Selection option saved.")
      setSelectionForm(emptySelectionForm())
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function handleSaveToggle(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setStatusMessage(null)

    try {
      await upsertOptionTemplate({
        templateId: toggleForm.templateId,
        kind: "personalization",
        label: toggleForm.label,
        isRequired: false,
        priceDeltaCents: priceInputToCents(toggleForm.price),
        sortOrder: parseSortOrder(toggleForm.sortOrder, 10),
        isActive: toggleForm.isActive,
        choices: [],
        fields: splitLines(toggleForm.fieldsText),
      })
      setStatusMessage("Toggle option saved.")
      setToggleForm(emptyToggleForm())
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function handleArchiveTemplate(templateId: ProductOptionTemplateId) {
    setErrorMessage(null)
    setStatusMessage(null)

    try {
      await archiveOptionTemplate({ templateId })
      setStatusMessage("Option disabled.")
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  return (
    <main className="min-h-svh bg-[linear-gradient(180deg,var(--background),var(--muted))]">
      <header className="border-b bg-background/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/admin" className={buttonVariants({ variant: "ghost" })}>
            <ArrowLeftIcon />
            Admin
          </Link>
          <Badge variant="destructive">Admin is public until auth exists</Badge>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase">
              Product settings
            </p>
            <h1 className="text-3xl font-semibold tracking-normal">
              Shared jersey options.
            </h1>
          </div>
          <p className="max-w-xl text-sm text-muted-foreground">
            Define the standard product options once, then activate them per
            product from the product dialog.
          </p>
        </div>

        {(errorMessage || statusMessage) && (
          <div
            className={cn(
              "mb-4 rounded-lg border p-3 text-sm",
              errorMessage
                ? "border-destructive/40 bg-destructive/10 text-destructive"
                : "bg-muted"
            )}
          >
            {errorMessage ?? statusMessage}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <form
            className="rounded-lg border bg-background p-4"
            onSubmit={(event) => void handleSaveSelection(event)}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">Unique selection</h2>
                <p className="text-sm text-muted-foreground">
                  Use this for size values such as S, M, L, XL.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectionForm(emptySelectionForm())}
              >
                Reset
              </Button>
            </div>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="selection-label">Label</Label>
                <Input
                  id="selection-label"
                  value={selectionForm.label}
                  onChange={(event) =>
                    setSelectionForm((current) => ({
                      ...current,
                      label: event.target.value,
                    }))
                  }
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectionForm.isRequired}
                  onChange={(event) =>
                    setSelectionForm((current) => ({
                      ...current,
                      isRequired: event.target.checked,
                    }))
                  }
                  className="size-4"
                />
                Required on products where active
              </label>
              <div className="space-y-2">
                <Label htmlFor="selection-values">Values</Label>
                <Textarea
                  id="selection-values"
                  value={selectionForm.valuesText}
                  onChange={(event) =>
                    setSelectionForm((current) => ({
                      ...current,
                      valuesText: event.target.value,
                    }))
                  }
                />
              </div>
              <Button type="submit">
                <SaveIcon />
                Save selection
              </Button>
            </div>
          </form>

          <form
            className="rounded-lg border bg-background p-4"
            onSubmit={(event) => void handleSaveToggle(event)}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">Toggle with fields</h2>
                <p className="text-sm text-muted-foreground">
                  Use this for jersey flocking with name and number inputs.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setToggleForm(emptyToggleForm())}
              >
                Reset
              </Button>
            </div>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="toggle-label">Label</Label>
                <Input
                  id="toggle-label"
                  value={toggleForm.label}
                  onChange={(event) =>
                    setToggleForm((current) => ({
                      ...current,
                      label: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="toggle-price">Extra price</Label>
                <Input
                  id="toggle-price"
                  value={toggleForm.price}
                  onChange={(event) =>
                    setToggleForm((current) => ({
                      ...current,
                      price: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="toggle-fields">Fields</Label>
                <Textarea
                  id="toggle-fields"
                  value={toggleForm.fieldsText}
                  onChange={(event) =>
                    setToggleForm((current) => ({
                      ...current,
                      fieldsText: event.target.value,
                    }))
                  }
                />
              </div>
              <Button type="submit">
                <SaveIcon />
                Save toggle
              </Button>
            </div>
          </form>
        </div>

        <section className="mt-8">
          <div className="mb-4 flex items-center gap-2">
            <SettingsIcon className="size-4" />
            <h2 className="font-semibold">Configured options</h2>
          </div>
          {optionTemplates.length === 0 ? (
            <div className="rounded-lg border bg-background p-6 text-sm text-muted-foreground">
              Save the size and flocking options above to make them available in
              product dialogs.
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {optionTemplates.map((template) => (
                <OptionTemplateCard
                  key={template._id}
                  template={template}
                  onEdit={() => {
                    if (template.config.type === "choice") {
                      setSelectionForm({
                        templateId: template._id,
                        label: template.label,
                        isRequired: template.isRequired,
                        valuesText: template.config.choices
                          .map((choice) => choice.label)
                          .join("\n"),
                        sortOrder: String(template.sortOrder),
                        isActive: template.isActive,
                      })
                      return
                    }

                    setToggleForm({
                      templateId: template._id,
                      label: template.label,
                      price: centsToPriceInput(template.priceDeltaCents),
                      fieldsText: template.config.fields
                        .map((field) => field.label)
                        .join("\n"),
                      sortOrder: String(template.sortOrder),
                      isActive: template.isActive,
                    })
                  }}
                  onArchive={() => {
                    void handleArchiveTemplate(template._id)
                  }}
                />
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  )
}

function OptionTemplateCard({
  template,
  onEdit,
  onArchive,
}: {
  template: OptionTemplate
  onEdit: () => void
  onArchive: () => void
}) {
  const detail =
    template.config.type === "choice"
      ? template.config.choices.map((choice) => choice.label).join(", ")
      : `${centsToPriceInput(template.priceDeltaCents)} extra, ${template.config.fields
          .map((field) => field.label)
          .join(", ")}`

  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{template.label}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
        </div>
        <Badge variant={template.isActive ? "secondary" : "outline"}>
          {template.isActive ? "Active" : "Disabled"}
        </Badge>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onEdit}>
          Edit
        </Button>
        {template.isActive && (
          <Button type="button" variant="ghost" onClick={onArchive}>
            Disable
          </Button>
        )}
      </div>
    </div>
  )
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
