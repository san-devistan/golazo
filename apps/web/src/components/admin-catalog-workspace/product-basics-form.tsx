import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { useCallback } from "react"

import type { AdminCategory, ProductFormState } from "./types"

export function ProductBasicsForm({
  form,
  assignableCategories,
  onChange,
}: {
  form: ProductFormState
  assignableCategories: Array<AdminCategory>
  onChange: React.Dispatch<React.SetStateAction<ProductFormState | null>>
}) {
  const handleNameChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange((current) =>
        current ? { ...current, name: event.target.value } : current
      )
    },
    [onChange]
  )
  const handleCategoryChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedCategoryId = event.target.value

      onChange((current) => {
        const nextCategory = assignableCategories.find(
          (category) => category._id === selectedCategoryId
        )

        return current && nextCategory
          ? { ...current, categoryId: nextCategory._id }
          : current
      })
    },
    [assignableCategories, onChange]
  )
  const handleBasePriceChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange((current) =>
        current ? { ...current, basePrice: event.target.value } : current
      )
    },
    [onChange]
  )

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="product-name">Name</Label>
        <Input
          id="product-name"
          value={form.name}
          onChange={handleNameChange}
          placeholder="PSG home jersey 2026"
        />
      </div>
      {assignableCategories.length > 1 && (
        <div className="space-y-2">
          <Label htmlFor="product-category">Collection</Label>
          <select
            id="product-category"
            aria-label="Product placement"
            value={form.categoryId ?? ""}
            onChange={handleCategoryChange}
            className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="" disabled>
              Select a collection
            </option>
            {assignableCategories.map((category) => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="product-price">Price</Label>
        <Input
          id="product-price"
          value={form.basePrice}
          onChange={handleBasePriceChange}
        />
      </div>
    </section>
  )
}
