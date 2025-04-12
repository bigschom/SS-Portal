// src/components/ui/alert.jsx
import * as React from "react"
import { cva } from "class-variance-authority"
import { AlertCircle, CheckCircle, Info, X } from "lucide-react"

import { cn } from "../../lib/utils"

const alertVariants = cva(
  "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default: "bg-white text-gray-900 border-gray-200 dark:bg-gray-950 dark:text-white dark:border-gray-800",
        destructive:
          "border-red-500/50 text-red-800 dark:text-red-200 bg-red-50 dark:bg-red-900/50 dark:border-red-800 [&>svg]:text-red-500 dark:[&>svg]:text-red-300",
        success:
          "border-green-500/50 text-green-800 dark:text-green-200 bg-green-50 dark:bg-green-900/50 dark:border-green-800 [&>svg]:text-green-500 dark:[&>svg]:text-green-300"
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Alert = React.forwardRef(({ className, variant, icon, closeButton, onClose, ...props }, ref) => {
  // Determine the icon to display
  const IconComponent = icon || {
    default: Info,
    destructive: AlertCircle,
    success: CheckCircle
  }[variant || 'default'];

  return (
    <div
      ref={ref}
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      <IconComponent className="h-4 w-4" />
      <div className="pr-6">{props.children}</div>
      {closeButton && onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
      )}
    </div>
  )
});
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }