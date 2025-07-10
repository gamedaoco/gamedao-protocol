'use client'

import { Toaster } from 'react-hot-toast'

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        // Default options
        duration: 4000,
        style: {
          background: 'hsl(var(--card))',
          color: 'hsl(var(--card-foreground))',
          border: '1px solid hsl(var(--border))',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500',
        },
        // Success toast
        success: {
          duration: 4000,
          iconTheme: {
            primary: 'hsl(var(--primary))',
            secondary: 'hsl(var(--primary-foreground))',
          },
        },
        // Error toast
        error: {
          duration: 6000,
          iconTheme: {
            primary: 'hsl(var(--destructive))',
            secondary: 'hsl(var(--destructive-foreground))',
          },
        },
        // Loading toast
        loading: {
          duration: Infinity,
          iconTheme: {
            primary: 'hsl(var(--muted-foreground))',
            secondary: 'hsl(var(--muted))',
          },
        },
      }}
    />
  )
}
