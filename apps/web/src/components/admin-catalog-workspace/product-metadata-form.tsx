import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { EyeIcon, EyeOffIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { useCallback } from "react"

import { createLocalId, metadataTypeFromValue } from "./model"
import type { ProductMetadataFormState } from "./types"

export function ProductMetadataForm({
  metadata,
  onChange,
}: {
  metadata: Array<ProductMetadataFormState>
  onChange: (metadata: Array<ProductMetadataFormState>) => void
}) {
  const handleAdd = useCallback(() => {
    onChange([
      ...metadata,
      {
        localId: createLocalId("metadata"),
        metadataId: null,
        label: "",
        type: "text",
        value: "",
        showOnProductPage: true,
      },
    ])
  }, [metadata, onChange])

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-medium">Metadata</h3>
          <p className="text-sm text-muted-foreground">
            Flexible product facts and links shown on product pages.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
          <PlusIcon />
          Add
        </Button>
      </div>
      <div className="flex flex-col gap-3">
        {metadata.length === 0 ? (
          <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
            No metadata fields yet.
          </div>
        ) : (
          metadata.map((item, index) => (
            <ProductMetadataRow
              key={item.localId}
              item={item}
              index={index}
              metadata={metadata}
              onChange={onChange}
            />
          ))
        )}
      </div>
    </section>
  )
}

function ProductMetadataRow({
  item,
  index,
  metadata,
  onChange,
}: {
  item: ProductMetadataFormState
  index: number
  metadata: Array<ProductMetadataFormState>
  onChange: (metadata: Array<ProductMetadataFormState>) => void
}) {
  const handleLabelChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      updateMetadata(metadata, onChange, index, { label: event.target.value })
    },
    [index, metadata, onChange]
  )
  const handleTypeChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      updateMetadata(metadata, onChange, index, {
        type: metadataTypeFromValue(event.target.value),
      })
    },
    [index, metadata, onChange]
  )
  const handleValueChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      updateMetadata(metadata, onChange, index, { value: event.target.value })
    },
    [index, metadata, onChange]
  )
  const handleToggleVisibility = useCallback(() => {
    updateMetadata(metadata, onChange, index, {
      showOnProductPage: !item.showOnProductPage,
    })
  }, [index, item.showOnProductPage, metadata, onChange])
  const handleRemove = useCallback(() => {
    onChange(
      metadata.filter((currentItem) => currentItem.localId !== item.localId)
    )
  }, [item.localId, metadata, onChange])

  return (
    <div className="grid gap-3 rounded-lg border p-3 lg:grid-cols-[minmax(0,1fr)_8rem_minmax(0,1fr)_auto_auto] lg:items-center">
      <Input
        aria-label="Metadata label"
        value={item.label}
        placeholder="Label"
        onChange={handleLabelChange}
      />
      <select
        aria-label="Metadata type"
        value={item.type}
        onChange={handleTypeChange}
        className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <option value="text">Text</option>
        <option value="number">Number</option>
        <option value="boolean">Boolean</option>
        <option value="link">Link</option>
      </select>
      <Input
        aria-label="Metadata value"
        type={item.type === "link" ? "url" : "text"}
        value={item.value}
        placeholder={item.type === "link" ? "https://..." : "Value"}
        onChange={handleValueChange}
      />
      <MetadataVisibilityButton
        isVisible={item.showOnProductPage}
        onClick={handleToggleVisibility}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        title="Remove metadata"
        aria-label="Remove metadata"
        onClick={handleRemove}
      >
        <Trash2Icon />
      </Button>
    </div>
  )
}

function MetadataVisibilityButton({
  isVisible,
  onClick,
}: {
  isVisible: boolean
  onClick: () => void
}) {
  const Icon = isVisible ? EyeIcon : EyeOffIcon
  const label = isVisible
    ? "Hide metadata on product page"
    : "Show metadata on product page"

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      title={label}
      aria-label={label}
      aria-pressed={isVisible}
      onClick={onClick}
    >
      <Icon />
    </Button>
  )
}

function updateMetadata(
  metadata: Array<ProductMetadataFormState>,
  onChange: (metadata: Array<ProductMetadataFormState>) => void,
  index: number,
  patch: Partial<ProductMetadataFormState>
) {
  onChange(
    metadata.map((item, itemIndex) =>
      itemIndex === index ? { ...item, ...patch } : item
    )
  )
}
