'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EntityCard } from '@/components/ui/entity-card'
import { useCampaigns } from '@/hooks/useCampaigns'
import { useState } from 'react'

export default function FlowPage() {
  const { campaigns, isLoading } = useCampaigns()

  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')

  // Filter campaigns based on selected filter
  const filteredCampaigns = campaigns.filter(campaign => {
    if (filter === 'active') return campaign.state === 'ACTIVE'
    if (filter === 'completed') return campaign.state === 'COMPLETED'
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Flow</h1>
          <p className="text-muted-foreground">
            Discover and support game development campaigns
          </p>
        </div>
        <Button>
          Create Campaign
        </Button>
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
          variant={filter === 'completed' ? 'default' : 'outline'}
          onClick={() => setFilter('completed')}
        >
          Completed
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

      {/* Campaigns Grid */}
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
        ) : filteredCampaigns.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCampaigns.map((campaign) => (
              <EntityCard
                key={campaign.id}
                entity={{
                  id: campaign.id,
                  title: campaign.title,
                  description: campaign.description,
                  target: campaign.target,
                  raised: campaign.raised,
                  contributors: campaign.contributorCount,
                  endTime: campaign.expiry,
                  organizationName: campaign.organizationName
                }}
                variant="campaign"
                href={`/flow/${campaign.id}`}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium mb-2">No campaigns found</h3>
            <p className="text-muted-foreground mb-4">
              {filter === 'all'
                ? 'There are no campaigns available at the moment.'
                : `No ${filter} campaigns found. Try changing your filter.`
              }
            </p>
            <Button onClick={() => setFilter('all')}>
              Clear Filter
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
