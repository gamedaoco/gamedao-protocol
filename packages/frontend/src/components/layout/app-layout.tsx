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
  // Sidebar is disabled by default - only enable for specific routes where it's needed

  // Enable sidebar for:
  // - Settings pages (user preferences, account management)
  // - Admin/management interfaces (when implemented)

  const sidebarEnabledRoutes = [
    '/settings',           // Settings pages
    '/admin',              // Admin interface (future)
    '/management'          // Management interface (future)
  ]

  // Check if current path starts with any enabled route
  return sidebarEnabledRoutes.some(route => pathname.startsWith(route))
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
