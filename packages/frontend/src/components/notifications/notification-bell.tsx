'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useNotifications } from '@/hooks/useNotifications'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Bell,
  BellRing,
  Circle,
  Clock,
  Users,
  Target,
  Vote,
  Coins,
  Settings,
  Trash2,
  CheckCheck,
  ExternalLink
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import type { Notification } from '@/hooks/useNotifications'

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'organization':
      return <Users className="h-4 w-4" />
    case 'campaign':
      return <Target className="h-4 w-4" />
    case 'proposal':
      return <Vote className="h-4 w-4" />
    case 'staking':
      return <Coins className="h-4 w-4" />
    case 'system':
      return <Settings className="h-4 w-4" />
    default:
      return <Circle className="h-4 w-4" />
  }
}

const getNotificationColor = (type: Notification['type']) => {
  switch (type) {
    case 'organization':
      return 'text-blue-600'
    case 'campaign':
      return 'text-green-600'
    case 'proposal':
      return 'text-purple-600'
    case 'staking':
      return 'text-yellow-600'
    case 'system':
      return 'text-gray-600'
    default:
      return 'text-gray-600'
  }
}

interface NotificationItemProps {
  notification: Notification
  onRead: (id: string) => void
  onDelete: (id: string) => void
  onNavigate: (url: string) => void
}

function NotificationItem({ notification, onRead, onDelete, onNavigate }: NotificationItemProps) {
  const handleClick = () => {
    if (!notification.read) {
      onRead(notification.id)
    }
    if (notification.actionUrl) {
      onNavigate(notification.actionUrl)
    }
  }

  return (
    <div
      className={cn(
        'p-3 hover:bg-muted/50 transition-colors cursor-pointer border-l-2',
        notification.urgent ? 'border-l-red-500 bg-red-50/50 dark:bg-red-950/20' :
        !notification.read ? 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20' :
        'border-l-transparent'
      )}
      onClick={handleClick}
    >
      <div className="flex items-start space-x-3">
        {/* Icon */}
        <div className={cn('mt-0.5', getNotificationColor(notification.type))}>
          {getNotificationIcon(notification.type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <p className={cn(
                  'text-sm font-medium truncate',
                  !notification.read && 'font-semibold'
                )}>
                  {notification.title}
                </p>
                {notification.urgent && (
                  <Badge variant="destructive" className="text-xs">
                    Urgent
                  </Badge>
                )}
                {!notification.read && (
                  <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {notification.message}
              </p>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{formatDistanceToNow(notification.timestamp, { addSuffix: true })}</span>
                </div>
                {notification.actionUrl && (
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-1 ml-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(notification.id)
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function NotificationBell() {
  const router = useRouter()
  const {
    recentNotifications,
    unreadCount,
    hasUnread,
    hasUrgent,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    isConnected
  } = useNotifications()

  const [isOpen, setIsOpen] = useState(false)

  const handleNavigate = (url: string) => {
    setIsOpen(false)
    router.push(url)
  }

  if (!isConnected) {
    return null
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          {hasUrgent ? (
            <BellRing className="h-4 w-4 text-red-500" />
          ) : hasUnread ? (
            <BellRing className="h-4 w-4" />
          ) : (
            <Bell className="h-4 w-4" />
          )}
          {unreadCount > 0 && (
            <Badge
              variant={hasUrgent ? "destructive" : "default"}
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-hidden">
        {/* Header */}
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {unreadCount} new
            </Badge>
          )}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Actions */}
        {recentNotifications.length > 0 && (
          <>
            <div className="px-2 py-1">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => markAllAsRead()}
                  disabled={!hasUnread}
                >
                  <CheckCheck className="h-3 w-3 mr-1" />
                  Mark all read
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 text-destructive hover:text-destructive"
                  onClick={() => clearAllNotifications()}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear all
                </Button>
              </div>
            </div>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Notifications List */}
        <div className="max-h-64 overflow-y-auto">
          {recentNotifications.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No notifications yet</p>
              <p className="text-xs">You'll see important updates here</p>
            </div>
          ) : (
            <div className="space-y-0">
              {recentNotifications.slice(0, 10).map((notification) => (
                <div key={notification.id} className="group">
                  <NotificationItem
                    notification={notification}
                    onRead={markAsRead}
                    onDelete={deleteNotification}
                    onNavigate={handleNavigate}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {recentNotifications.length > 10 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-center justify-center"
              onClick={() => handleNavigate('/notifications')}
            >
              View all notifications
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
