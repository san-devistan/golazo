/* eslint-disable no-underscore-dangle, react-perf/jsx-no-new-function-as-prop */

import {
  CustomerOrderSummary,
  type CustomerOrderRecord,
} from "@/components/customer-order-summary"
import { PasswordInput } from "@/components/password-input"
import { ShopHeader, type ShopHeaderCategory } from "@/components/shop-header"
import { authClient } from "@/lib/auth-client"
import { getErrorMessage, hasConvexUrl } from "@/lib/shop"
import { Link, createFileRoute } from "@tanstack/react-router"
import { api } from "@workspace/backend/api"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import { Label } from "@workspace/ui/components/label"
import { cn } from "@workspace/ui/lib/utils"
import { useQuery } from "convex/react"
import {
  ArrowLeftIcon,
  KeyRoundIcon,
  type LucideIcon,
  LogOutIcon,
  PackageIcon,
  ShieldCheckIcon,
  UserIcon,
} from "lucide-react"
import { type FormEvent, useState } from "react"

export const Route = createFileRoute("/account")({
  component: AccountPage,
})

const EMPTY_CATEGORIES: Array<ShopHeaderCategory> = []
const EMPTY_ORDERS: Array<CustomerOrderRecord> = []

function AccountPage() {
  if (!hasConvexUrl()) {
    return <MissingBackend />
  }

  return <AccountDashboard />
}

function AccountDashboard() {
  const session = authClient.useSession()
  const catalog = useQuery(api.shop.listCatalog)
  const orders = useQuery(api.orders.listViewerOrders) as
    | Array<CustomerOrderRecord>
    | null
    | undefined
  const categories = catalog?.categories ?? EMPTY_CATEGORIES
  const user = session.data?.user

  return (
    <main className="min-h-svh bg-white text-[#111]">
      <ShopHeader categories={categories} />
      <section className="mx-auto max-w-6xl px-4 pt-3 pb-12 sm:px-6 lg:px-10">
        <Link
          to="/"
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "mb-4 rounded-none"
          )}
        >
          <ArrowLeftIcon />
          Continue shopping
        </Link>

        {session.isPending ? (
          <AccountLoading />
        ) : user ? (
          <SignedInAccount
            email={user.email}
            orders={orders}
            userId={user.id}
          />
        ) : (
          <SignInRequired />
        )}
      </section>
    </main>
  )
}

function SignedInAccount({
  email,
  orders,
  userId,
}: {
  email: string
  orders: Array<CustomerOrderRecord> | null | undefined
  userId: string
}) {
  const [isSigningOut, setIsSigningOut] = useState(false)

  async function handleSignOut() {
    setIsSigningOut(true)

    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            window.location.assign("/")
          },
        },
      })
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <div className="grid gap-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-oswald text-5xl leading-none font-bold tracking-wide uppercase">
            Account
          </h1>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-fit rounded-none"
          disabled={isSigningOut}
          onClick={() => {
            void handleSignOut()
          }}
        >
          <LogOutIcon />
          {isSigningOut ? "Signing out" : "Sign out"}
        </Button>
      </header>

      <ProfileSection email={email} userId={userId} />

      <OrdersSection orders={orders} />
    </div>
  )
}

function ProfileSection({ email, userId }: { email: string; userId: string }) {
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  function resetForm() {
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
  }

  function handleChangeClick() {
    setErrorMessage(null)
    setSuccessMessage(null)
    setIsChangingPassword(true)
  }

  function handleCancel() {
    resetForm()
    setErrorMessage(null)
    setIsChangingPassword(false)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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
  }

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
          onConfirmPasswordChange={setConfirmPassword}
          onCurrentPasswordChange={setCurrentPassword}
          onNewPasswordChange={setNewPassword}
          onSubmit={(event) => {
            void handleSubmit(event)
          }}
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
  onConfirmPasswordChange: (value: string) => void
  onCurrentPasswordChange: (value: string) => void
  onNewPasswordChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <form
      className="grid max-w-xl gap-4 border border-[#d9d9d9] p-4"
      onSubmit={(event) => {
        onSubmit(event)
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor="current-password">Current password</Label>
        <PasswordInput
          id="current-password"
          autoComplete="current-password"
          required
          value={currentPassword}
          onChange={(event) => onCurrentPasswordChange(event.target.value)}
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
          onChange={(event) => onNewPasswordChange(event.target.value)}
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
          onChange={(event) => onConfirmPasswordChange(event.target.value)}
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

function OrdersSection({
  orders,
}: {
  orders: Array<CustomerOrderRecord> | null | undefined
}) {
  if (orders === undefined) {
    return <OrdersLoading />
  }

  if (orders === null) {
    return (
      <section className="border border-[#d9d9d9] p-8 text-center">
        <PackageIcon className="mx-auto mb-3 size-8 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Orders unavailable</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Refresh the page to load your orders.
        </p>
      </section>
    )
  }

  const orderRecords = orders.length > 0 ? orders : EMPTY_ORDERS

  return (
    <section className="grid gap-5">
      <div>
        <h2 className="text-2xl font-semibold">Orders</h2>
      </div>

      {orderRecords.length === 0 ? (
        <EmptyOrders />
      ) : (
        <div className="grid gap-4">
          {orderRecords.map((record) => (
            <CustomerOrderSummary key={record.order._id} record={record} />
          ))}
        </div>
      )}
    </section>
  )
}

function EmptyOrders() {
  return (
    <div className="grid place-items-center border border-[#d9d9d9] bg-white p-12 text-center">
      <PackageIcon className="mb-3 size-8 text-muted-foreground" />
      <h2 className="text-lg font-medium">No orders yet</h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        Your completed checkouts will appear here.
      </p>
    </div>
  )
}

function AccountLoading() {
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

function OrdersLoading() {
  return (
    <section className="grid gap-4">
      <div className="h-16 animate-pulse bg-[#f1f1f1]" />
      <div className="h-56 animate-pulse bg-[#f1f1f1]" />
      <div className="h-56 animate-pulse bg-[#f1f1f1]" />
    </section>
  )
}

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

function shortId(value: string) {
  return value.slice(-8).toUpperCase()
}
