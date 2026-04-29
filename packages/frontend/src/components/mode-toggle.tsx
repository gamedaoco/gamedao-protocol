'use client'

import * as React from 'react'
import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'

export function ModeToggle() {
  const { theme, setTheme } = useTheme()
  // next-themes resolves the active theme only on the client (it reads
  // localStorage / `prefers-color-scheme`). Rendering theme-dependent
  // attributes (title, icon) before that resolves makes the server tree
  // disagree with the client tree and triggers a hydration mismatch on
  // every page load. Render a stable placeholder until mounted.
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const cycleTheme = () => {
    switch (theme) {
      case 'system':
        setTheme('light')
        break
      case 'light':
        setTheme('dark')
        break
      case 'dark':
        setTheme('system')
        break
      default:
        setTheme('system')
        break
    }
  }

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="h-[1.2rem] w-[1.2rem]" />
      case 'dark':
        return <Moon className="h-[1.2rem] w-[1.2rem]" />
      case 'system':
      default:
        return <Monitor className="h-[1.2rem] w-[1.2rem]" />
    }
  }

  const getThemeLabel = () => {
    switch (theme) {
      case 'light': return 'Light'
      case 'dark': return 'Dark'
      case 'system': return 'System'
      default: return 'System'
    }
  }

  if (!mounted) {
    return (
      <Button variant="outline" size="icon" aria-label="Toggle theme" suppressHydrationWarning>
        <Monitor className="h-[1.2rem] w-[1.2rem]" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    )
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={cycleTheme}
      title={`Current theme: ${getThemeLabel()} (Click to cycle)`}
    >
      {getThemeIcon()}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
