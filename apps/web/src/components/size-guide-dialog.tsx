import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"
import { RulerIcon } from "lucide-react"
import { useCallback, useMemo, useState } from "react"

type SizeGuideUnitSystem = "metric" | "us"

type SizeRange = readonly [number, number]

type SizeGuideReference = {
  size: string
  heightCm: SizeRange
  weightKg: SizeRange
}

const CENTIMETERS_PER_INCH = 2.54
const POUNDS_PER_KILOGRAM = 2.20462

const SIZE_GUIDE_REFERENCES: Array<SizeGuideReference> = [
  { size: "S", heightCm: [162, 170], weightKg: [50, 62] },
  { size: "M", heightCm: [170, 176], weightKg: [62, 78] },
  { size: "L", heightCm: [176, 182], weightKg: [78, 83] },
  { size: "XL", heightCm: [182, 190], weightKg: [83, 90] },
  { size: "XXL", heightCm: [190, 195], weightKg: [90, 97] },
]

function isSizeGuideUnitSystem(value: string | undefined) {
  return value === "metric" || value === "us"
}

function formatMetricRange(range: SizeRange, unit: string) {
  return `${range[0]}-${range[1]} ${unit}`
}

function formatWeightRange(range: SizeRange, unitSystem: SizeGuideUnitSystem) {
  if (unitSystem === "metric") {
    return formatMetricRange(range, "kg")
  }

  return `${Math.round(range[0] * POUNDS_PER_KILOGRAM)}-${Math.round(
    range[1] * POUNDS_PER_KILOGRAM
  )} lb`
}

function formatHeightInFeetAndInches(centimeters: number) {
  const totalInches = Math.round(centimeters / CENTIMETERS_PER_INCH)
  const feet = Math.floor(totalInches / 12)
  const inches = totalInches % 12

  return `${feet}'${inches}"`
}

function formatHeightRange(range: SizeRange, unitSystem: SizeGuideUnitSystem) {
  if (unitSystem === "metric") {
    return formatMetricRange(range, "cm")
  }

  return `${formatHeightInFeetAndInches(
    range[0]
  )}-${formatHeightInFeetAndInches(range[1])}`
}

function SizeGuideUnitSwitcher({
  value,
  onChange,
}: {
  value: Array<SizeGuideUnitSystem>
  onChange: (value: Array<string>) => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs font-medium text-muted-foreground uppercase">
        Measurements
      </p>
      <ToggleGroup
        value={value}
        onValueChange={onChange}
        variant="outline"
        size="sm"
        aria-label="Size guide units"
      >
        <ToggleGroupItem value="metric" aria-label="Show EU units">
          EU
        </ToggleGroupItem>
        <ToggleGroupItem value="us" aria-label="Show US units">
          US
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  )
}

function SizeGuideTable({ unitSystem }: { unitSystem: SizeGuideUnitSystem }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Size</TableHead>
          <TableHead className="text-right">Height</TableHead>
          <TableHead className="text-right">Weight</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {SIZE_GUIDE_REFERENCES.map((reference) => (
          <SizeGuideTableRow
            key={reference.size}
            reference={reference}
            unitSystem={unitSystem}
          />
        ))}
      </TableBody>
    </Table>
  )
}

function SizeGuideTableRow({
  reference,
  unitSystem,
}: {
  reference: SizeGuideReference
  unitSystem: SizeGuideUnitSystem
}) {
  return (
    <TableRow>
      <TableCell className="font-medium">{reference.size}</TableCell>
      <TableCell className="text-right">
        {formatHeightRange(reference.heightCm, unitSystem)}
      </TableCell>
      <TableCell className="text-right">
        {formatWeightRange(reference.weightKg, unitSystem)}
      </TableCell>
    </TableRow>
  )
}

export function SizeGuideDialog() {
  const [unitSystem, setUnitSystem] = useState<SizeGuideUnitSystem>("metric")
  const unitValue = useMemo(() => [unitSystem], [unitSystem])
  const triggerButton = useMemo(
    () => (
      <Button type="button" variant="link" size="sm" className="px-0 pl-0!" />
    ),
    []
  )
  const handleUnitSystemChange = useCallback((value: Array<string>) => {
    const nextUnitSystem = value[0]

    if (isSizeGuideUnitSystem(nextUnitSystem)) {
      setUnitSystem(nextUnitSystem)
    }
  }, [])

  return (
    <Dialog>
      <DialogTrigger render={triggerButton}>
        <RulerIcon data-icon="inline-start" />
        Size guide
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Size guide</DialogTitle>
          <DialogDescription>
            Height and weight references by jersey size.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <SizeGuideUnitSwitcher
            value={unitValue}
            onChange={handleUnitSystemChange}
          />
          <SizeGuideTable unitSystem={unitSystem} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
