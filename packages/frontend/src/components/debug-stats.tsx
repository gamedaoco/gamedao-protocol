'use client'

import { useProtocolStats } from '@/hooks/useProtocolStats'
import { useOrganizations } from '@/hooks/useOrganizations'
import { useCampaigns } from '@/hooks/useCampaigns'
import { useProposals } from '@/hooks/useProposals'
import { useStakingPools } from '@/hooks/use-staking-pools'

export function DebugStats() {
  const { globalStats, isLoading: protocolLoading } = useProtocolStats()
  const { organizations, isLoading: orgsLoading } = useOrganizations()
  const { campaigns, isLoading: campaignsLoading } = useCampaigns()
  const { proposals, isLoading: proposalsLoading } = useProposals()
  const { stakingPools, isLoading: stakingLoading } = useStakingPools()

  return (
    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <h3 className="text-lg font-bold mb-4">Debug: Subgraph Data Status</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <h4 className="font-semibold">Protocol Stats (useProtocolStats)</h4>
          <p>Loading: {protocolLoading ? 'Yes' : 'No'}</p>
          <p>Total Organizations: {globalStats.totalOrganizations}</p>
          <p>Active Organizations: {globalStats.activeOrganizations}</p>
          <p>Total Members: {globalStats.totalMembers}</p>
          <p>Total Campaigns: {globalStats.totalCampaigns}</p>
          <p>Active Campaigns: {globalStats.activeCampaigns}</p>
          <p>Total Raised: ${globalStats.totalRaised}</p>
          <p>Total Proposals: {globalStats.totalProposals}</p>
          <p>Active Proposals: {globalStats.activeProposals}</p>
        </div>

        <div>
          <h4 className="font-semibold">Individual Hooks</h4>
          <p>Organizations: {orgsLoading ? 'Loading...' : `${organizations.length} found`}</p>
          <p>Campaigns: {campaignsLoading ? 'Loading...' : `${campaigns.length} found`}</p>
          <p>Proposals: {proposalsLoading ? 'Loading...' : `${proposals.length} found`}</p>
          <p>Staking Pools: {stakingLoading ? 'Loading...' : `${stakingPools.length} found`}</p>
        </div>

        <div className="md:col-span-2">
          <h4 className="font-semibold">Raw Data Sample</h4>
          {organizations.length > 0 && (
            <div className="mt-2">
              <p className="font-medium">First Organization:</p>
              <p>Name: {organizations[0].name}</p>
              <p>Members: {organizations[0].memberCount}</p>
              <p>State: {organizations[0].state}</p>
            </div>
          )}
          {campaigns.length > 0 && (
            <div className="mt-2">
              <p className="font-medium">First Campaign:</p>
              <p>Title: {campaigns[0].title}</p>
              <p>Target: {campaigns[0].target}</p>
              <p>Raised: {campaigns[0].raised}</p>
              <p>State: {campaigns[0].state}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
