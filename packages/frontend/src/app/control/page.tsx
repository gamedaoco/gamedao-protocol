'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useOrganizations } from '@/hooks/useOrganizations'
import { useAccount } from 'wagmi'
import { EntityCard } from '@/components/ui/entity-card'
import { EmptyState } from '@/components/ui/empty-state'
import { CreateOrganizationModal } from '@/components/organization/create-organization-modal'
import { useState } from 'react'
import { Plus } from 'lucide-react'

export default function ControlPage() {
  const { isConnected } = useAccount()
  const {
    organizations,
    isLoading,
    stats,
    getStateString,
    getAccessModelString
  } = useOrganizations()

  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)

  const handleCreateOrganization = () => {
    if (!isConnected) {
      alert('Please connect your wallet first')
      return
    }
    setShowCreateModal(true)
  }

  // Filter organizations based on selected filter
  const filteredOrganizations = organizations.filter(org => {
    if (filter === 'active') return org.state === 1
    if (filter === 'inactive') return org.state !== 1
    return true
  })

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
        <Button disabled={!isConnected} onClick={handleCreateOrganization} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Create Organization</span>
        </Button>
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
        ) : filteredOrganizations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                         {filteredOrganizations.map((org) => (
               <EntityCard
                 key={org.id}
                 entity={{
                   id: org.id,
                   name: org.name,
                   description: `${getStateString(org.state)} • ${getAccessModelString(org.accessModel)}`,
                   status: getStateString(org.state),
                   memberCount: org.memberCount,
                   treasury: org.treasury,
                   accessModel: org.accessModel,
                   createdAt: org.createdAt
                 }}
                 variant="organization"
                 href={`/control/${org.id}`}
               />
             ))}
          </div>
        ) : (
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
              onClick: handleCreateOrganization
            }}
            secondaryAction={{
              label: 'Clear Filter',
              onClick: () => setFilter('all')
            }}
          />
        )}
      </div>

      {/* Create Organization Modal */}
      <CreateOrganizationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          // Refresh organizations list
          window.location.reload()
        }}
      />
    </div>
  )
}
