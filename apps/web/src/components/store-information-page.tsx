import { ShopFooter } from "@/components/shop-footer"
import { ShopHeader, type ShopHeaderCategory } from "@/components/shop-header"
import { getStorePage, type StorePageId } from "@/lib/store-pages"
import { Link } from "@tanstack/react-router"
import { buttonVariants } from "@workspace/ui/lib/button-variants"
import { cn } from "@workspace/ui/lib/utils"
import { ArrowLeftIcon } from "lucide-react"

const EMPTY_CATEGORIES: Array<ShopHeaderCategory> = []

export function StoreInformationPage({ pageId }: { pageId: StorePageId }) {
  const page = getStorePage(pageId)

  return (
    <main className="min-h-svh bg-white text-[#111]">
      <ShopHeader categories={EMPTY_CATEGORIES} />
      <section className="mx-auto grid max-w-5xl gap-10 px-4 pt-8 pb-14 sm:px-6 lg:px-10">
        <Link
          to="/"
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "w-fit rounded-none"
          )}
        >
          <ArrowLeftIcon />
          Back to shop
        </Link>

        <header className="grid gap-4 border-b border-[#d9d9d9] pb-8">
          <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
            {page.eyebrow}
          </p>
          <h1 className="font-oswald text-5xl leading-none font-black tracking-wide uppercase sm:text-6xl">
            {page.title}
          </h1>
          <p className="max-w-3xl text-base leading-7 text-muted-foreground">
            {page.summary}
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          {page.sections.map((section) => (
            <section
              key={section.title}
              className="border-t-4 border-[#111] bg-[#f7f7f7] p-5"
            >
              <h2 className="font-oswald text-2xl font-bold tracking-wide uppercase">
                {section.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {section.body}
              </p>
            </section>
          ))}
        </div>
      </section>
      <ShopFooter categories={EMPTY_CATEGORIES} />
    </main>
  )
}
