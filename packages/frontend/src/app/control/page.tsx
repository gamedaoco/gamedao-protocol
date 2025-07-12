'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useOrganizations } from '@/hooks/useOrganizations'
import { useOrganizationsMetadata } from '@/hooks/useOrganizationMetadata'
import { useAccount } from 'wagmi'
import { EntityCard } from '@/components/ui/entity-card'
import { EmptyState } from '@/components/ui/empty-state'
import { useState, useMemo } from 'react'
import { Plus, Users, CreditCard, Shield } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function ControlPage() {
  const { isConnected } = useAccount()
  const router = useRouter()
  const {
    organizations,
    isLoading,
    stats,
    getAccessModelString
  } = useOrganizations()

  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')

  // Filter organizations based on selected filter
  const filteredOrganizations = organizations.filter(org => {
    if (filter === 'active') return org.state === 1
    if (filter === 'inactive') return org.state !== 1
    return true
  })

  // Extract metadata URIs for fetching organization metadata
  const metadataURIs = useMemo(() =>
    filteredOrganizations
      .map(org => org.metadataURI)
      .filter(Boolean) as string[]
  , [filteredOrganizations])

  // Fetch metadata for all organizations
  const metadataResults = useOrganizationsMetadata(metadataURIs)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Control</h1>
          <p className="text-muted-foreground">
            Manage and participate in gaming organizations and DAOs
          </p>
        </div>
        <Link href="/control/create">
          <Button disabled={!isConnected} className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Create Organization</span>
          </Button>
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Organizations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrganizations}</div>
            <p className="text-muted-foreground text-sm">
              All organizations in the ecosystem
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Organizations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeOrganizations}</div>
            <p className="text-muted-foreground text-sm">
              Currently active and operational
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMembers}</div>
            <p className="text-muted-foreground text-sm">
              Across all organizations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          All
        </Button>
        <Button
          variant={filter === 'active' ? 'default' : 'outline'}
          onClick={() => setFilter('active')}
        >
          Active
        </Button>
        <Button
          variant={filter === 'inactive' ? 'default' : 'outline'}
          onClick={() => setFilter('inactive')}
        >
          Inactive
        </Button>
        <div className="ml-auto flex gap-2">
          <Button variant="outline">
            Filter
          </Button>
          <Button variant="outline">
            Refresh
          </Button>
        </div>
      </div>

      {/* Organizations Grid */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredOrganizations.length === 0 && !isLoading && (
          <EmptyState
            type="organizations"
            title={filter === 'all' ? 'No organizations found' : `No ${filter} organizations found`}
            description={
              filter === 'all'
                ? 'Get started by creating your first gaming DAO or discover existing communities.'
                : `There are currently no ${filter} organizations. Try changing your filter.`
            }
            primaryAction={{
              label: 'Create Organization',
              onClick: () => router.push('/control/create')
            }}
            secondaryAction={{
              label: 'Clear Filter',
              onClick: () => setFilter('all')
            }}
          />
        )}
        {filteredOrganizations.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOrganizations.map((org) => {
              const metadata = org.metadataURI ? metadataResults[org.metadataURI] : null
              const bannerImage = metadata?.bannerImageUrl || undefined

              return (
                <EntityCard
                  key={org.id}
                  id={org.id}
                  title={org.name}
                  description={`${getAccessModelString(org.accessModel)} organization with ${org.memberCount} members`}
                  banner={bannerImage}
                  icon={<Users className="h-5 w-5" />}
                  iconColor="bg-blue-500"
                  type="Organization"
                  status={org.state === 1 ? 'active' : 'pending'}
                  primaryMetric={{
                    label: 'Members',
                    value: org.memberCount,
                    icon: <Users className="h-4 w-4" />
                  }}
                  secondaryMetrics={[
                    {
                      label: 'Membership Fee',
                      value: org.membershipFee > 0 ? `${org.membershipFee} GAME` : 'Free',
                      icon: <CreditCard className="h-4 w-4" />
                    },
                    {
                      label: 'Access Model',
                      value: getAccessModelString(org.accessModel),
                      icon: <Shield className="h-4 w-4" />
                    }
                  ]}
                  tags={[
                    org.state === 1 ? 'Active' : 'Inactive',
                    `${org.totalCampaigns} Campaigns`,
                    `${org.totalProposals} Proposals`
                  ]}
                  onClick={() => router.push(`/control/${org.id}`)}
                  variant="default"
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
