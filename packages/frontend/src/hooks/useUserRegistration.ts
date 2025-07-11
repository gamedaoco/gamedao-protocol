'use client'

import { useState, useEffect, useMemo } from 'react'
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
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Always return a defined userProfile object with default values
  const userProfile: UserProfile = useMemo(() => {
    if (!address || !isConnected) {
      return {
        address: '',
        isRegistered: false,
        profile: undefined
      }
    }

    return {
      address,
      isRegistered: false, // TODO: Query subgraph for actual registration status
      profile: undefined
    }
  }, [address, isConnected])

  // Check if user is registered when address changes
  useEffect(() => {
    if (address && isConnected) {
      checkUserRegistration()
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

      // Note: We don't need to setState here since we're using useMemo
      // The userProfile will be recalculated when dependencies change
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check registration')
    } finally {
      setIsLoading(false)
    }
  }

  const registerUser = async (profileData: { name: string; bio: string; avatar: string }) => {
    if (!address || !isConnected) {
      throw new Error('Wallet not connected')
    }

    setIsLoading(true)
    setError(null)

    try {
      // TODO: Implement user registration via contract
      console.log('Registering user:', profileData)
      // await registerUserProfile(address, profileData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register user')
      throw err
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
  }
}
