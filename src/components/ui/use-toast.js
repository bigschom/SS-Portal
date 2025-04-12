// src/components/ui/use-toast.js
import { useEffect, useState } from "react"

// Unique ID for toast
const generateId = () => Math.random().toString(36).substring(2, 9)

export function useToast() {
  const [toasts, setToasts] = useState([])

  const toast = ({ title, description, action, variant, duration = 5000 }) => {
    const id = generateId()
    const newToast = {
      id,
      title,
      description,
      action,
      variant,
      duration,
    }
    setToasts((prev) => [...prev, newToast])
    return id
  }

  const dismiss = (toastId) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== toastId))
  }

  const update = (toastId, data) => {
    setToasts((prev) =>
      prev.map((toast) =>
        toast.id === toastId ? { ...toast, ...data } : toast
      )
    )
  }

  useEffect(() => {
    const timers = toasts.map((toast) => {
      if (toast.duration !== Infinity) {
        const timer = setTimeout(() => {
          dismiss(toast.id)
        }, toast.duration)
        return timer
      }
      return null
    })

    return () => {
      timers.forEach((timer) => {
        if (timer) clearTimeout(timer)
      })
    }
  }, [toasts])

  return {
    toast,
    dismiss,
    update,
    toasts,
  }
}

// Create ToastContext.jsx in your context folder if needed for global toast
// Then in your layout component you can use ToastProvider from ./toast.jsx