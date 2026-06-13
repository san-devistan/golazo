import { ShopHeader } from "@/components/shop-header"
import { formatPrice, hasConvexUrl } from "@/lib/shop"
import { Link, createFileRoute } from "@tanstack/react-router"
/* eslint-disable max-lines, max-lines-per-function, no-underscore-dangle, react/jsx-max-depth, react-perf/jsx-no-new-function-as-prop, react-perf/jsx-no-new-object-as-prop */
import { api } from "@workspace/backend/api"
import { Badge } from "@workspace/ui/components/badge"
import { buttonVariants } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Separator } from "@workspace/ui/components/separator"
import { cn } from "@workspace/ui/lib/utils"
import { useQuery } from "convex/react"
import { ArrowLeftIcon } from "lucide-react"
import { useMemo, useState } from "react"

export const Route = createFileRoute("/products/$slug")({
  component: ProductPage,
})

type ChoiceConfig = {
  type: "choice"
  choices: Array<{
    label: string
    value: string
    priceDeltaCents: number
  }>
}

type PersonalizationConfig = {
  type: "personalization"
  fields: Array<{
    key: string
    label: string
    inputType: "text" | "number"
    required: boolean
  }>
}

type ProductOption = {
  _id: string
  label: string
  isRequired: boolean
  priceDeltaCents: number
  config: ChoiceConfig | PersonalizationConfig
}

type ProductMetadata = {
  _id: string
  label: string
  value: string
}

type ProductDetail = {
  product: {
    _id: string
    name: string
    description: string
    basePriceCents: number
    currency: string
    imageUrl: string | null
  }
  category: {
    name: string
    path: string
  }
  categories: Array<{
    _id: string
    name: string
    parentId: string | null
    sortOrder: number
  }>
  options: Array<ProductOption>
  metadata: Array<ProductMetadata>
}

type ProductConfigurationState = {
  productId: string
  choiceValues: Record<string, string>
  enabledOptions: Record<string, boolean>
  fieldValues: Record<string, Record<string, string>>
}

type ChoiceProductOption = ProductOption & { config: ChoiceConfig }
type PersonalizationProductOption = ProductOption & {
  config: PersonalizationConfig
}

function isChoiceOption(option: ProductOption): option is ChoiceProductOption {
  return option.config.type === "choice"
}

function isPersonalizationOption(
  option: ProductOption
): option is PersonalizationProductOption {
  return option.config.type === "personalization"
}

function createInitialConfiguration(
  detail: ProductDetail
): ProductConfigurationState {
  const choiceValues: Record<string, string> = {}
  const enabledOptions: Record<string, boolean> = {}

  for (const option of detail.options) {
    if (option.config.type === "choice") {
      choiceValues[option._id] = option.isRequired
        ? (option.config.choices[0]?.value ?? "")
        : ""
    }

    if (option.config.type === "personalization") {
      enabledOptions[option._id] = option.isRequired
    }
  }

  return {
    productId: detail.product._id,
    choiceValues,
    enabledOptions,
    fieldValues: {},
  }
}

function ProductPage() {
  const { slug } = Route.useParams()

  if (!hasConvexUrl()) {
    return <MissingBackend />
  }

  return <ProductDetailLoader slug={slug} />
}

function ProductDetailLoader({ slug }: { slug: string }) {
  const detail = useQuery(api.shop.getProduct, { slug })

  if (detail === undefined) {
    return (
      <main className="min-h-svh bg-muted p-6">
        <div className="mx-auto h-[40rem] max-w-6xl animate-pulse rounded-lg bg-background" />
      </main>
    )
  }

  if (detail === null) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-muted p-6">
        <section className="w-full max-w-lg rounded-lg border bg-background p-6 text-center">
          <h1 className="text-xl font-semibold">Product unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This product is not published or its category is inactive.
          </p>
          <Link to="/" className={cn(buttonVariants(), "mt-4")}>
            <ArrowLeftIcon />
            Back to catalog
          </Link>
        </section>
      </main>
    )
  }

  return <ProductConfigurator key={detail.product._id} detail={detail} />
}

