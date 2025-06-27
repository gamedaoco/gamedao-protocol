'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { ReactNode } from 'react'

// Base entity interface that all entities should extend
interface BaseEntity {
  id: string
  name?: string
  title?: string
  description?: string
  image?: string // IPFS hash or URL
  status?: string
  createdAt?: number
}

// Specific entity interfaces
interface OrganizationEntity extends BaseEntity {
  memberCount: number
  treasury?: string
  accessModel?: number
}

interface CampaignEntity extends BaseEntity {
  target: bigint | string
  raised: bigint | string
  contributors?: number
  endTime?: number
  organizationName?: string
}

interface ProposalEntity extends BaseEntity {
  votes?: {
    for: number
    against: number
    abstain: number
  }
  timeLeft?: string
  organizationName?: string
  proposer?: string
}

interface ProfileEntity extends BaseEntity {
  address: string
  reputation?: number
  achievements?: number
  role?: string
  avatar?: string // IPFS hash
}

interface StakingPoolEntity extends BaseEntity {
  totalStaked: string
  apy: number
  stakersCount: number
  purpose: string
}

type EntityType =
  | OrganizationEntity
  | CampaignEntity
  | ProposalEntity
  | ProfileEntity
  | StakingPoolEntity

interface EntityCardProps {
  entity: EntityType
  variant: 'organization' | 'campaign' | 'proposal' | 'profile' | 'pool'
  layout?: 'default' | 'compact' | 'detailed'
  href?: string
  actions?: ReactNode
  className?: string
  loading?: boolean
  onAction?: (action: string, entity: EntityType) => void
}

// Helper function to get IPFS URL
function getIPFSUrl(hash?: string): string | undefined {
  if (!hash) return undefined
  if (hash.startsWith('http')) return hash
  return `https://ipfs.io/ipfs/${hash}`
}

// Helper function to format large numbers
function formatNumber(num: number | bigint | string): string {
  const value = typeof num === 'bigint' ? Number(num) : typeof num === 'string' ? parseFloat(num) : num
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
  return value.toString()
}

// Helper function to get status color
function getStatusColor(status?: string): string {
  switch (status?.toLowerCase()) {
    case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    case 'inactive': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
    case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    case 'completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
  }
}

// Loading skeleton component
function EntityCardSkeleton({ variant, layout }: { variant: EntityCardProps['variant'], layout: EntityCardProps['layout'] }) {
  const isProfile = variant === 'profile'
  const isCompact = layout === 'compact'

  return (
    <Card className={cn(
      'animate-pulse',
      isProfile && 'aspect-[3/4]',
      isCompact && 'h-32'
    )}>
      <CardHeader className={cn('pb-2', isCompact && 'pb-1')}>
        <div className="flex items-start gap-3">
          {isProfile ? (
            <Skeleton className="w-16 h-16 rounded-full" />
          ) : (
            <Skeleton className="w-12 h-12 rounded-lg" />
          )}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      </CardHeader>
      <CardContent className={cn('space-y-2', isCompact && 'py-2')}>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
        {!isCompact && (
          <>
            <div className="flex gap-2 mt-3">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-20" />
            </div>
            <Skeleton className="h-8 w-full mt-4" />
          </>
        )}
      </CardContent>
    </Card>
  )
}

