'use client'

import { usePathname } from 'next/navigation'
import { TopBar } from './top-bar'
import { Sidebar } from './sidebar'
import { Footer } from './footer'

interface AppLayoutProps {
  children: React.ReactNode
}

// Function to determine if sidebar should be shown based on current path
function shouldShowSidebar(pathname: string): boolean {
  // Hide sidebar on top-level pages, dashboard, and staking pages
  const topLevelPages = [
    '/',           // Home page
    '/dashboard',  // Dashboard page
    '/control',    // Control module overview
    '/flow',       // Flow module overview
    '/signal',     // Signal module overview
    '/sense'       // Sense module overview
  ]

  // Hide sidebar for staking pages (all staking routes)
  if (pathname.startsWith('/staking')) return false

  // Show sidebar for:
  // - Sub-pages of modules (organizational/campaign/governance level)
  // - Settings and other personal pages
  if (pathname.startsWith('/settings')) return true

  // Show sidebar for sub-pages of modules
  if (pathname.startsWith('/control/') && pathname !== '/control') return true
  if (pathname.startsWith('/flow/') && pathname !== '/flow') return true
  if (pathname.startsWith('/signal/') && pathname !== '/signal') return true
  if (pathname.startsWith('/sense/') && pathname !== '/sense') return true

  // Hide sidebar for top-level pages
  return !topLevelPages.includes(pathname)
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname()
  const showSidebar = shouldShowSidebar(pathname)

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Bar */}
      <TopBar />

      {/* Main Content Area */}
      <div className="flex flex-1">
        {/* Sidebar - conditionally rendered */}
        {showSidebar && <Sidebar />}

        {/* Main Content */}
        <main className={`flex-1 p-6 ${showSidebar ? '' : 'max-w-full'}`}>
          {children}
        </main>
      </div>

      {/* Footer - Full Width */}
      <Footer />
    </div>
  )
}
