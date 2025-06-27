'use client'

import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Plus, Search, Users, Target, Vote, Coins, FileText } from 'lucide-react'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: ReactNode
  variant?: 'default' | 'minimal' | 'card'
  size?: 'sm' | 'md' | 'lg'

  // Actions
  primaryAction?: {
    label: string
    onClick: () => void
    icon?: ReactNode
  }
  secondaryAction?: {
    label: string
    onClick: () => void
    icon?: ReactNode
  }

  // Predefined empty states for common scenarios
  type?: 'organizations' | 'campaigns' | 'proposals' | 'profiles' | 'search' | 'generic'

  className?: string
  children?: ReactNode
}

// Predefined configurations for common empty states
const EMPTY_STATE_CONFIGS = {
  organizations: {
    icon: <Users className="h-12 w-12 text-muted-foreground" />,
    title: 'No organizations found',
    description: 'Get started by creating your first gaming DAO or discover existing communities.',
    primaryAction: {
      label: 'Create Organization',
      icon: <Plus className="h-4 w-4" />
    },
    secondaryAction: {
      label: 'Discover DAOs',
      icon: <Search className="h-4 w-4" />
    }
  },
  campaigns: {
    icon: <Target className="h-12 w-12 text-muted-foreground" />,
    title: 'No campaigns found',
    description: 'Launch your first crowdfunding campaign or explore existing projects.',
    primaryAction: {
      label: 'Create Campaign',
      icon: <Plus className="h-4 w-4" />
    },
    secondaryAction: {
      label: 'Browse Campaigns',
      icon: <Search className="h-4 w-4" />
    }
  },
  proposals: {
    icon: <Vote className="h-12 w-12 text-muted-foreground" />,
    title: 'No proposals found',
    description: 'Start participating in governance by creating or voting on proposals.',
    primaryAction: {
      label: 'Create Proposal',
      icon: <Plus className="h-4 w-4" />
    },
    secondaryAction: {
      label: 'View All Proposals',
      icon: <Search className="h-4 w-4" />
    }
  },
  profiles: {
    icon: <Users className="h-12 w-12 text-muted-foreground" />,
    title: 'No profiles found',
    description: 'Connect with other members of the GameDAO community.',
    primaryAction: {
      label: 'Complete Profile',
      icon: <Plus className="h-4 w-4" />
    },
    secondaryAction: {
      label: 'Discover Members',
      icon: <Search className="h-4 w-4" />
    }
  },
  search: {
    icon: <Search className="h-12 w-12 text-muted-foreground" />,
    title: 'No results found',
    description: 'Try adjusting your search terms or filters to find what you\'re looking for.',
    secondaryAction: {
      label: 'Clear Filters',
      icon: <Search className="h-4 w-4" />
    }
  },
  generic: {
    icon: <FileText className="h-12 w-12 text-muted-foreground" />,
    title: 'Nothing here yet',
    description: 'This section is empty. Check back later or take action to get started.',
    primaryAction: {
      label: 'Get Started',
      icon: <Plus className="h-4 w-4" />
    }
  }
}

// Size configurations
const SIZE_CONFIGS = {
  sm: {
    container: 'py-8',
    icon: 'h-8 w-8',
    title: 'text-lg',
    description: 'text-sm',
    spacing: 'space-y-3'
  },
  md: {
    container: 'py-12',
    icon: 'h-12 w-12',
    title: 'text-xl',
    description: 'text-base',
    spacing: 'space-y-4'
  },
  lg: {
    container: 'py-16',
    icon: 'h-16 w-16',
    title: 'text-2xl',
    description: 'text-lg',
    spacing: 'space-y-6'
  }
}

export function EmptyState({
  title,
  description,
  icon,
  variant = 'default',
  size = 'md',
  primaryAction,
  secondaryAction,
  type,
  className,
  children
}: EmptyStateProps) {
  // Get predefined config if type is specified
  const config = type ? EMPTY_STATE_CONFIGS[type] : null
  const sizeConfig = SIZE_CONFIGS[size]

  // Use config values as defaults, allow props to override
  const finalIcon = icon || config?.icon || <FileText className="h-12 w-12 text-muted-foreground" />
  const finalTitle = title || config?.title || 'Nothing here yet'
  const finalDescription = description || config?.description
  const finalPrimaryAction = primaryAction || (config && 'primaryAction' in config && config.primaryAction ? {
    ...config.primaryAction,
    onClick: () => console.log('Primary action clicked')
  } : undefined)
  const finalSecondaryAction = secondaryAction || (config && 'secondaryAction' in config && config.secondaryAction ? {
    ...config.secondaryAction,
    onClick: () => console.log('Secondary action clicked')
  } : undefined)

  const content = (
    <div className={cn(
      'text-center',
      sizeConfig.container,
      className
    )}>
      <div className={cn('flex flex-col items-center', sizeConfig.spacing)}>
        {/* Icon */}
        <div className="flex items-center justify-center">
          {finalIcon}
        </div>

        {/* Title and description */}
        <div className="space-y-2">
          <h3 className={cn('font-semibold text-foreground', sizeConfig.title)}>
            {finalTitle}
          </h3>
          {finalDescription && (
            <p className={cn('text-muted-foreground max-w-md mx-auto', sizeConfig.description)}>
              {finalDescription}
            </p>
          )}
        </div>

        {/* Actions */}
        {(finalPrimaryAction || finalSecondaryAction) && (
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {finalPrimaryAction && (
              <Button
                onClick={finalPrimaryAction.onClick}
                className="flex items-center gap-2"
              >
                {finalPrimaryAction.icon}
                {finalPrimaryAction.label}
              </Button>
            )}
            {finalSecondaryAction && (
              <Button
                onClick={finalSecondaryAction.onClick}
                variant="outline"
                className="flex items-center gap-2"
              >
                {finalSecondaryAction.icon}
                {finalSecondaryAction.label}
              </Button>
            )}
          </div>
        )}

        {/* Custom children */}
        {children}
      </div>
    </div>
  )

  // Render based on variant
  if (variant === 'card') {
    return (
      <Card className={className}>
        <CardContent className="p-0">
          {content}
        </CardContent>
      </Card>
    )
  }

  if (variant === 'minimal') {
    return (
      <div className={cn('text-center py-8', className)}>
        <p className="text-muted-foreground">{finalTitle}</p>
        {finalPrimaryAction && (
          <Button
            onClick={finalPrimaryAction.onClick}
            variant="ghost"
            size="sm"
            className="mt-2"
          >
            {finalPrimaryAction.icon}
            {finalPrimaryAction.label}
          </Button>
        )}
      </div>
    )
  }

  return content
}

// Specific empty state components for common use cases
export function EmptyOrganizations(props: Omit<EmptyStateProps, 'type'>) {
  return <EmptyState {...props} type="organizations" />
}

export function EmptyCampaigns(props: Omit<EmptyStateProps, 'type'>) {
  return <EmptyState {...props} type="campaigns" />
}

export function EmptyProposals(props: Omit<EmptyStateProps, 'type'>) {
  return <EmptyState {...props} type="proposals" />
}

export function EmptyProfiles(props: Omit<EmptyStateProps, 'type'>) {
  return <EmptyState {...props} type="profiles" />
}

export function EmptySearchResults(props: Omit<EmptyStateProps, 'type'>) {
  return <EmptyState {...props} type="search" />
}

// Export types
export type { EmptyStateProps }
