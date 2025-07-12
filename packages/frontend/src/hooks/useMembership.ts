import { useQuery } from '@apollo/client'
import { useAccount } from 'wagmi'
import { CHECK_MEMBERSHIP } from '@/lib/queries'

export interface MembershipStatus {
  isMember: boolean
  isLoading: boolean
  error: any
  memberData?: {
    id: string
    state: string
    role: string
    joinedAt: string
  }
}

export function useMembership(organizationId: string): MembershipStatus {
  const { address } = useAccount()

  const { data, loading, error } = useQuery(CHECK_MEMBERSHIP, {
    variables: {
      organizationId,
      userAddress: address?.toLowerCase()
    },
    skip: !address || !organizationId,
    errorPolicy: 'all',
    notifyOnNetworkStatusChange: false,
    fetchPolicy: 'cache-first',
  })

  const isMember = data?.members && data.members.length > 0
  const memberData = isMember ? data.members[0] : undefined

  return {
    isMember,
    isLoading: loading,
    error,
    memberData
  }
}

export function useUserMemberships() {
  const { address } = useAccount()

  const { data, loading, error, refetch } = useQuery(CHECK_MEMBERSHIP, {
    variables: {
      userAddress: address?.toLowerCase()
    },
    skip: !address,
    errorPolicy: 'all',
  })

  const memberships = data?.members || []

  return {
    memberships,
    isLoading: loading,
    error,
    refetch
  }
}
