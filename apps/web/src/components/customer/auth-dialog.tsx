import {
  authFormReducer,
  INITIAL_AUTH_FORM_STATE,
  type AuthMode,
} from "@/components/customer/auth-form-state"
import { betterAuthErrorMessage } from "@/components/customer/utils"
import { PasswordInput } from "@/components/password-input"
import { authClient } from "@/lib/auth-client"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  type ChangeEventHandler,
  type FormEvent,
  type FormEventHandler,
  useCallback,
  useReducer,
} from "react"

export function AuthDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const session = authClient.useSession()
  const [state, dispatch] = useReducer(authFormReducer, INITIAL_AUTH_FORM_STATE)
  const {
    confirmPassword,
    email,
    errorMessage,
    isSubmitting,
    mode,
    password,
    successMessage,
  } = state
  const user = session.data?.user
  const passwordMismatch =
    mode === "sign-up" &&
    confirmPassword.length > 0 &&
    password !== confirmPassword

  const switchMode = useCallback((nextMode: AuthMode) => {
    dispatch({ type: "switchMode", mode: nextMode })
  }, [])

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        dispatch({ type: "close" })
      }

      onOpenChange(nextOpen)
    },
    [onOpenChange]
  )

  const submitAuthForm = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      dispatch({ type: "submitStart" })

      try {
        if (mode === "reset-request") {
          const result = await authClient.requestPasswordReset({
            email,
            redirectTo: `${window.location.origin}/reset-password`,
          })

          if (result.error) {
            throw result.error
          }

          dispatch({
            type: "submitSuccess",
            message: "If an account exists, a reset link has been sent.",
          })
          return
        }

        if (mode === "sign-up" && password !== confirmPassword) {
          throw new Error("Passwords do not match.")
        }

        const result =
          mode === "sign-in"
            ? await authClient.signIn.email({ email, password })
            : await authClient.signUp.email({
                email,
                password,
                name: email,
              })

        if (result.error) {
          throw result.error
        }

        onOpenChange(false)
        dispatch({ type: "submitAuthSuccess" })
      } catch (error) {
        dispatch({
          type: "submitError",
          message: betterAuthErrorMessage(error),
        })
      } finally {
        dispatch({ type: "submitEnd" })
      }
    },
    [confirmPassword, email, mode, onOpenChange, password]
  )

  const handleFormSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      void submitAuthForm(event)
    },
    [submitAuthForm]
  )

  const handleSignOut = useCallback(async () => {
    dispatch({ type: "submitStart" })

    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            window.location.reload()
          },
        },
      })
    } catch (error) {
      dispatch({
        type: "submitError",
        message: betterAuthErrorMessage(error),
      })
    }
  }, [])

  const handleSignOutClick = useCallback(() => {
    void handleSignOut()
  }, [handleSignOut])

  const handleEmailChange = useCallback<ChangeEventHandler<HTMLInputElement>>(
    (event) => {
      dispatch({ type: "setEmail", value: event.target.value })
    },
    []
  )

  const handlePasswordChange = useCallback<
    ChangeEventHandler<HTMLInputElement>
  >((event) => {
    dispatch({ type: "setPassword", value: event.target.value })
  }, [])

  const handleConfirmPasswordChange = useCallback<
    ChangeEventHandler<HTMLInputElement>
  >((event) => {
    dispatch({ type: "setConfirmPassword", value: event.target.value })
  }, [])

  const handleToggleMode = useCallback(() => {
    switchMode(mode === "sign-in" ? "sign-up" : "sign-in")
  }, [mode, switchMode])

  const handleResetMode = useCallback(() => {
    switchMode("reset-request")
  }, [switchMode])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="rounded-none">
        {user ? (
          <SignedInDialogContent
            email={user.email}
            errorMessage={errorMessage}
            isSubmitting={isSubmitting}
            onSignOut={handleSignOutClick}
          />
        ) : (
          <AuthForm
            confirmPassword={confirmPassword}
            email={email}
            errorMessage={errorMessage}
            isSubmitting={isSubmitting}
            mode={mode}
            password={password}
            passwordMismatch={passwordMismatch}
            successMessage={successMessage}
            onConfirmPasswordChange={handleConfirmPasswordChange}
            onEmailChange={handleEmailChange}
            onPasswordChange={handlePasswordChange}
            onResetMode={handleResetMode}
            onSubmit={handleFormSubmit}
            onToggleMode={handleToggleMode}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function SignedInDialogContent({
  email,
  errorMessage,
  isSubmitting,
  onSignOut,
}: {
  email: string
  errorMessage: string | null
  isSubmitting: boolean
  onSignOut: () => void
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Account</DialogTitle>
        <DialogDescription>{email}</DialogDescription>
      </DialogHeader>
      {errorMessage ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {errorMessage}
        </p>
      ) : null}
      <DialogFooter>
        <Button
          type="button"
          disabled={isSubmitting}
          className="rounded-none"
          onClick={onSignOut}
        >
          {isSubmitting ? "Signing out" : "Sign out"}
        </Button>
      </DialogFooter>
    </>
  )
}

function AuthForm({
  confirmPassword,
  email,
  errorMessage,
  isSubmitting,
  mode,
  password,
  passwordMismatch,
  successMessage,
  onConfirmPasswordChange,
  onEmailChange,
  onPasswordChange,
  onResetMode,
  onSubmit,
  onToggleMode,
}: {
  confirmPassword: string
  email: string
  errorMessage: string | null
  isSubmitting: boolean
  mode: AuthMode
  password: string
  passwordMismatch: boolean
  successMessage: string | null
  onConfirmPasswordChange: ChangeEventHandler<HTMLInputElement>
  onEmailChange: ChangeEventHandler<HTMLInputElement>
  onPasswordChange: ChangeEventHandler<HTMLInputElement>
  onResetMode: () => void
  onSubmit: FormEventHandler<HTMLFormElement>
  onToggleMode: () => void
}) {
  return (
    <form onSubmit={onSubmit}>
      <DialogHeader>
        <DialogTitle>{authTitle(mode)}</DialogTitle>
        {mode === "reset-request" ? (
          <DialogDescription>
            Enter your email to receive a reset link.
          </DialogDescription>
        ) : null}
      </DialogHeader>

      <div className="mt-5 grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="auth-email">Email</Label>
          <Input
            id="auth-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={onEmailChange}
          />
        </div>
        {mode !== "reset-request" ? (
          <div className="grid gap-2">
            <Label htmlFor="auth-password">Password</Label>
            <PasswordInput
              id="auth-password"
              autoComplete={
                mode === "sign-in" ? "current-password" : "new-password"
              }
              required
              minLength={8}
              value={password}
              onChange={onPasswordChange}
            />
            {mode === "sign-in" ? (
              <Button
                type="button"
                variant="link"
                disabled={isSubmitting}
                className="h-auto justify-self-start rounded-none px-0 py-0 text-sm underline underline-offset-4"
                onClick={onResetMode}
              >
                Reset password
              </Button>
            ) : null}
          </div>
        ) : null}
        {mode === "sign-up" ? (
          <div className="grid gap-2">
            <Label htmlFor="auth-confirm-password">Confirm password</Label>
            <PasswordInput
              id="auth-confirm-password"
              autoComplete="new-password"
              required
              minLength={8}
              aria-invalid={passwordMismatch || undefined}
              value={confirmPassword}
              onChange={onConfirmPasswordChange}
            />
            {passwordMismatch ? (
              <p className="text-sm font-medium text-destructive">
                Passwords do not match.
              </p>
            ) : null}
          </div>
        ) : null}
        {errorMessage ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {errorMessage}
          </p>
        ) : null}
        {successMessage ? (
          <p className="text-sm font-medium text-[#166534]">{successMessage}</p>
        ) : null}
      </div>

      <DialogFooter className="mt-5">
        <Button
          type="button"
          variant="ghost"
          disabled={isSubmitting}
          className="rounded-none"
          onClick={onToggleMode}
        >
          {mode === "sign-in" ? "Sign up" : "Login"}
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || passwordMismatch}
          className="rounded-none"
        >
          {submitLabel(mode, isSubmitting)}
        </Button>
      </DialogFooter>
    </form>
  )
}

function authTitle(mode: AuthMode) {
  if (mode === "reset-request") {
    return "Reset password"
  }

  return mode === "sign-in" ? "Login" : "Sign up"
}

function submitLabel(mode: AuthMode, isSubmitting: boolean) {
  if (isSubmitting) {
    return "Working"
  }

  if (mode === "reset-request") {
    return "Send link"
  }

  return mode === "sign-in" ? "Login" : "Sign up"
}
