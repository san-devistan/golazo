import { PasswordInput } from "@/components/password-input"
import { authClient } from "@/lib/auth-client"
import { getErrorMessage } from "@/lib/shop"
import { Link, createFileRoute } from "@tanstack/react-router"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import { Label } from "@workspace/ui/components/label"
import { cn } from "@workspace/ui/lib/utils"
import { ArrowLeftIcon, KeyRoundIcon } from "lucide-react"
import { type FormEvent, useState } from "react"

type ResetPasswordSearch = {
  error?: string
  token?: string
}

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search): ResetPasswordSearch => ({
    error: typeof search.error === "string" ? search.error : undefined,
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  component: ResetPasswordPage,
})

function betterAuthErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message
  }

  return getErrorMessage(error)
}

function ResetPasswordPage() {
  const search = Route.useSearch()

  return (
    <main className="grid min-h-svh place-items-center bg-white px-4 py-12 text-[#111]">
      <section className="w-full max-w-md border border-[#d9d9d9] bg-white p-6">
        <Link
          to="/"
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "mb-5 rounded-none"
          )}
        >
          <ArrowLeftIcon />
          Continue shopping
        </Link>

        {search.error || !search.token ? (
          <InvalidResetLink />
        ) : (
          <ResetPasswordForm token={search.token} />
        )}
      </section>
    </main>
  )
}

function InvalidResetLink() {
  return (
    <div className="text-center">
      <KeyRoundIcon className="mx-auto mb-3 size-8 text-muted-foreground" />
      <h1 className="text-xl font-semibold">Reset link expired</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Request a new password reset link from the sign-in dialog.
      </p>
    </div>
  )
}

function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isComplete, setIsComplete] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      if (password !== confirmPassword) {
        throw new Error("Passwords do not match.")
      }

      const result = await authClient.resetPassword({
        newPassword: password,
        token,
      })

      if (result.error) {
        throw result.error
      }

      setPassword("")
      setConfirmPassword("")
      setIsComplete(true)
    } catch (error) {
      setErrorMessage(betterAuthErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isComplete) {
    return (
      <div className="text-center">
        <KeyRoundIcon className="mx-auto mb-3 size-8 text-[#166534]" />
        <h1 className="text-xl font-semibold">Password updated</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You can now sign in with your new password.
        </p>
        <Link to="/" className={cn(buttonVariants(), "mt-5 rounded-none")}>
          Go to shop
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)}>
      <KeyRoundIcon className="mb-3 size-8 text-muted-foreground" />
      <h1 className="text-xl font-semibold">Choose a new password</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Use at least 8 characters.
      </p>

      <div className="mt-6 grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="reset-password">New password</Label>
          <PasswordInput
            id="reset-password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="reset-confirm-password">Confirm password</Label>
          <PasswordInput
            id="reset-confirm-password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </div>
        {errorMessage ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {errorMessage}
          </p>
        ) : null}
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="mt-5 w-full rounded-none"
      >
        {isSubmitting ? "Updating" : "Update password"}
      </Button>
    </form>
  )
}
