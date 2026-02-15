"use client"

import * as React from "react"
import { cn } from "@/lib/utils/cn"

export interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, ...props }, ref) => (
    <label
      className={cn(
        "relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors",
        "bg-gray-200 data-[checked=true]:bg-primary",
        className
      )}
    >
      <input
        type="checkbox"
        className="peer sr-only"
        ref={ref}
        {...props}
      />
      <span
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform",
          "translate-x-0.5 peer-checked:translate-x-5"
        )}
      />
    </label>
  )
)
Switch.displayName = "Switch"

export { Switch }
