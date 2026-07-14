import { BASE_CURRENCY } from "@/lib/money"
import { displayOptionLabel, formatPrice, sortBySortOrder } from "@/lib/shop"
import { Link } from "@tanstack/react-router"
import { buttonVariants } from "@workspace/ui/lib/button-variants"
import { useCallback } from "react"

import type { AdminOptionTemplate, ProductFormState } from "./types"

export function TemplateActivationForm({
  form,
  templates,
  onChange,
}: {
  form: ProductFormState
  templates: Array<AdminOptionTemplate>
  onChange: React.Dispatch<React.SetStateAction<ProductFormState | null>>
}) {
  const activeTemplates = sortBySortOrder(
    templates.filter((template) => template.isActive)
  )
  const activeTemplateIds = new Set(form.optionTemplateIds)

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-medium">Product options</h3>
          <p className="text-sm text-muted-foreground">
            Activate the shared options this product supports.
          </p>
        </div>
        <Link
          to="/admin/settings"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Settings
        </Link>
      </div>
      {activeTemplates.length === 0 ? (
        <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
          Create size and flocking options in Product settings first.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {activeTemplates.map((template) => (
            <TemplateActivationItem
              key={template._id}
              template={template}
              checked={activeTemplateIds.has(template._id)}
              onChange={onChange}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function TemplateActivationItem({
  template,
  checked,
  onChange,
}: {
  template: AdminOptionTemplate
  checked: boolean
  onChange: React.Dispatch<React.SetStateAction<ProductFormState | null>>
}) {
  const label = displayOptionLabel(template.label)
  const description =
    template.config.type === "choice"
      ? template.config.choices.map((choice) => choice.label).join(", ")
      : `${formatPrice(template.priceDeltaCents, BASE_CURRENCY)} extra`
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange((current) => {
        if (!current) return current

        return {
          ...current,
          optionTemplateIds: event.target.checked
            ? [...current.optionTemplateIds, template._id]
            : current.optionTemplateIds.filter(
                (templateId) => templateId !== template._id
              ),
        }
      })
    },
    [onChange, template._id]
  )

  return (
    <label className="flex items-start gap-3 rounded-lg border p-3 text-sm">
      <input
        type="checkbox"
        aria-label={`Activate ${label}`}
        checked={checked}
        onChange={handleChange}
        className="mt-1 size-4"
      />
      <span>
        <span className="block font-medium">{label}</span>
        <span className="mt-1 block text-muted-foreground">{description}</span>
      </span>
    </label>
  )
}
