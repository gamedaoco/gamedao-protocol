'use client'

import { ReactNode } from 'react'
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Users,
  Target,
  TrendingUp,
  Calendar,
  Coins,
  Shield,
  Star,
  ChevronRight,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle
} from "lucide-react"

export interface EntityCardProps {
  // Core properties
  id: string
  title: string
  description?: string

  // Visual properties
  banner?: string // Background image URL
  icon?: ReactNode // Custom icon
  iconColor?: string // Icon background color

  // Status and metadata
  status?: 'active' | 'pending' | 'completed' | 'failed' | 'cancelled'
  type?: string // Entity type (organization, campaign, proposal, etc.)

  // Metrics and stats
  primaryMetric?: {
    label: string
    value: string | number
    icon?: ReactNode
  }
  secondaryMetrics?: Array<{
    label: string
    value: string | number
    icon?: ReactNode
  }>

  // Progress and timing
  progress?: number // 0-100
  timeRemaining?: string
  deadline?: Date

  // Actions
  onClick?: () => void
  primaryAction?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'secondary' | 'outline' | 'destructive'
    loading?: boolean
  }
  secondaryAction?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'secondary' | 'outline' | 'destructive'
  }

  // Layout
  variant?: 'default' | 'compact' | 'detailed'
  aspectRatio?: '16:9' | '4:3' | 'square'

  // Additional content
  tags?: string[]
  footer?: ReactNode
}

const statusIcons = {
  active: <CheckCircle className="h-4 w-4 text-green-500" />,
  pending: <Clock className="h-4 w-4 text-yellow-500" />,
  completed: <CheckCircle className="h-4 w-4 text-green-500" />,
  failed: <XCircle className="h-4 w-4 text-red-500" />,
  cancelled: <XCircle className="h-4 w-4 text-gray-500" />,
}

const statusColors = {
  active: 'bg-green-100 text-green-800 border-green-200',
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  failed: 'bg-red-100 text-red-800 border-red-200',
  cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
}

export function EntityCard({
  id,
  title,
  description,
  banner,
  icon,
  iconColor = 'bg-blue-500',
  status,
  type,
  primaryMetric,
  secondaryMetrics = [],
  progress,
  timeRemaining,
  deadline,
  onClick,
  primaryAction,
  secondaryAction,
  variant = 'default',
  aspectRatio = '16:9',
  tags = [],
  footer
}: EntityCardProps) {

  const aspectRatioClasses = {
    '16:9': 'aspect-[16/9]',
    '4:3': 'aspect-[4/3]',
    'square': 'aspect-square'
  }

  const cardClasses = cn(
    "group relative overflow-hidden transition-all duration-200 hover:shadow-lg",
    onClick && "cursor-pointer hover:scale-[1.02]",
    variant === 'compact' && "h-auto",
    variant === 'detailed' && "min-h-[300px]"
  )

  return (
    <Card className={cardClasses} onClick={onClick}>
      {/* Banner Background */}
      <div className={cn(
        "relative overflow-hidden",
        aspectRatioClasses[aspectRatio]
      )}>
        {banner && (
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${banner})` }}
          />
        )}

        {/* Overlay */}
        <div className={cn(
          "absolute inset-0",
          banner
            ? "bg-black/40"
            : "bg-secondary"
        )} />

        {/* Header Content */}
        <CardHeader className="relative z-10 pb-2">
          <div className="flex items-start justify-between">
            {/* Icon and Type */}
            <div className="flex items-center space-x-3">
              {icon && (
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg text-white shadow-lg",
                  iconColor
                )}>
                  {icon}
                </div>
              )}

              {type && (
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                  {type}
                </Badge>
              )}
            </div>

            {/* Status */}
            {status && (
              <Badge className={cn(
                "flex items-center space-x-1",
                statusColors[status]
              )}>
                {statusIcons[status]}
                <span className="capitalize">{status}</span>
              </Badge>
            )}
          </div>

          {/* Title */}
          <h3 className={cn(
            "font-semibold leading-tight",
            banner ? "text-white" : "text-white",
            variant === 'compact' ? "text-lg" : "text-xl"
          )}>
            {title}
          </h3>

          {/* Description */}
          {description && variant !== 'compact' && (
            <p className={cn(
              "text-sm leading-relaxed",
              banner ? "text-white/90" : "text-white/90"
            )}>
              {description}
            </p>
          )}
        </CardHeader>
      </div>

      {/* Content Area */}
      <CardContent className="space-y-4">
        {/* Primary Metric */}
        {primaryMetric && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-muted-foreground">
              {primaryMetric.icon}
              <span className="text-sm">{primaryMetric.label}</span>
            </div>
            <span className="font-semibold">{primaryMetric.value}</span>
          </div>
        )}

        {/* Progress Bar */}
        {progress !== undefined && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Secondary Metrics */}
        {secondaryMetrics.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            {secondaryMetrics.map((metric, index) => (
              <div key={index} className="text-center">
                <div className="flex items-center justify-center space-x-1 text-muted-foreground mb-1">
                  {metric.icon}
                  <span className="text-xs">{metric.label}</span>
                </div>
                <div className="font-semibold text-sm">{metric.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Time Remaining */}
        {timeRemaining && (
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{timeRemaining} remaining</span>
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Actions */}
        {(primaryAction || secondaryAction) && (
          <div className="flex space-x-2 pt-2">
            {primaryAction && (
              <Button
                size="sm"
                variant={primaryAction.variant || 'default'}
                onClick={(e) => {
                  e.stopPropagation()
                  primaryAction.onClick()
                }}
                disabled={primaryAction.loading}
                className="flex-1"
              >
                {primaryAction.loading ? 'Loading...' : primaryAction.label}
              </Button>
            )}

            {secondaryAction && (
              <Button
                size="sm"
                variant={secondaryAction.variant || 'outline'}
                onClick={(e) => {
                  e.stopPropagation()
                  secondaryAction.onClick()
                }}
                className="flex-1"
              >
                {secondaryAction.label}
              </Button>
            )}

            {onClick && !primaryAction && (
              <Button size="sm" variant="ghost" className="ml-auto">
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {/* Footer */}
        {footer && (
          <div className="pt-2 border-t">
            {footer}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Preset configurations for different GameDAO entities
export const EntityCardPresets = {
  organization: {
    icon: <Users className="h-5 w-5" />,
    iconColor: 'bg-blue-500',
    type: 'Collective'
  },

  campaign: {
    icon: <Target className="h-5 w-5" />,
    iconColor: 'bg-green-500',
    type: 'Campaign'
  },

  proposal: {
    icon: <TrendingUp className="h-5 w-5" />,
    iconColor: 'bg-purple-500',
    type: 'Proposal'
  },

  stakingPool: {
    icon: <Coins className="h-5 w-5" />,
    iconColor: 'bg-yellow-500',
    type: 'Staking Pool'
  },

  profile: {
    icon: <Shield className="h-5 w-5" />,
    iconColor: 'bg-indigo-500',
    type: 'Profile'
  },

  achievement: {
    icon: <Star className="h-5 w-5" />,
    iconColor: 'bg-orange-500',
    type: 'Achievement'
  }
}

// Grid container component
export function EntityCardGrid({
  children,
  columns = 3,
  className
}: {
  children: ReactNode
  columns?: 1 | 2 | 3 | 4
  className?: string
}) {
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
  }

  return (
    <div className={cn(
      "grid gap-6",
      gridClasses[columns],
      className
    )}>
      {children}
    </div>
  )
}
