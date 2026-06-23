import { UserIcon } from "lucide-react"

export function AccountLoading() {
  return (
    <div className="grid gap-6">
      <div className="h-28 animate-pulse bg-[#f1f1f1]" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-24 animate-pulse bg-[#f1f1f1]" />
        <div className="h-24 animate-pulse bg-[#f1f1f1]" />
      </div>
    </div>
  )
}

export function SignInRequired() {
  return (
    <section className="mx-auto grid max-w-lg place-items-center border border-[#d9d9d9] bg-white p-10 text-center">
      <UserIcon className="mb-3 size-8 text-muted-foreground" />
      <h1 className="text-xl font-semibold">Sign in to view your account</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Orders and account details are available after sign-in.
      </p>
    </section>
  )
}

export function MissingBackend() {
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
