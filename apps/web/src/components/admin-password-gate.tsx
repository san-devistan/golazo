import { loginAdmin } from "@/lib/admin-auth"
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

type AdminPasswordGateProps = {
  isConfigured: boolean
  redirectTo?: string
}

export function AdminPasswordGate({
  isConfigured,
  redirectTo,
}: AdminPasswordGateProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [password, setPassword] = useState("")

  const handlePasswordChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setPassword(event.target.value)
    },
    []
  )

  const submitPassword = useCallback(async () => {
    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      const result = await loginAdmin({ data: { password } })

      if (result.status === "authenticated") {
        window.location.assign(redirectTo ?? "/admin")
        return
      }

      setErrorMessage(
        result.status === "not-configured"
          ? "Set ADMIN_PASSWORD before opening the admin."
          : "Invalid admin password."
      )
    } catch {
      setErrorMessage("Unable to check the admin password.")
    } finally {
      setIsSubmitting(false)
    }
  }, [password, redirectTo])

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      void submitPassword()
    },
    [submitPassword]
  )

  if (!isConfigured) {
    return renderAdminPasswordGateShell({
      description:
        "Set `ADMIN_PASSWORD` in `apps/web/.env.local`, then restart the web dev server.",
      title: "Set an admin password",
    })
  }

  return renderAdminPasswordGateShell({
    children: (
      <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-2">
          <Label htmlFor="admin-password">Password</Label>
          <Input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={handlePasswordChange}
          />
        </div>
        {errorMessage && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {errorMessage}
          </p>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Checking" : "Unlock admin"}
        </Button>
      </form>
    ),
    description: "Enter the admin password to continue.",
    title: "Admin access",
  })
}

function renderAdminPasswordGateShell({
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
