'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useNotifications } from '@/hooks/useNotifications'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
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
  ExternalLink,
  Filter,
  ArrowLeft
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { Notification } from '@/hooks/useNotifications'
import Link from 'next/link'

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'organization':
      return <Users className="h-5 w-5" />
    case 'campaign':
      return <Target className="h-5 w-5" />
    case 'proposal':
      return <Vote className="h-5 w-5" />
    case 'staking':
      return <Coins className="h-5 w-5" />
    case 'system':
      return <Settings className="h-5 w-5" />
    default:
      return <Circle className="h-5 w-5" />
  }
}

const getNotificationColor = (type: Notification['type']) => {
  switch (type) {
    case 'organization':
      return 'text-blue-600 bg-blue-50 dark:bg-blue-950/20'
    case 'campaign':
      return 'text-green-600 bg-green-50 dark:bg-green-950/20'
    case 'proposal':
      return 'text-purple-600 bg-purple-50 dark:bg-purple-950/20'
    case 'staking':
      return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20'
    case 'system':
      return 'text-gray-600 bg-gray-50 dark:bg-gray-950/20'
    default:
      return 'text-gray-600 bg-gray-50 dark:bg-gray-950/20'
  }
}

const getTypeLabel = (type: Notification['type']) => {
  switch (type) {
    case 'organization':
      return 'Organizations'
    case 'campaign':
      return 'Campaigns'
    case 'proposal':
      return 'Governance'
    case 'staking':
      return 'Staking'
    case 'system':
      return 'System'
    default:
      return 'Other'
  }
}

interface NotificationCardProps {
  notification: Notification
  onRead: (id: string) => void
  onDelete: (id: string) => void
  onNavigate: (url: string) => void
}

function NotificationCard({ notification, onRead, onDelete, onNavigate }: NotificationCardProps) {
  const handleClick = () => {
    if (!notification.read) {
      onRead(notification.id)
    }
    if (notification.actionUrl) {
      onNavigate(notification.actionUrl)
    }
  }

  return (
    <Card
      className={cn(
        'transition-all duration-200 hover:shadow-md cursor-pointer',
        notification.urgent && 'ring-2 ring-red-200 dark:ring-red-800',
        !notification.read && 'bg-blue-50/50 dark:bg-blue-950/20'
      )}
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start space-x-4">
          {/* Icon */}
          <div className={cn('p-2 rounded-lg', getNotificationColor(notification.type))}>
            {getNotificationIcon(notification.type)}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className={cn(
                    'font-medium',
                    !notification.read && 'font-semibold'
                  )}>
                    {notification.title}
                  </h3>
                  {notification.urgent && (
                    <Badge variant="destructive" className="text-xs">
                      Urgent
                    </Badge>
                  )}
                  {!notification.read && (
                    <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0" />
                  )}
                </div>

                <p className="text-sm text-muted-foreground mb-3">
                  {notification.message}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatDistanceToNow(notification.timestamp, { addSuffix: true })}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {getTypeLabel(notification.type)}
                    </Badge>
                  </div>
                  {notification.actionUrl && (
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      <ExternalLink className="h-3 w-3" />
                      <span>Click to view</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2 ml-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(notification.id)
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function NotificationsPage() {
  const router = useRouter()
  const {
    notifications,
    unreadCount,
    hasUnread,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    getNotificationsByType,
    isConnected
  } = useNotifications()

  const [activeTab, setActiveTab] = useState('all')

  if (!isConnected) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Connect Wallet Required</h2>
              <p className="text-muted-foreground">
                Please connect your wallet to view your notifications.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const filteredNotifications = activeTab === 'all'
    ? notifications
    : getNotificationsByType(activeTab as Notification['type'])

  const unreadNotifications = filteredNotifications.filter(n => !n.read)
  const urgentNotifications = filteredNotifications.filter(n => n.urgent && !n.read)

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Notifications</h1>
            <p className="text-muted-foreground">
              Stay updated with important events and activities
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center space-x-2">
          {hasUnread && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark all read
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={clearAllNotifications}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear all
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Total</p>
                <p className="text-2xl font-bold">{notifications.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BellRing className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Unread</p>
                <p className="text-2xl font-bold text-blue-600">{unreadCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BellRing className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium">Urgent</p>
                <p className="text-2xl font-bold text-red-600">{urgentNotifications.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Today</p>
                <p className="text-2xl font-bold">
                  {notifications.filter(n =>
                    new Date(n.timestamp).toDateString() === new Date().toDateString()
                  ).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="organization">Organizations</TabsTrigger>
              <TabsTrigger value="campaign">Campaigns</TabsTrigger>
              <TabsTrigger value="proposal">Governance</TabsTrigger>
              <TabsTrigger value="staking">Staking</TabsTrigger>
              <TabsTrigger value="system">System</TabsTrigger>
            </TabsList>

            <div className="mt-6">
              {filteredNotifications.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No notifications</h3>
                  <p className="text-muted-foreground">
                    {activeTab === 'all'
                      ? "You don't have any notifications yet"
                      : `No ${getTypeLabel(activeTab as Notification['type']).toLowerCase()} notifications`
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredNotifications
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .map((notification) => (
                      <NotificationCard
                        key={notification.id}
                        notification={notification}
                        onRead={markAsRead}
                        onDelete={deleteNotification}
                        onNavigate={(url) => router.push(url)}
                      />
                    ))
                  }
                </div>
              )}
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
