import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible"

function Collapsible({ ...props }: CollapsiblePrimitive.Root.Props) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />
}

export { Collapsible }
export { CollapsibleContent } from "@workspace/ui/components/collapsible-content"
export { CollapsibleTrigger } from "@workspace/ui/components/collapsible-trigger"
