import { PasswordInput } from "@/components/password-input"
import { authClient } from "@/lib/auth-client"
import { getErrorMessage } from "@/lib/shop"
import { Link } from "@tanstack/react-router"
import { Button } from "@workspace/ui/components/button"
import { Label } from "@workspace/ui/components/label"
import { buttonVariants } from "@workspace/ui/lib/button-variants"
import { cn } from "@workspace/ui/lib/utils"
import { KeyRoundIcon } from "lucide-react"
import {
  type ChangeEventHandler,
  type FormEvent,
  useCallback,
  useReducer,
} from "react"

type ResetPasswordFormState = {
  confirmPassword: string
  errorMessage: string | null
  isComplete: boolean
  isSubmitting: boolean
  password: string
}

type ResetPasswordFormAction =
  | { type: "submitStart" }
  | { type: "submitSuccess" }
  | { type: "submitError"; message: string }
  | { type: "setPassword"; value: string }
  | { type: "setConfirmPassword"; value: string }

const INITIAL_RESET_PASSWORD_FORM_STATE: ResetPasswordFormState = {
  confirmPassword: "",
  errorMessage: null,
  isComplete: false,
  isSubmitting: false,
  password: "",
}

function resetPasswordFormReducer(
  state: ResetPasswordFormState,
  action: ResetPasswordFormAction
): ResetPasswordFormState {
  if (action.type === "submitStart") {
    return {
      ...state,
      errorMessage: null,
      isSubmitting: true,
    }
  }

  if (action.type === "submitSuccess") {
    return {
      ...state,
      confirmPassword: "",
      isComplete: true,
      isSubmitting: false,
      password: "",
    }
  }

  if (action.type === "submitError") {
    return {
      ...state,
      errorMessage: action.message,
      isSubmitting: false,
    }
  }

  if (action.type === "setPassword") {
    return { ...state, password: action.value }
  }

  return { ...state, confirmPassword: action.value }
}

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
  const [state, dispatch] = useReducer(
    resetPasswordFormReducer,
    INITIAL_RESET_PASSWORD_FORM_STATE
  )
  const { confirmPassword, errorMessage, isComplete, isSubmitting, password } =
    state

  const submitResetPassword = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      dispatch({ type: "submitStart" })

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

        dispatch({ type: "submitSuccess" })
      } catch (error) {
        dispatch({
          type: "submitError",
          message: betterAuthErrorMessage(error),
        })
      }
    },
    [confirmPassword, password, token]
  )
  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      void submitResetPassword(event)
    },
    [submitResetPassword]
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
    <form onSubmit={handleSubmit}>
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
            onChange={handlePasswordChange}
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
            onChange={handleConfirmPasswordChange}
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

export { InvalidResetLink, ResetPasswordForm }
