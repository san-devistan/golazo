import {
  FlockingOptionEditor,
  SizeOptionEditor,
} from "@/components/admin-product-settings-editors"
import {
  FLOCKING_SORT_ORDER,
  SIZE_SORT_ORDER,
  findFlockingTemplate,
  findSizeTemplate,
  templateIdentityKey,
  type SaveFlockingInput,
  type SaveSizeInput,
} from "@/components/admin-product-settings-model"
import { priceInputToCents, sortBySortOrder } from "@/lib/shop"
import { Link } from "@tanstack/react-router"
import { api } from "@workspace/backend/api"
import { buttonVariants } from "@workspace/ui/lib/button-variants"
import { useMutation, useQuery } from "convex/react"
import { ArrowLeftIcon, ClipboardListIcon } from "lucide-react"
import { useCallback } from "react"

export function ProductSettings() {
  const data = useQuery(api.shop.listAdmin)
  const upsertOptionTemplate = useMutation(api.shop.upsertOptionTemplate)
  const optionTemplates = sortBySortOrder(data?.optionTemplates ?? [])
  const sizeTemplate = findSizeTemplate(optionTemplates)
  const flockingTemplate = findFlockingTemplate(optionTemplates)
  const handleSaveSize = useCallback(
    async (input: SaveSizeInput) => {
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
    },
    [sizeTemplate?.sortOrder, upsertOptionTemplate]
  )
  const handleSaveFlocking = useCallback(
    async (input: SaveFlockingInput) => {
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
    },
    [flockingTemplate?.sortOrder, upsertOptionTemplate]
  )

  if (data === undefined) {
    return (
      <main className="min-h-svh bg-muted p-6">
        <div className="mx-auto h-[40rem] max-w-6xl animate-pulse rounded-lg bg-background" />
      </main>
    )
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
