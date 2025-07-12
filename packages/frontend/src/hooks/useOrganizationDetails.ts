'use client'

import { useQuery } from '@apollo/client'
import { GET_ORGANIZATION_BY_ID } from '@/lib/queries'
import { useMemo } from 'react'

export interface OrganizationMember {
  id: string
  address: string
  state: 'NONE' | 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'KICKED'
  role: string
  joinedAt: number
}

export interface OrganizationDetails {
  id: string
  name: string
  creator: string
  prime: string
  metadataURI?: string
  treasury: {
    id: string
    address: string
    balance: string
  }
  orgType: string
  accessModel: number
  state: number
  memberLimit: number
  membershipFee: number
  memberCount: number
  totalCampaigns: number
  totalProposals: number
  createdAt: number
  updatedAt: number
  blockNumber: number
  transactionHash: string
  members: OrganizationMember[]
  campaigns: Array<{
    id: string
    title: string
    state: string
    target: string
    raised: string
    createdAt: number
  }>
  proposals: Array<{
    id: string
    title: string
    state: string
    createdAt: number
  }>
}

function getAccessModelFromString(accessModel: string | undefined): number {
  switch (accessModel) {
    case 'OPEN': return 0
    case 'VOTING': return 1
    case 'INVITE': return 2
    default: return 0
  }
}

function getStateFromString(state: string | undefined): number {
  switch (state) {
    case 'INACTIVE': return 0
    case 'ACTIVE': return 1
    case 'LOCKED': return 2
    default: return 0
  }
}

export function useOrganizationDetails(organizationId: string) {
  const { data, loading, error, refetch } = useQuery(GET_ORGANIZATION_BY_ID, {
    variables: { id: organizationId },
    skip: !organizationId,
    pollInterval: 30000,
    errorPolicy: 'all',
    notifyOnNetworkStatusChange: false,
    fetchPolicy: 'cache-and-network',
  })

  const organization: OrganizationDetails | null = useMemo(() => {
    if (!data?.organization) return null

    const org = data.organization

    return {
      id: org.id,
      name: org.name || `Organization ${org.id}`,
      creator: org.creator,
      prime: org.prime || org.creator,
      metadataURI: org.metadataURI,
      treasury: {
        id: org.treasury?.id || '',
        address: org.treasury?.address || '0x0000000000000000000000000000000000000000',
        balance: org.treasury?.balance || '0'
      },
      orgType: org.orgType || 'INDIVIDUAL',
      accessModel: getAccessModelFromString(org.accessModel),
      state: getStateFromString(org.state),
      memberLimit: parseInt(org.memberLimit) || 100,
      membershipFee: parseInt(org.membershipFee) || 0,
      memberCount: parseInt(org.memberCount) || 0,
      totalCampaigns: parseInt(org.totalCampaigns) || 0,
      totalProposals: parseInt(org.totalProposals) || 0,
      createdAt: parseInt(org.createdAt) || Math.floor(Date.now() / 1000),
      updatedAt: parseInt(org.updatedAt) || Math.floor(Date.now() / 1000),
      blockNumber: parseInt(org.blockNumber) || 0,
      transactionHash: org.transactionHash || '',
      members: (org.members || []).map((member: any) => ({
        id: member.id,
        address: member.address,
        state: member.state,
        role: member.role,
        joinedAt: parseInt(member.joinedAt) || Math.floor(Date.now() / 1000)
      })),
      campaigns: (org.campaigns || []).map((campaign: any) => ({
        id: campaign.id,
        title: campaign.title,
        state: campaign.state,
        target: campaign.target,
        raised: campaign.raised,
        createdAt: parseInt(campaign.createdAt) || Math.floor(Date.now() / 1000)
      })),
      proposals: (org.proposals || []).map((proposal: any) => ({
        id: proposal.id,
        title: proposal.title,
        state: proposal.state,
        createdAt: parseInt(proposal.createdAt) || Math.floor(Date.now() / 1000)
      }))
    }
  }, [data])

  // Get active members only
  const activeMembers = useMemo(() => {
    if (!organization?.members) return []
    return organization.members.filter(member => member.state === 'ACTIVE')
  }, [organization?.members])

  // Get actual member count from active members
  const actualMemberCount = activeMembers.length

  return {
    organization,
    activeMembers,
    actualMemberCount,
    isLoading: loading,
    error,
    refetch
  }
}
