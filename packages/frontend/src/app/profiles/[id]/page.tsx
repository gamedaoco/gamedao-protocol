'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { useAccount } from 'wagmi'
import Link from 'next/link'
import { useQuery } from '@apollo/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { useReputation } from '@/hooks/useReputation'
import { useUserActivity } from '@/hooks/useUserProfile'
import { useGameDAO } from '@/hooks/useGameDAO'
import { dicebearAvatar } from '@/lib/placeholder'
import { formatTokenAmount } from '@/lib/tokens'
import { formatAddress } from '@/lib/utils'
import { GET_PROFILES } from '@/lib/queries'
import {
  Shield,
  Copy,
  ExternalLink,
  Users,
  Heart,
  Vote,
  FileText,
  Calendar,
  Wallet,
} from 'lucide-react'

// Profile detail page — read-only aggregate view of a user's on-chain
// activity. Identifier in the URL can be either an EVM address (`0x…`)
// or an 8-char Sense profile id; the page resolves the address from
// the profile registry when it isn't an address. Edit flow is a
// follow-up; this rewrite is purely about surfacing what the user has
// done across the protocol so the page stops feeling empty.

const isHexAddress = (s: string) => /^0x[a-fA-F0-9]{40}$/.test(s)

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>()
  const { address: connectedAddress } = useAccount()
  const { contracts, blockExplorer } = useGameDAO()
  const { profiles, isLoading: profilesLoading } = useReputation()
  const [copied, setCopied] = useState(false)

  // Resolve the URL identifier to a canonical address. If the id is an
  // 0x-address we use it directly; otherwise look up the profile by its
  // id in the subgraph and use the owner address. We rely on the
  // profile list already loaded by useReputation rather than firing a
  // dedicated query, so this is a free join.
  const resolved = useMemo(() => {
    if (isHexAddress(id)) {
      const match = profiles.find(p => p.owner.address.toLowerCase() === id.toLowerCase())
      return { address: id.toLowerCase(), profile: match || null }
    }
    const match = profiles.find(p => p.id === id || p.username === id)
    if (match) {
      return { address: match.owner.address.toLowerCase(), profile: match }
    }
    return { address: null as string | null, profile: null }
  }, [id, profiles])

  // Fall back to a direct subgraph lookup when the profile list hasn't
  // loaded yet — useReputation has its own pollInterval, so first paint
  // can race the URL navigation.
  const { data: directProfileData } = useQuery(GET_PROFILES, {
    variables: { first: 1, skip: 0 },
    skip: !!resolved.address || profilesLoading,
    errorPolicy: 'ignore',
  })

  const targetAddress = resolved.address || (directProfileData?.profiles?.[0]?.user?.address as string | undefined)
  const profile = resolved.profile

  const { userActivity, isLoading: activityLoading } = useUserActivity(targetAddress)

  const isOwner = !!connectedAddress && !!targetAddress &&
    connectedAddress.toLowerCase() === targetAddress.toLowerCase()

  const memberships = userActivity?.memberships || []
  const contributions = userActivity?.contributions || []
  const proposals = userActivity?.proposals || []
  const votes = userActivity?.votes || []

  const headerName = profile?.username || (targetAddress ? formatAddress(targetAddress) : id)
  const avatarSeed = profile?.id || targetAddress || id

  const copyAddress = async () => {
    if (!targetAddress) return
    await navigator.clipboard.writeText(targetAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  // Loading skeleton — drops in for the whole page while we don't have
  // an address yet. Avoids flashing 'No profile' for users that exist
  // but whose reputation list is still in flight.
  if (!targetAddress && (profilesLoading || activityLoading)) {
    return (
      <div className="container py-8 space-y-6">
        <div className="flex gap-4 items-start">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (!targetAddress) {
    return (
      <div className="container py-12">
        <Card>
          <CardContent className="text-center py-12">
            <h1 className="text-xl font-semibold mb-2">Profile not found</h1>
            <p className="text-muted-foreground mb-4">No profile or address matches “{id}”.</p>
            <Button asChild variant="outline">
              <Link href="/profiles">Back to profiles</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container py-8 space-y-6">
      {/* Identity header — username (or short address) is the primary
          surface; the wallet address is intentionally NOT shown here.
          It lives in the dedicated 'Connected wallet' card below. */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <Avatar className="h-20 w-20">
          <AvatarImage src={dicebearAvatar(avatarSeed)} />
          <AvatarFallback className="text-xl">
            {headerName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-3xl font-bold truncate">
              {profile?.username ? `@${profile.username}` : headerName}
            </h1>
            {profile?.id && (
              <Badge variant="secondary" className="font-mono text-xs">
                {profile.id}
              </Badge>
            )}
            {isOwner && <Badge variant="outline">You</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {profile?.organization?.name
              ? `Member of ${profile.organization.name}`
              : `${memberships.length} ${memberships.length === 1 ? 'membership' : 'memberships'}`}
          </p>
        </div>
      </div>

      {/* Activity stats — quick read on what this user has done across
          the protocol. Numbers come from the User entity in the
          subgraph (see useUserActivity). */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Users className="h-4 w-4" />} label="Memberships" value={memberships.length} />
        <StatCard icon={<Heart className="h-4 w-4" />} label="Contributions" value={contributions.length} />
        <StatCard icon={<Vote className="h-4 w-4" />} label="Votes cast" value={votes.length} />
        <StatCard icon={<FileText className="h-4 w-4" />} label="Proposals" value={proposals.length} />
      </div>

      {/* Memberships */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" /> Memberships
          </CardTitle>
          <CardDescription>
            Collectives this profile belongs to.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {memberships.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No memberships yet.</p>
          ) : (
            <ul className="divide-y">
              {memberships.map((m: any) => (
                <li key={m.organization.id} className="flex items-center justify-between py-2">
                  <Link href={`/collectives/${m.organization.id}`} className="hover:underline">
                    {m.organization.name}
                  </Link>
                  <Badge variant={m.role === 'PRIME' ? 'default' : 'secondary'} className="text-xs">
                    {m.role?.toLowerCase() || 'member'}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Contributions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-4 w-4" /> Contributions
          </CardTitle>
          <CardDescription>
            Campaigns this profile has backed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {contributions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No contributions yet.</p>
          ) : (
            <ul className="divide-y">
              {contributions.map((c: any) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                  <Link href={`/campaigns/${c.campaign.id}`} className="hover:underline truncate">
                    {c.campaign.title}
                    <span className="text-xs text-muted-foreground ml-2">· {c.campaign.organization?.name}</span>
                  </Link>
                  <span className="text-sm font-mono whitespace-nowrap">
                    {formatTokenAmount(c.amount, c.campaign.paymentToken, contracts)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Proposals authored */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" /> Proposals
          </CardTitle>
          <CardDescription>
            Governance proposals this profile authored.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {proposals.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No proposals authored.</p>
          ) : (
            <ul className="divide-y">
              {proposals.map((p: any) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                  <Link href={`/governance/${p.id}`} className="hover:underline truncate">
                    {p.title}
                    <span className="text-xs text-muted-foreground ml-2">· {p.organization?.name}</span>
                  </Link>
                  <Badge variant="outline" className="text-xs">{p.state?.toLowerCase()}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Connected wallet — the wallet address lives here only,
          intentionally de-emphasised so it isn't the user's identity.
          This card pairs with future profile-visibility controls
          (#77) so the owner can hide it entirely. */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-4 w-4" /> Connected wallet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-3">
            <code className="text-xs bg-muted px-2 py-1 rounded font-mono break-all">
              {targetAddress}
            </code>
            <div className="flex gap-1 flex-shrink-0">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={copyAddress} title="Copy address">
                <Copy className="h-3 w-3" />
                {copied && <span className="sr-only">Copied</span>}
              </Button>
              {blockExplorer && (
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild title="View on explorer">
                  <a href={`${blockExplorer}/address/${targetAddress}`} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              )}
            </div>
          </div>
          {copied && <p className="text-xs text-green-600 mt-2">Address copied.</p>}
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: number }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
          {icon}
          <span>{label}</span>
        </div>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}
