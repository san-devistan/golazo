import { cn } from "@workspace/ui/lib/utils"
import { OTPInput } from "input-otp"
import * as React from "react"

function InputOTP({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<typeof OTPInput> & {
  containerClassName?: string
}) {
  return (
    <OTPInput
      data-slot="input-otp"
      containerClassName={cn(
        "cn-input-otp flex items-center has-disabled:opacity-50",
        containerClassName
      )}
      spellCheck={false}
      className={cn("disabled:cursor-not-allowed", className)}
      {...props}
    />
  )
}

export { InputOTP }
export { InputOTPGroup } from "@workspace/ui/components/input-otp-group"
export { InputOTPSeparator } from "@workspace/ui/components/input-otp-separator"
export { InputOTPSlot } from "@workspace/ui/components/input-otp-slot"
