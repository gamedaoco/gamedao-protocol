'use client'

import { useState, useEffect } from 'react'
import { useGameDAO } from './useGameDAO'

export interface UserProfile {
  address: string
  isRegistered: boolean
  profile?: {
    name: string
    bio: string
    avatar: string
    reputation: number
    achievements: string[]
  }
}

export function useUserRegistration() {
  const { address, isConnected, contracts } = useGameDAO()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check if user is registered when address changes
  useEffect(() => {
    if (address && isConnected) {
      checkUserRegistration()
    } else {
      setUserProfile(null)
    }
  }, [address, isConnected])

  const checkUserRegistration = async () => {
    if (!address) return

    setIsLoading(true)
    setError(null)

    try {
      // TODO: Query subgraph for user profile
      // For now, simulate the check
      const isRegistered = false // await queryUserProfile(address)

      setUserProfile({
        address,
        isRegistered,
        profile: isRegistered ? {
          name: 'GameDAO User',
          bio: 'Gaming enthusiast',
          avatar: '',
          reputation: 100,
          achievements: []
        } : undefined
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check registration')
    } finally {
      setIsLoading(false)
    }
  }

  const registerUser = async (profileData: { name: string; bio: string; avatar?: string }) => {
    if (!address || !isConnected) {
      throw new Error('Wallet not connected')
    }

    setIsLoading(true)
    setError(null)

    try {
      // TODO: Call Sense module to register user
      // For now, simulate registration
      console.log('Registering user:', { address, ...profileData })

      // Update local state
      setUserProfile({
        address,
        isRegistered: true,
        profile: {
          name: profileData.name,
          bio: profileData.bio,
          avatar: profileData.avatar || '',
          reputation: 100,
          achievements: []
        }
      })

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return {
    userProfile,
    isLoading,
    error,
    registerUser,
    checkUserRegistration,
    needsRegistration: isConnected && userProfile && !userProfile.isRegistered,
  }
}
