import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"
import { useEffect, useState } from "react"

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  className?: string
}

export function Loader({ size = 'md', text, className }: LoaderProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  }

  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      <Loader2 className={cn('animate-spin', sizeClasses[size])} />
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
    </div>
  )
}

export function LoaderPage({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <Loader size="lg" text={text} />
    </div>
  )
}

export function LoaderInline({ text }: { text?: string }) {
  return <Loader size="sm" text={text} className="py-2" />
}

// Rotating-message loader for boot/long-running waits. Drops the tech jargon
// in favour of something that feels like the project is being built around you.
const CREATIVE_MESSAGES = [
  'Reticulating splines…',
  'Compiling shaders…',
  'Spawning NPCs…',
  'Resolving merge conflicts…',
  'Rolling for initiative…',
  'Hot-reloading the demo…',
  'Loading the next level…',
  'npm installing the universe…',
  'Crafting the legendary item…',
  'Polishing the lens flares…',
  'Mixing the soundtrack…',
  'Calibrating the gravity gun…',
  'Refactoring the spaghetti…',
  'Sampling the breaks…',
  'Equipping the +1 cape…',
  'Sketching the level layout…',
  'Running tests in prod…',
  'Booting the Konami code…',
  'Stashing local changes…',
  'Caffeinating the build agent…',
  'Casting fireball at the bug…',
  'Patching the vorpal blade…',
  'Tuning the parser…',
  'Defragging the inventory…',
] as const

interface CreativeLoaderProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  /** ms between message changes (default 1800) */
  intervalMs?: number
}

export function CreativeLoader({ size = 'lg', className, intervalMs = 1800 }: CreativeLoaderProps) {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * CREATIVE_MESSAGES.length))

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % CREATIVE_MESSAGES.length)
    }, intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return <Loader size={size} text={CREATIVE_MESSAGES[index]} className={className} />
}
