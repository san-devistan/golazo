import { hasConvexUrl } from "@/lib/shop"
import { Link, createFileRoute } from "@tanstack/react-router"
import { api } from "@workspace/backend/api"
import { Badge } from "@workspace/ui/components/badge"
import { buttonVariants } from "@workspace/ui/components/button"
import { useQuery } from "convex/react"
import { ArrowLeftIcon, EyeIcon, FileTextIcon, MailIcon } from "lucide-react"

export const Route = createFileRoute("/admin/emails")({
  component: AdminEmailsPage,
})

type UserEmailPreview = {
  description: string
  html: string
  key: string
  name: string
  subject: string
  text: string
}

const EMPTY_EMAIL_PREVIEWS: Array<UserEmailPreview> = []

function AdminEmailsPage() {
  if (!hasConvexUrl()) {
    return <MissingBackend />
  }

  return <AdminEmails />
}

function AdminEmails() {
  const previews = useQuery(api.orderEmails.listUserEmailPreviews) as
    | Array<UserEmailPreview>
    | undefined

  if (previews === undefined) {
    return (
      <main className="min-h-svh bg-muted p-6">
        <div className="mx-auto h-[40rem] max-w-7xl animate-pulse rounded-lg bg-background" />
      </main>
    )
  }

  const templates = previews ?? EMPTY_EMAIL_PREVIEWS

  return (
    <main className="min-h-svh bg-[linear-gradient(180deg,var(--background),var(--muted))]">
      <header className="border-b bg-background/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/admin" className={buttonVariants({ variant: "ghost" })}>
            <ArrowLeftIcon />
            Admin
          </Link>
          <Badge variant="secondary">Customer emails</Badge>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 pt-4 pb-8 sm:px-6">
        <div className="mb-7">
          <h1 className="text-3xl font-semibold tracking-normal">
            Email previews
          </h1>
        </div>

        {templates.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
            <EmailTemplateList templates={templates} />
            <div className="grid gap-4">
              {templates.map((template) => (
                <EmailTemplatePreview key={template.key} template={template} />
              ))}
            </div>
          </div>
        ) : (
          <EmptyEmailPreviews />
        )}
      </section>
    </main>
  )
}

function EmailTemplateList({
  templates,
}: {
  templates: Array<UserEmailPreview>
}) {
  return (
    <nav aria-label="Email templates" className="grid content-start gap-2">
      {templates.map((template) => (
        <a
          key={template.key}
          href={`#${template.key}`}
          className="border bg-background p-3 text-left transition hover:border-[#111] focus-visible:border-[#111] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <span className="flex items-center gap-2 font-medium">
            <MailIcon className="size-4" />
            {template.name}
          </span>
          <span className="mt-2 block text-sm leading-5 text-muted-foreground">
            {template.description}
          </span>
        </a>
      ))}
    </nav>
  )
}

function EmailTemplatePreview({ template }: { template: UserEmailPreview }) {
  return (
    <section
      id={template.key}
      className="min-w-0 scroll-mt-4 border bg-background"
    >
      <div className="border-b p-4">
        <div className="text-xs font-medium text-muted-foreground uppercase">
          Subject
        </div>
        <h2 className="mt-1 text-xl font-medium">{template.subject}</h2>
      </div>

      <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <EyeIcon className="size-4" />
            HTML
          </div>
          <div className="overflow-hidden border bg-white">
            <iframe
              title={`${template.name} HTML preview`}
              sandbox=""
              srcDoc={template.html}
              className="h-[34rem] w-full bg-white xl:h-[42rem]"
            />
          </div>
        </section>

        <section className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <FileTextIcon className="size-4" />
            Plain text
          </div>
          <pre className="h-[34rem] overflow-auto border bg-muted p-4 font-mono text-xs leading-5 break-words whitespace-pre-wrap text-foreground xl:h-[42rem]">
            {template.text}
          </pre>
        </section>
      </div>
    </section>
  )
}

function EmptyEmailPreviews() {
  return (
    <div className="grid place-items-center border bg-background p-12 text-center">
      <MailIcon className="mb-3 size-8 text-muted-foreground" />
      <h2 className="text-lg font-medium">No email previews</h2>
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
