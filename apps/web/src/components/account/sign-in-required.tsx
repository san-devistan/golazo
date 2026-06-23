import { UserIcon } from "lucide-react"

function SignInRequired() {
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

export { SignInRequired }
