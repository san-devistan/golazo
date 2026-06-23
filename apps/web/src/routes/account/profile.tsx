import { PasswordInput } from "@/components/password-input"
import { authClient } from "@/lib/auth-client"
import { getErrorMessage } from "@/lib/shop"
import { Button } from "@workspace/ui/components/button"
import { Label } from "@workspace/ui/components/label"
import {
  KeyRoundIcon,
  PackageIcon,
  ShieldCheckIcon,
  type LucideIcon,
} from "lucide-react"
import {
  type ChangeEventHandler,
  type FormEvent,
  type FormEventHandler,
  useCallback,
  useReducer,
} from "react"

type ProfileFormState = {
  confirmPassword: string
  currentPassword: string
  errorMessage: string | null
  isChangingPassword: boolean
  isSubmitting: boolean
  newPassword: string
  successMessage: string | null
}

type ProfileFormAction =
  | { type: "startChangingPassword" }
  | { type: "cancelChangingPassword" }
  | { type: "submitStart" }
  | { type: "submitSuccess" }
  | { type: "submitError"; message: string }
  | { type: "setCurrentPassword"; value: string }
  | { type: "setNewPassword"; value: string }
  | { type: "setConfirmPassword"; value: string }

const INITIAL_PROFILE_FORM_STATE: ProfileFormState = {
  confirmPassword: "",
  currentPassword: "",
  errorMessage: null,
  isChangingPassword: false,
  isSubmitting: false,
  newPassword: "",
  successMessage: null,
}

function profileFormReducer(
  state: ProfileFormState,
  action: ProfileFormAction
): ProfileFormState {
  if (action.type === "startChangingPassword") {
    return {
      ...state,
      errorMessage: null,
      isChangingPassword: true,
      successMessage: null,
    }
  }

  if (action.type === "cancelChangingPassword") {
    return {
      ...state,
      confirmPassword: "",
      currentPassword: "",
      errorMessage: null,
      isChangingPassword: false,
      newPassword: "",
    }
  }

  if (action.type === "submitStart") {
    return {
      ...state,
      errorMessage: null,
      isSubmitting: true,
      successMessage: null,
    }
  }

  if (action.type === "submitSuccess") {
    return {
      ...state,
      confirmPassword: "",
      currentPassword: "",
      isChangingPassword: false,
      isSubmitting: false,
      newPassword: "",
      successMessage: "Password updated.",
    }
  }

  if (action.type === "submitError") {
    return {
      ...state,
      errorMessage: action.message,
      isSubmitting: false,
    }
  }

  if (action.type === "setCurrentPassword") {
    return { ...state, currentPassword: action.value }
  }

  if (action.type === "setNewPassword") {
    return { ...state, newPassword: action.value }
  }

  return { ...state, confirmPassword: action.value }
}