// Profile card component (visual-first design)
function ProfileCard({
  entity,
  layout = 'default',
  href,
  actions,
  className,
  onAction
}: Omit<EntityCardProps, 'variant'> & { entity: ProfileEntity }) {
  const avatarUrl = getIPFSUrl(entity.avatar || entity.image)
  const isCompact = layout === 'compact'

  const cardContent = (
    <Card className={cn(
      'group hover:shadow-lg transition-all duration-200 cursor-pointer',
      !isCompact && 'aspect-[3/4]',
      isCompact && 'h-20 flex-row',
      className
    )}>
      {/* Visual-first layout with gradient background */}
      <div className={cn(
        'relative overflow-hidden',
        !isCompact && 'h-32 bg-gradient-to-br from-purple-500 to-pink-500',
        isCompact && 'w-20 bg-gradient-to-br from-purple-500 to-pink-500'
      )}>
        {/* Avatar positioned over gradient */}
        <div className={cn(
          'absolute flex items-center justify-center',
          !isCompact && 'bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2',
          isCompact && 'inset-0'
        )}>
          <Avatar className={cn(!isCompact && 'w-16 h-16 border-4 border-white', isCompact && 'w-12 h-12')}>
            <AvatarImage src={avatarUrl} alt={entity.name || entity.address} />
            <AvatarFallback className="bg-white text-purple-600 font-semibold">
              {(entity.name || entity.address).slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      <CardContent className={cn(
        'flex-1',
        !isCompact && 'pt-10 text-center',
        isCompact && 'py-2 px-3 flex items-center justify-between'
      )}>
        <div className={cn(!isCompact && 'space-y-2', isCompact && 'flex-1')}>
          {/* Name and role */}
          <div>
            <h3 className={cn(
              'font-semibold truncate',
              !isCompact && 'text-lg',
              isCompact && 'text-sm'
            )}>
              {entity.name || `${entity.address.slice(0, 6)}...${entity.address.slice(-4)}`}
            </h3>
            {entity.role && (
              <p className={cn(
                'text-muted-foreground',
                !isCompact && 'text-sm',
                isCompact && 'text-xs'
              )}>
                {entity.role}
              </p>
            )}
          </div>

          {/* Reputation score */}
          {entity.reputation !== undefined && (
            <div className={cn(
              'flex items-center justify-center gap-1',
              isCompact && 'justify-start'
            )}>
              <span className="text-yellow-500">⭐</span>
              <span className={cn(
                'font-medium',
                !isCompact && 'text-lg',
                isCompact && 'text-sm'
              )}>
                {formatNumber(entity.reputation)}
              </span>
            </div>
          )}

          {/* Achievements count */}
          {entity.achievements !== undefined && !isCompact && (
            <div className="text-sm text-muted-foreground">
              {entity.achievements} achievements
            </div>
          )}
        </div>

        {/* Actions */}
        {(actions || !isCompact) && (
          <div className={cn(
            'flex gap-2',
            !isCompact && 'mt-4 justify-center',
            isCompact && 'ml-2'
          )}>
            {actions || (
              <Button
                size={isCompact ? 'sm' : 'default'}
                variant="outline"
                onClick={(e) => {
                  e.preventDefault()
                  onAction?.('view', entity)
                }}
              >
                View
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )

  return href ? (
    <Link href={href} className="block">
      {cardContent}
    </Link>
  ) : cardContent
}

// Standard entity card component (content-first design)
function StandardEntityCard({
  entity,
  variant,
  layout = 'default',
  href,
  actions,
  className,
  onAction
}: Omit<EntityCardProps, 'variant'> & {
  entity: OrganizationEntity | CampaignEntity | ProposalEntity | StakingPoolEntity
  variant: 'organization' | 'campaign' | 'proposal' | 'pool'
}) {
  const isCompact = layout === 'compact'
  const imageUrl = getIPFSUrl(entity.image)

  // Get variant-specific colors and data
  const getVariantConfig = () => {
    switch (variant) {
      case 'organization':
        const org = entity as OrganizationEntity
        return {
          color: 'blue',
          primaryMetric: `${org.memberCount} members`,
          secondaryMetric: org.treasury ? `${org.treasury} treasury` : undefined,
          icon: '🏛️'
        }
      case 'campaign':
        const campaign = entity as CampaignEntity
        const target = typeof campaign.target === 'bigint' ? Number(campaign.target) : parseFloat(campaign.target.toString())
        const raised = typeof campaign.raised === 'bigint' ? Number(campaign.raised) : parseFloat(campaign.raised.toString())
        const progress = target > 0 ? Math.round((raised / target) * 100) : 0
        return {
          color: 'green',
          primaryMetric: `${progress}% funded`,
          secondaryMetric: campaign.contributors ? `${campaign.contributors} contributors` : undefined,
          icon: '🎯'
        }
      case 'proposal':
        const proposal = entity as ProposalEntity
        const totalVotes = proposal.votes ? proposal.votes.for + proposal.votes.against + proposal.votes.abstain : 0
        return {
          color: 'purple',
          primaryMetric: totalVotes > 0 ? `${totalVotes} votes` : 'No votes yet',
          secondaryMetric: proposal.timeLeft || undefined,
          icon: '🗳️'
        }
      case 'pool':
        const pool = entity as StakingPoolEntity
        return {
          color: 'red',
          primaryMetric: `${pool.apy}% APY`,
          secondaryMetric: `${formatNumber(pool.totalStaked)} staked`,
          icon: '🪙'
        }
      default:
        return { color: 'gray', primaryMetric: '', icon: '📄' }
    }
  }

  const config = getVariantConfig()

  const cardContent = (
    <Card className={cn(
      'group hover:shadow-lg transition-all duration-200 cursor-pointer',
      isCompact && 'h-32',
      className
    )}>
      <CardHeader className={cn('pb-3', isCompact && 'pb-2')}>
        <div className="flex items-start gap-3">
          {/* Entity visual */}
          <div className={cn(
            'flex-shrink-0 rounded-lg flex items-center justify-center text-white',
            !isCompact && 'w-12 h-12',
            isCompact && 'w-10 h-10',
            config.color === 'blue' && 'bg-blue-500',
            config.color === 'green' && 'bg-green-500',
            config.color === 'purple' && 'bg-purple-500',
            config.color === 'red' && 'bg-red-500',
            config.color === 'gray' && 'bg-gray-500'
          )}>
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={entity.name || entity.title || ''}
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              <span className="text-lg">{config.icon}</span>
            )}
          </div>

          {/* Entity info */}
          <div className="flex-1 min-w-0">
            <h3 className={cn(
              'font-semibold truncate',
              !isCompact && 'text-lg',
              isCompact && 'text-base'
            )}>
              {entity.name || entity.title}
            </h3>

            {/* Organization name for campaigns/proposals */}
            {'organizationName' in entity && entity.organizationName && (
              <p className="text-sm text-muted-foreground truncate">
                {entity.organizationName}
              </p>
            )}

            {/* Status badge */}
            {entity.status && (
              <Badge
                variant="secondary"
                className={cn(
                  'mt-1 text-xs',
                  getStatusColor(entity.status)
                )}
              >
                {entity.status}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className={cn('space-y-3', isCompact && 'py-2 space-y-2')}>
        {/* Description */}
        {entity.description && !isCompact && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {entity.description}
          </p>
        )}

        {/* Metrics */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{config.primaryMetric}</span>
          {config.secondaryMetric && (
            <span className="text-muted-foreground">{config.secondaryMetric}</span>
          )}
        </div>

        {/* Actions */}
        {!isCompact && (
          <div className="flex gap-2 pt-2">
            {actions || (
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={(e) => {
                  e.preventDefault()
                  onAction?.('view', entity)
                }}
              >
                View Details
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )

  return href ? (
    <Link href={href} className="block">
      {cardContent}
    </Link>
  ) : cardContent
}

// Main EntityCard component
export function EntityCard({
  entity,
  variant,
  layout = 'default',
  href,
  actions,
  className,
  loading = false,
  onAction
}: EntityCardProps) {
  // Show loading skeleton
  if (loading) {
    return <EntityCardSkeleton variant={variant} layout={layout} />
  }

  // Render profile card with visual-first design
  if (variant === 'profile') {
    return (
      <ProfileCard
        entity={entity as ProfileEntity}
        layout={layout}
        href={href}
        actions={actions}
        className={className}
        onAction={onAction}
      />
    )
  }

  // Render standard entity card with content-first design
  return (
    <StandardEntityCard
      entity={entity as OrganizationEntity | CampaignEntity | ProposalEntity | StakingPoolEntity}
      variant={variant}
      layout={layout}
      href={href}
      actions={actions}
      className={className}
      onAction={onAction}
    />
  )
}

// Export types for use in other components
export type {
  EntityType,
  OrganizationEntity,
  CampaignEntity,
  ProposalEntity,
  ProfileEntity,
  StakingPoolEntity
}
