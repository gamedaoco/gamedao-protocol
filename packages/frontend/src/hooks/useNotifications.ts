'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAccount } from 'wagmi'

export interface Notification {
  id: string
  type: 'organization' | 'campaign' | 'proposal' | 'staking' | 'system'
  title: string
  message: string
  timestamp: number
  read: boolean
  urgent?: boolean
  entityId?: string // ID of related entity (org, campaign, etc.)
  actionUrl?: string // URL to navigate to when clicked
}

export interface NotificationSettings {
  organizationUpdates: boolean
  campaignUpdates: boolean
  proposalUpdates: boolean
  stakingRewards: boolean
  systemAnnouncements: boolean
  emailNotifications: boolean
  pushNotifications: boolean
}

const DEFAULT_SETTINGS: NotificationSettings = {
  organizationUpdates: true,
  campaignUpdates: true,
  proposalUpdates: true,
  stakingRewards: true,
  systemAnnouncements: true,
  emailNotifications: false,
  pushNotifications: false
}

export function useNotifications() {
  const { address, isConnected } = useAccount()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS)
  const [isLoading, setIsLoading] = useState(false)

  // Load notifications from localStorage on mount
  useEffect(() => {
    if (!address) return

    const storageKey = `notifications_${address}`
    const settingsKey = `notification_settings_${address}`

    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        setNotifications(parsed)
      }

      const storedSettings = localStorage.getItem(settingsKey)
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings)
        setSettings({ ...DEFAULT_SETTINGS, ...parsedSettings })
      }
    } catch (error) {
      console.error('Failed to load notifications from storage:', error)
    }
  }, [address])

  // Save notifications to localStorage when they change
  useEffect(() => {
    if (!address || notifications.length === 0) return

    const storageKey = `notifications_${address}`
    try {
      localStorage.setItem(storageKey, JSON.stringify(notifications))
    } catch (error) {
      console.error('Failed to save notifications to storage:', error)
    }
  }, [notifications, address])

  // Save settings to localStorage when they change
  useEffect(() => {
    if (!address) return

    const settingsKey = `notification_settings_${address}`
    try {
      localStorage.setItem(settingsKey, JSON.stringify(settings))
    } catch (error) {
      console.error('Failed to save notification settings to storage:', error)
    }
  }, [settings, address])

  // Mock data for development - replace with real data sources
  useEffect(() => {
    if (!isConnected || !address) return

    // Simulate loading notifications from various sources
    const mockNotifications: Notification[] = [
      {
        id: '1',
        type: 'organization',
        title: 'New Member Joined',
        message: 'Alice joined your organization "Gaming Studio DAO"',
        timestamp: Date.now() - 3600000, // 1 hour ago
        read: false,
        entityId: 'org123',
        actionUrl: '/control/org123'
      },
      {
        id: '2',
        type: 'campaign',
        title: 'Campaign Milestone Reached',
        message: 'Your campaign "Epic RPG Game" reached 50% funding goal',
        timestamp: Date.now() - 7200000, // 2 hours ago
        read: false,
        urgent: true,
        entityId: 'camp456',
        actionUrl: '/flow/camp456'
      },
      {
        id: '3',
        type: 'proposal',
        title: 'Voting Reminder',
        message: 'Proposal "Upgrade Treasury Rules" voting ends in 24 hours',
        timestamp: Date.now() - 14400000, // 4 hours ago
        read: true,
        entityId: 'prop789',
        actionUrl: '/signal/prop789'
      },
      {
        id: '4',
        type: 'staking',
        title: 'Rewards Available',
        message: 'You have 150 GAME tokens ready to claim from staking rewards',
        timestamp: Date.now() - 86400000, // 1 day ago
        read: false,
        actionUrl: '/staking/rewards'
      },
      {
        id: '5',
        type: 'system',
        title: 'Platform Update',
        message: 'New features available: Enhanced governance tools and improved UI',
        timestamp: Date.now() - 172800000, // 2 days ago
        read: true,
        actionUrl: '/dashboard'
      }
    ]

    // Only set mock data if no notifications exist
    if (notifications.length === 0) {
      setNotifications(mockNotifications)
    }
  }, [isConnected, address, notifications.length])

  // Computed values
  const unreadCount = useMemo(() =>
    notifications.filter(n => !n.read).length
  , [notifications])

  const urgentCount = useMemo(() =>
    notifications.filter(n => !n.read && n.urgent).length
  , [notifications])

  const hasUnread = unreadCount > 0
  const hasUrgent = urgentCount > 0

  // Recent notifications (last 7 days)
  const recentNotifications = useMemo(() => {
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
    return notifications
      .filter(n => n.timestamp > sevenDaysAgo)
      .sort((a, b) => b.timestamp - a.timestamp)
  }, [notifications])

  // Actions
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    )
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    )
  }, [])

  const deleteNotification = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.filter(n => n.id !== notificationId)
    )
  }, [])

  const clearAllNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    }

    setNotifications(prev => [newNotification, ...prev])
  }, [])

  const updateSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }))
  }, [])

  // Filter notifications by type
  const getNotificationsByType = useCallback((type: Notification['type']) => {
    return notifications.filter(n => n.type === type)
  }, [notifications])

  return {
    // Data
    notifications,
    recentNotifications,
    settings,

    // Computed values
    unreadCount,
    urgentCount,
    hasUnread,
    hasUrgent,
    isLoading,

    // Actions
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    addNotification,
    updateSettings,
    getNotificationsByType,

    // Utils
    isConnected
  }
}
