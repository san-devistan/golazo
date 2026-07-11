import {
  groupCategoriesByParentId,
  type ShopHeaderCategory,
} from "@/components/shop-header-navigation-data"
import { categoryHref } from "@/lib/catalog-navigation"
import { STORE_FOOTER_SECTIONS, type StorePageLink } from "@/lib/store-pages"
import { Link } from "@tanstack/react-router"
import {
  ArrowUpRightIcon,
  RotateCcwIcon,
  ShieldCheckIcon,
  TruckIcon,
} from "lucide-react"
import { type ReactNode, useMemo } from "react"

const MAX_FOOTER_CATEGORIES = 6

const FOOTER_PROMISES = [
  {
    label: "Free shipping worldwide",
    icon: TruckIcon,
  },
  {
    label: "Satisfied or refunded",
    icon: RotateCcwIcon,
  },
  {
    label: "Secure checkout",
    icon: ShieldCheckIcon,
  },
] as const

export function ShopFooter({
  categories,
}: {
  categories: Array<ShopHeaderCategory>
}) {
  const primaryCategories = useMemo(() => {
    const categoriesByParentId = groupCategoriesByParentId(categories)

    return categoriesByParentId.get(null)?.slice(0, MAX_FOOTER_CATEGORIES) ?? []
  }, [categories])

  return (
    <footer className="border-t border-black/15 bg-white text-[#111]">
      <div className="mx-auto max-w-[1536px] px-4 pt-12 pb-8 sm:px-6 lg:px-10">
        <FooterPromises />

        <div className="mt-12 grid gap-y-10 border-t border-black/15 pt-10 lg:grid-cols-[minmax(360px,0.85fr)_minmax(0,1.65fr)] lg:gap-x-20 xl:grid-cols-[minmax(520px,0.85fr)_minmax(0,1.65fr)] xl:gap-x-24 2xl:grid-cols-[minmax(620px,0.85fr)_minmax(0,1.65fr)] 2xl:gap-x-32">
          <div className="grid content-start gap-4">
            <Link
              to="/"
              aria-label="Golazo home"
              className="w-fit font-oswald text-6xl leading-[0.85] font-black tracking-normal uppercase sm:text-7xl lg:text-[5rem]"
            >
              GOLAZO
            </Link>
            <p className="max-w-xl text-sm leading-6 text-black/55">
              Football shirts for match days, collections, and everyday support.
              Secure checkout, worldwide shipping, and clear policies on every
              order.
            </p>
          </div>

          <div className="grid gap-y-8 sm:grid-cols-2 sm:gap-x-10 lg:grid-cols-4 lg:gap-x-12 xl:gap-x-16">
            <FooterColumn title="Shop">
              <FooterRouterLink to="/">Home</FooterRouterLink>
              <FooterRouterLink to="/">All jerseys</FooterRouterLink>
              <FooterRouterLink to="/account">Account</FooterRouterLink>
              {primaryCategories.map((category) => (
                <FooterRouterLink
                  key={category._id}
                  to={categoryHref(category, "public")}
                >
                  {category.name}
                </FooterRouterLink>
              ))}
            </FooterColumn>

            {STORE_FOOTER_SECTIONS.map((section) => (
              <FooterColumn key={section.title} title={section.title}>
                {section.links.map((link) => (
                  <FooterStorePageLink key={link.pageId} link={link} />
                ))}
              </FooterColumn>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

function FooterPromises() {
  return (
    <ul className="grid list-none gap-6 p-0 text-sm text-black/55 sm:grid-cols-3">
      {FOOTER_PROMISES.map((promise) => (
        <FooterPromiseItem key={promise.label} promise={promise} />
      ))}
    </ul>
  )
}

function FooterPromiseItem({
  promise,
}: {
  promise: (typeof FOOTER_PROMISES)[number]
}) {
  const Icon = promise.icon

  return (
    <li className="grid justify-items-center gap-2 text-center leading-tight">
      <Icon className="size-[22px] text-[#111]" />
      <span>{promise.label}</span>
    </li>
  )
}

function FooterColumn({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <nav aria-label={title} className="grid w-full content-start gap-3">
      <h2 className="font-oswald text-base leading-none font-black tracking-normal text-[#111] uppercase">
        {title}
      </h2>
      <div className="grid gap-2 text-sm">{children}</div>
    </nav>
  )
}

function FooterStorePageLink({ link }: { link: StorePageLink }) {
  const params = useMemo(() => ({ pageId: link.pageId }), [link.pageId])

  return (
    <FooterRouterLink to="/pages/$pageId" params={params}>
      {link.label}
    </FooterRouterLink>
  )
}

function FooterRouterLink({
  children,
  params,
  to,
}: {
  children: ReactNode
  params?: Record<string, string>
  to: string
}) {
  return (
    <Link
      to={to}
      params={params}
      className="group inline-flex w-fit items-center gap-1.5 whitespace-nowrap text-black/55 transition hover:text-[#111] focus-visible:ring-2 focus-visible:ring-[#111]/30 focus-visible:outline-none"
    >
      <span>{children}</span>
      <ArrowUpRightIcon className="size-3.5 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100" />
    </Link>
  )
}
