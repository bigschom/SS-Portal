// src/components/common/Toast.jsx
import * as React from "react"
import { CheckCircle, AlertCircle, X } from "lucide-react"

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "../ui/toast"
import { useToast } from "../ui/use-toast"

export function ToastContainer() {
  const { toasts, dismiss } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant }) {
        return (
          <Toast key={id} variant={variant} onOpenChange={() => dismiss(id)}>
            <div className="flex items-start gap-3">
              {variant === "destructive" ? (
                <AlertCircle className="h-5 w-5 text-white" />
              ) : (
                <CheckCircle className="h-5 w-5 text-[#0A2647] dark:text-white" />
              )}
              <div className="grid gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}

// To use this in your app:
// 1. Place <ToastContainer /> in your layout
// 2. Import { useToast } from "@/components/ui/use-toast"
// 3. Use toast({ title: "Success", description: "Operation completed" }) or 
//    toast({ title: "Error", description: "Something went wrong", variant: "destructive" })