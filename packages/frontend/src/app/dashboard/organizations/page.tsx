'use client'

import { useAccount } from 'wagmi'
import { useOrganizations } from '@/hooks/useOrganizations'
import { useGameDAO } from '@/hooks/useGameDAO'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader } from '@/components/ui/loader'
import { EmptyState } from '@/components/ui/empty-state'
import { formatAddress } from '@/lib/utils'
import Link from 'next/link'

export default function DashboardOrganizationsPage() {
  const { address, isConnected } = useAccount()
  const { contracts } = useGameDAO()
  const { userOrganizations, isUserOrgsLoading, error } = useOrganizations()

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Connect Wallet Required</h2>
              <p className="text-muted-foreground">
                Please connect your wallet to view your organizations.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isUserOrgsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center">
          <Loader />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Error Loading Organizations</h2>
              <p className="text-muted-foreground">
                Failed to load your organizations. Please try again.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (userOrganizations.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <EmptyState
          title="No Organizations"
          description="You haven't joined any organizations yet."
          primaryAction={{
            label: 'Browse Organizations',
            onClick: () => window.location.href = '/control'
          }}
        />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Organizations</h1>
        <p className="text-muted-foreground">
          Organizations you are a member of
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {userOrganizations.map((org) => (
          <Card key={org.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{org.name}</CardTitle>
                <Badge variant={org.state === 1 ? 'default' : 'secondary'}>
                  {org.state === 1 ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Creator:</span>{' '}
                  <span className="text-muted-foreground">
                    {formatAddress(org.creator)}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Members:</span>{' '}
                  <span className="text-muted-foreground">
                    {org.memberCount}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Campaigns:</span>{' '}
                  <span className="text-muted-foreground">
                    {org.totalCampaigns}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Proposals:</span>{' '}
                  <span className="text-muted-foreground">
                    {org.totalProposals}
                  </span>
                </div>
              </div>
              <div className="mt-4">
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/control/${org.id}`}>View Details</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
