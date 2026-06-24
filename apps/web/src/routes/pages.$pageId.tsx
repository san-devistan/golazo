import { StoreInformationPage } from "@/components/store-information-page"
import { isStorePageId } from "@/lib/store-pages"
import { createFileRoute, notFound } from "@tanstack/react-router"

export const Route = createFileRoute("/pages/$pageId")({
  loader: ({ params }) => {
    if (!isStorePageId(params.pageId)) {
      throw notFound()
    }

    return { pageId: params.pageId }
  },
  component: StorePageRoute,
})

function StorePageRoute() {
  const { pageId } = Route.useLoaderData()

  return <StoreInformationPage pageId={pageId} />
}
