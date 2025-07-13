'use client'

import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { ChevronRight, ArrowLeft } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  href?: string
  current?: boolean
}

interface TabItem {
  id: string
  label: string
  href: string
  current?: boolean
  badge?: string | number
}

interface DetailPageLayoutProps {
  // Header content
  title: string
  subtitle?: string
  description?: string

  // Navigation
  breadcrumbs: BreadcrumbItem[]
  backHref?: string
  backLabel?: string

  // Header actions
  actions?: ReactNode
  primaryAction?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'destructive' | 'outline' | 'secondary'
    disabled?: boolean
  }

  // Status and metadata
  status?: {
    label: string
    variant: 'default' | 'secondary' | 'destructive' | 'outline'
    color?: string
  }
  metadata?: Array<{
    label: string
    value: string | ReactNode
    icon?: ReactNode
  }>

  // Tabs navigation
  tabs?: TabItem[]

  // Layout options
  variant?: 'default' | 'compact' | 'wide'
  loading?: boolean

  // Content
  children: ReactNode

  // Additional sections
  sidebar?: ReactNode
  footer?: ReactNode

  className?: string
}

// Loading skeleton for the layout
function DetailPageLayoutSkeleton({ variant }: { variant?: DetailPageLayoutProps['variant'] }) {
  return (
    <div className={cn(
      'space-y-6',
      variant === 'wide' && 'max-w-7xl mx-auto',
      variant === 'compact' && 'max-w-4xl mx-auto'
    )}>
      {/* Breadcrumbs skeleton */}
      <div className="flex items-center space-x-2">
        <div className="h-4 w-16 bg-muted rounded animate-pulse" />
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <div className="h-4 w-24 bg-muted rounded animate-pulse" />
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <div className="h-4 w-32 bg-muted rounded animate-pulse" />
      </div>

      {/* Header skeleton */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-muted rounded animate-pulse" />
            <div className="h-4 w-48 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-10 w-32 bg-muted rounded animate-pulse" />
        </div>

        {/* Metadata skeleton */}
        <div className="flex items-center space-x-6">
          <div className="h-4 w-20 bg-muted rounded animate-pulse" />
          <div className="h-4 w-24 bg-muted rounded animate-pulse" />
          <div className="h-4 w-16 bg-muted rounded animate-pulse" />
        </div>
      </div>

      <Separator />

      {/* Content skeleton */}
      <div className="space-y-4">
        <div className="h-4 w-full bg-muted rounded animate-pulse" />
        <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
        <div className="h-4 w-1/2 bg-muted rounded animate-pulse" />
      </div>
    </div>
  )
}

// Breadcrumb component
function Breadcrumbs({ items, className }: { items: BreadcrumbItem[], className?: string }) {
  return (
    <nav className={cn('flex items-center space-x-2 text-sm', className)} aria-label="Breadcrumb">
      {items.map((item, index) => (
        <div key={index} className="flex items-center">
          {index > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground mx-2" />}
          {item.href && !item.current ? (
            <Link
              href={item.href}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className={cn(
              item.current ? 'text-foreground font-medium' : 'text-muted-foreground'
            )}>
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  )
}

// Tabs navigation component
function TabsNavigation({ tabs, className }: { tabs: TabItem[], className?: string }) {
  return (
    <div className={cn('border-b border-border', className)}>
      <nav className="flex space-x-8" aria-label="Tabs">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            className={cn(
              'flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors',
              tab.current
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
            )}
          >
            {tab.label}
            {tab.badge && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {tab.badge}
              </Badge>
            )}
          </Link>
        ))}
      </nav>
    </div>
  )
}

// Metadata display component
function MetadataList({ items, className }: { items: DetailPageLayoutProps['metadata'], className?: string }) {
  if (!items || items.length === 0) return null

  return (
    <div className={cn('flex flex-wrap items-center gap-6 text-sm text-muted-foreground', className)}>
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          {item.icon}
          <span className="font-medium">{item.label}:</span>
          <span>{item.value}</span>
        </div>
      ))}
    </div>
  )
}

// Main DetailPageLayout component
export function DetailPageLayout({
  title,
  subtitle,
  description,
  breadcrumbs,
  backHref,
  backLabel = 'Back',
  actions,
  primaryAction,
  status,
  metadata,
  tabs,
  variant = 'default',
  loading = false,
  children,
  sidebar,
  footer,
  className
}: DetailPageLayoutProps) {
  // Show loading skeleton
  if (loading) {
    return <DetailPageLayoutSkeleton variant={variant} />
  }

  return (
    <div className={cn(
      'space-y-6',
      variant === 'wide' && 'max-w-7xl mx-auto',
      variant === 'compact' && 'max-w-4xl mx-auto',
      className
    )}>
      {/* Back button and breadcrumbs */}
      <div className="space-y-4">
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {backLabel}
          </Link>
        )}

        <Breadcrumbs items={breadcrumbs} />
      </div>

      {/* Page header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight truncate">
                {title}
              </h1>
              {status && (
                <Badge
                  variant={status.variant}
                  className={status.color}
                >
                  {status.label}
                </Badge>
              )}
            </div>

            {subtitle && (
              <p className="text-lg text-muted-foreground mt-1">
                {subtitle}
              </p>
            )}

            {description && (
              <p className="text-muted-foreground mt-2 max-w-3xl">
                {description}
              </p>
            )}
          </div>

          {/* Header actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions}
            {primaryAction && (
              <Button
                variant={primaryAction.variant || 'default'}
                onClick={primaryAction.onClick}
                disabled={primaryAction.disabled}
              >
                {primaryAction.label}
              </Button>
            )}
          </div>
        </div>

        {/* Metadata */}
        <MetadataList items={metadata} />
      </div>

      {/* Tabs navigation */}
      {tabs && tabs.length > 0 && (
        <TabsNavigation tabs={tabs} />
      )}

      <Separator />

      {/* Main content area */}
      <div className={cn(
        'grid gap-6',
        sidebar && 'lg:grid-cols-4'
      )}>
        {/* Main content */}
        <div className={cn(
          sidebar && 'lg:col-span-3'
        )}>
          {children}
        </div>

        {/* Sidebar */}
        {sidebar && (
          <div className="lg:col-span-1">
            {sidebar}
          </div>
        )}
      </div>

      {/* Footer */}
      {footer && (
        <>
          <Separator />
          {footer}
        </>
      )}
    </div>
  )
}

// Export types for use in other components
export type {
  BreadcrumbItem,
  TabItem,
  DetailPageLayoutProps
}
