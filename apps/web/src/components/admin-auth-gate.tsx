import { betterAuthErrorMessage } from "@/components/customer/utils"
import { PasswordInput } from "@/components/password-input"
import type { AdminAuthState } from "@/lib/admin-auth"
import { authClient } from "@/lib/auth-client"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  useCallback,
  useState,
} from "react"

type AdminAuthGateProps = {
  authState: Exclude<AdminAuthState, { status: "admin" }>
  redirectTo?: string
}

export function AdminAuthGate({ authState, redirectTo }: AdminAuthGateProps) {
  if (authState.status === "forbidden") {
    return <ForbiddenAdminGate email={authState.user.email} />
  }

  return <SignedOutAdminGate redirectTo={redirectTo} />
}

function SignedOutAdminGate({ redirectTo }: { redirectTo?: string }) {
  const [email, setEmail] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [password, setPassword] = useState("")

  const handleEmailChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setEmail(event.target.value)
    },
    []
  )

  const handlePasswordChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setPassword(event.target.value)
    },
    []
  )

  const signIn = useCallback(async () => {
    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      const result = await authClient.signIn.email({ email, password })

      if (result.error) {
        throw result.error
      }

      window.location.assign(redirectTo ?? "/admin")
    } catch (error) {
      setErrorMessage(betterAuthErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }, [email, password, redirectTo])

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      void signIn()
    },
    [signIn]
  )

  return renderAdminGateShell({
    children: (
      <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-2">
          <Label htmlFor="admin-email">Email</Label>
          <Input
            id="admin-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={handleEmailChange}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="admin-password">Password</Label>
          <PasswordInput
            id="admin-password"
            autoComplete="current-password"
            required
            value={password}
            onChange={handlePasswordChange}
          />
        </div>
        {errorMessage ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {errorMessage}
          </p>
        ) : null}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Signing in" : "Sign in"}
        </Button>
      </form>
    ),
    description: "Sign in with an admin account to continue.",
    title: "Admin access",
  })
}

function ForbiddenAdminGate({ email }: { email: string }) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const signOut = useCallback(async () => {
    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      const result = await authClient.signOut()

      if (result.error) {
        throw result.error
      }

      window.location.assign("/admin")
    } catch (error) {
      setErrorMessage(betterAuthErrorMessage(error))
      setIsSubmitting(false)
    }
  }, [])

  const handleSignOut = useCallback(() => {
    void signOut()
  }, [signOut])

  return renderAdminGateShell({
    children: (
      <div className="mt-5 grid gap-4">
        {errorMessage ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {errorMessage}
          </p>
        ) : null}
        <Button type="button" disabled={isSubmitting} onClick={handleSignOut}>
          {isSubmitting ? "Signing out" : "Sign out"}
        </Button>
      </div>
    ),
    description: `${email} is signed in, but is not an admin account.`,
    title: "Admin access denied",
  })
}

function renderAdminGateShell({
  children,
  description,
  title,
}: {
  children?: ReactNode
  description: string
  title: string
}) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted p-6">
      <section className="w-full max-w-md rounded-lg border bg-background p-6">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        {children}
      </section>
    </main>
  )
}