function ProductConfigurator({ detail }: { detail: ProductDetail }) {
  const [configuration, setConfiguration] = useState(() =>
    createInitialConfiguration(detail)
  )

  const { choiceValues, enabledOptions, fieldValues } = configuration

  const totalPriceCents = useMemo(() => {
    return detail.options.reduce((total, option) => {
      if (option.config.type === "choice") {
        const selectedValue = choiceValues[option._id]
        const selectedChoice = option.config.choices.find(
          (choice) => choice.value === selectedValue
        )

        if (!selectedChoice) {
          return total
        }

        return total + option.priceDeltaCents + selectedChoice.priceDeltaCents
      }

      if (option.isRequired || enabledOptions[option._id]) {
        return total + option.priceDeltaCents
      }

      return total
    }, detail.product.basePriceCents)
  }, [choiceValues, detail, enabledOptions])

  return (
    <main className="min-h-svh bg-[linear-gradient(180deg,var(--background),var(--muted))]">
      <ShopHeader categories={detail.categories} />

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section className="min-w-0">
          <Link to="/" className={buttonVariants({ variant: "ghost" })}>
            <ArrowLeftIcon />
            Catalog
          </Link>
          <div className="overflow-hidden rounded-lg border bg-background">
            <div className="aspect-[4/5] bg-muted lg:aspect-[5/4]">
              {detail.product.imageUrl ? (
                <img
                  src={detail.product.imageUrl}
                  alt={detail.product.name}
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
                  No Cloudinary CDN image stored yet
                </div>
              )}
            </div>
          </div>
        </section>

        <aside className="h-fit rounded-lg border bg-background p-5">
          <div className="space-y-3">
            <Badge variant="secondary">{detail.category.path}</Badge>
            <div>
              <h1 className="text-3xl font-semibold tracking-normal">
                {detail.product.name}
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {detail.product.description || "No description yet."}
              </p>
            </div>
            <div className="text-2xl font-semibold">
              {formatPrice(totalPriceCents, detail.product.currency)}
            </div>
          </div>

          {detail.metadata.length > 0 && (
            <>
              <Separator className="my-5" />
              <dl className="grid grid-cols-2 gap-3 text-sm">
                {detail.metadata.map((item) => (
                  <div key={item._id} className="rounded-lg bg-muted p-3">
                    <dt className="text-xs text-muted-foreground">
                      {item.label}
                    </dt>
                    <dd className="mt-1 font-medium">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}

          <Separator className="my-5" />

          <div className="space-y-5">
            {detail.options.map((option) => {
              if (isChoiceOption(option)) {
                return (
                  <ChoiceOptionControl
                    key={option._id}
                    option={option}
                    value={choiceValues[option._id] ?? ""}
                    onChange={(value) =>
                      setConfiguration((current) => ({
                        ...current,
                        choiceValues: {
                          ...current.choiceValues,
                          [option._id]: value,
                        },
                      }))
                    }
                    currency={detail.product.currency}
                  />
                )
              }

              if (isPersonalizationOption(option)) {
                return (
                  <PersonalizationOptionControl
                    key={option._id}
                    option={option}
                    enabled={option.isRequired || enabledOptions[option._id]}
                    fieldValues={fieldValues[option._id] ?? {}}
                    onToggle={(enabled) =>
                      setConfiguration((current) => ({
                        ...current,
                        enabledOptions: {
                          ...current.enabledOptions,
                          [option._id]: enabled,
                        },
                      }))
                    }
                    onFieldChange={(fieldKey, value) =>
                      setConfiguration((current) => ({
                        ...current,
                        fieldValues: {
                          ...current.fieldValues,
                          [option._id]: {
                            ...current.fieldValues[option._id],
                            [fieldKey]: value,
                          },
                        },
                      }))
                    }
                    currency={detail.product.currency}
                  />
                )
              }

              return null
            })}
          </div>

          <Separator className="my-5" />
          <div className="rounded-lg bg-muted p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">Configuration total</span>
              <span className="text-lg font-semibold">
                {formatPrice(totalPriceCents, detail.product.currency)}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Cart and payment are intentionally not implemented in this first
              version.
            </p>
          </div>
        </aside>
      </div>
    </main>
  )
}

function ChoiceOptionControl({
  option,
  value,
  onChange,
  currency,
}: {
  option: ChoiceProductOption
  value: string
  onChange: (value: string) => void
  currency: string
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={option._id}>
        {option.label}
        {option.isRequired && (
          <span className="text-muted-foreground"> required</span>
        )}
      </Label>
      <select
        id={option._id}
        value={value}
        required={option.isRequired}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {!option.isRequired && <option value="">No selection</option>}
        {option.config.choices.map((choice) => (
          <option key={choice.value} value={choice.value}>
            {choice.label}
            {choice.priceDeltaCents > 0
              ? ` (+${formatPrice(choice.priceDeltaCents, currency)})`
              : ""}
          </option>
        ))}
      </select>
    </div>
  )
}

function PersonalizationOptionControl({
  option,
  enabled,
  fieldValues,
  onToggle,
  onFieldChange,
  currency,
}: {
  option: PersonalizationProductOption
  enabled: boolean
  fieldValues: Record<string, string>
  onToggle: (enabled: boolean) => void
  onFieldChange: (fieldKey: string, value: string) => void
  currency: string
}) {
  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium">{option.label}</div>
          <div className="text-sm text-muted-foreground">
            {formatPrice(option.priceDeltaCents, currency)}
          </div>
        </div>
        {!option.isRequired && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              aria-label={`Add ${option.label}`}
              checked={enabled}
              onChange={(event) => onToggle(event.target.checked)}
              className="size-4"
            />
            Add
          </label>
        )}
      </div>

      {enabled && (
        <div className="grid gap-3 sm:grid-cols-2">
          {option.config.fields.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={`${option._id}-${field.key}`}>
                {field.label}
              </Label>
              <Input
                id={`${option._id}-${field.key}`}
                type={field.inputType}
                required={field.required}
                value={fieldValues[field.key] ?? ""}
                onChange={(event) =>
                  onFieldChange(field.key, event.target.value)
                }
              />
            </div>
          ))}
        </div>
      )}
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