export function ProfileSection({
  email,
  userId,
}: {
  email: string
  userId: string
}) {
  const [state, dispatch] = useReducer(
    profileFormReducer,
    INITIAL_PROFILE_FORM_STATE
  )
  const {
    confirmPassword,
    currentPassword,
    errorMessage,
    isChangingPassword,
    isSubmitting,
    newPassword,
    successMessage,
  } = state

  const handleChangeClick = useCallback(() => {
    dispatch({ type: "startChangingPassword" })
  }, [])

  const handleCancel = useCallback(() => {
    dispatch({ type: "cancelChangingPassword" })
  }, [])

  const submitPasswordChange = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      dispatch({ type: "submitStart" })

      try {
        if (newPassword !== confirmPassword) {
          throw new Error("Passwords do not match.")
        }

        const result = await authClient.changePassword({
          currentPassword,
          newPassword,
          revokeOtherSessions: true,
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
    [confirmPassword, currentPassword, newPassword]
  )

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      void submitPasswordChange(event)
    },
    [submitPasswordChange]
  )

  const handleCurrentPasswordChange = useCallback<
    ChangeEventHandler<HTMLInputElement>
  >((event) => {
    dispatch({ type: "setCurrentPassword", value: event.target.value })
  }, [])
  const handleNewPasswordChange = useCallback<
    ChangeEventHandler<HTMLInputElement>
  >((event) => {
    dispatch({ type: "setNewPassword", value: event.target.value })
  }, [])
  const handleConfirmPasswordChange = useCallback<
    ChangeEventHandler<HTMLInputElement>
  >((event) => {
    dispatch({ type: "setConfirmPassword", value: event.target.value })
  }, [])

  return (
    <section className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">Profile</h2>
        {!isChangingPassword ? (
          <Button
            type="button"
            variant="outline"
            className="w-fit rounded-none"
            onClick={handleChangeClick}
          >
            <KeyRoundIcon />
            Change password
          </Button>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-x-7 gap-y-3">
        <AccountField Icon={ShieldCheckIcon} label="Email" value={email} />
        <AccountField
          Icon={PackageIcon}
          label="Customer reference"
          value={shortId(userId)}
        />
      </div>

      {successMessage && !isChangingPassword ? (
        <p className="text-sm font-medium text-[#166534]">{successMessage}</p>
      ) : null}

      {isChangingPassword ? (
        <PasswordChangeForm
          confirmPassword={confirmPassword}
          currentPassword={currentPassword}
          errorMessage={errorMessage}
          isSubmitting={isSubmitting}
          newPassword={newPassword}
          onCancel={handleCancel}
          onConfirmPasswordChange={handleConfirmPasswordChange}
          onCurrentPasswordChange={handleCurrentPasswordChange}
          onNewPasswordChange={handleNewPasswordChange}
          onSubmit={handleSubmit}
        />
      ) : null}
    </section>
  )
}

function PasswordChangeForm({
  confirmPassword,
  currentPassword,
  errorMessage,
  isSubmitting,
  newPassword,
  onCancel,
  onConfirmPasswordChange,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onSubmit,
}: {
  confirmPassword: string
  currentPassword: string
  errorMessage: string | null
  isSubmitting: boolean
  newPassword: string
  onCancel: () => void
  onConfirmPasswordChange: ChangeEventHandler<HTMLInputElement>
  onCurrentPasswordChange: ChangeEventHandler<HTMLInputElement>
  onNewPasswordChange: ChangeEventHandler<HTMLInputElement>
  onSubmit: FormEventHandler<HTMLFormElement>
}) {
  return (
    <form
      className="grid max-w-xl gap-4 border border-[#d9d9d9] p-4"
      onSubmit={onSubmit}
    >
      <div className="grid gap-2">
        <Label htmlFor="current-password">Current password</Label>
        <PasswordInput
          id="current-password"
          autoComplete="current-password"
          required
          value={currentPassword}
          onChange={onCurrentPasswordChange}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="new-password">New password</Label>
        <PasswordInput
          id="new-password"
          autoComplete="new-password"
          required
          minLength={8}
          value={newPassword}
          onChange={onNewPasswordChange}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="confirm-password">Confirm password</Label>
        <PasswordInput
          id="confirm-password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={onConfirmPasswordChange}
        />
      </div>

      {errorMessage ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {errorMessage}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="ghost"
          disabled={isSubmitting}
          className="rounded-none"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} className="rounded-none">
          {isSubmitting ? "Updating" : "Update password"}
        </Button>
      </div>
    </form>
  )
}

function AccountField({
  Icon,
  label,
  value,
}: {
  Icon: LucideIcon
  label: string
  value: string
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-sm">
      <div className="flex shrink-0 items-center gap-1.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">
        <Icon className="size-4" />
        {label}
      </div>
      <div className="min-w-0 truncate font-medium">{value}</div>
    </div>
  )
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

function shortId(value: string) {
  return value.slice(-8).toUpperCase()
}
