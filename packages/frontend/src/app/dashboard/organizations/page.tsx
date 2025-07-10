'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useGameDAO } from '@/hooks/useGameDAO'
import { useAccount } from 'wagmi'
import { Users, ExternalLink, Plus } from 'lucide-react'
import Link from 'next/link'

interface Organization {
  id: string
  name: string
  description: string
  creator?: string
  members?: string[]
}

export default function DashboardOrganizationsPage() {
  const { address, isConnected } = useAccount()
  const { contracts } = useGameDAO()

  const [myOrganizations, setMyOrganizations] = useState<Organization[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadMyOrganizations = useCallback(async () => {
    if (!contracts || !address) return

    setIsLoading(true)
    try {
      // Load scaffold data to show user's organizations
      const response = await fetch('/api/scaffold-data')
      if (response.ok) {
        const data = await response.json()

        // Filter organizations where user is a member
        const userOrgs = data.daos?.filter((dao: Organization) =>
          dao.members?.some((member: string) =>
            member.toLowerCase() === address.toLowerCase()
          )
        ) || []

        setMyOrganizations(userOrgs)
      }
    } catch (error) {
      console.error('Failed to load organizations:', error)
    } finally {
      setIsLoading(false)
    }
  }, [contracts, address])

  useEffect(() => {
    if (isConnected && contracts && address) {
      loadMyOrganizations()
    }
  }, [isConnected, contracts, address, loadMyOrganizations])

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

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Organizations</h1>
          <p className="text-muted-foreground">
            Organizations where you are a member
          </p>
        </div>
        <Link href="/control/create">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Organization
          </Button>
        </Link>
      </div>

      {/* Organizations Grid */}
      {myOrganizations.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-2xl font-bold mb-4">No Organizations Yet</h2>
              <p className="text-muted-foreground mb-6">
                You&apos;re not a member of any organizations yet. Join existing ones or create your own!
              </p>
              <div className="flex gap-4 justify-center">
                <Link href="/control">
                  <Button variant="outline">Browse Organizations</Button>
                </Link>
                <Link href="/control/create">
                  <Button>Create Organization</Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myOrganizations.map((org) => (
            <Card key={org.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{org.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {org.description}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col gap-1">
                    {org.creator?.toLowerCase() === address?.toLowerCase() && (
                      <Badge variant="default" className="text-xs">
                        Creator
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Member Info */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>{org.members?.length || 0} members</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Member
                    </Badge>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Link href={`/control/${org.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Stats */}
      {myOrganizations.length > 0 && (
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold">{myOrganizations.length}</div>
                <div className="text-muted-foreground">Organizations</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {myOrganizations.filter(org =>
                    org.creator?.toLowerCase() === address?.toLowerCase()
                  ).length}
                </div>
                <div className="text-muted-foreground">Created by You</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {myOrganizations.reduce((sum, org) => sum + (org.members?.length || 0), 0)}
                </div>
                <div className="text-muted-foreground">Total Members</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
