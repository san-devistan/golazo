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
  useState,
} from "react"

export function ProfileSection({
  email,
  userId,
}: {
  email: string
  userId: string
}) {
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const resetForm = useCallback(() => {
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
  }, [])

  const handleChangeClick = useCallback(() => {
    setErrorMessage(null)
    setSuccessMessage(null)
    setIsChangingPassword(true)
  }, [])

  const handleCancel = useCallback(() => {
    resetForm()
    setErrorMessage(null)
    setIsChangingPassword(false)
  }, [resetForm])

  const submitPasswordChange = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      setIsSubmitting(true)
      setErrorMessage(null)
      setSuccessMessage(null)

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

        resetForm()
        setIsChangingPassword(false)
        setSuccessMessage("Password updated.")
      } catch (error) {
        setErrorMessage(betterAuthErrorMessage(error))
      } finally {
        setIsSubmitting(false)
      }
    },
    [confirmPassword, currentPassword, newPassword, resetForm]
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
    setCurrentPassword(event.target.value)
  }, [])
  const handleNewPasswordChange = useCallback<
    ChangeEventHandler<HTMLInputElement>
  >((event) => {
    setNewPassword(event.target.value)
  }, [])
  const handleConfirmPasswordChange = useCallback<
    ChangeEventHandler<HTMLInputElement>
  >((event) => {
    setConfirmPassword(event.target.value)
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
