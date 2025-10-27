'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useGameDAO } from '@/hooks/useGameDAO'
import { useQuery } from '@apollo/client'
import { GET_MODULES } from '@/lib/queries'
import { keccak256, stringToBytes } from 'viem'
import { cn } from '@/lib/utils'

const navigation = [
  {
    name: 'Organizations',
    icon: '🏛️',
    description: 'DAO Management',
    badge: 'Active',
    children: [
      { name: 'All Organizations', href: '/control', icon: '🏢' },
      { name: 'Create DAO', href: '/control/create', icon: '➕' },
      { name: 'My Organizations', href: '/control/my-orgs', icon: '👥' },
      { name: 'Claim Name', href: '/control/claim-name', icon: '🏷️' },
      { name: 'Treasury', href: '/control/treasury', icon: '💰' },
    ]
  },
  {
    name: 'Governance',
    icon: '🗳️',
    description: 'Proposals & Voting',
    badge: 'Active',
    children: [
      { name: 'All Proposals', href: '/signal', icon: '📋' },
      { name: 'Create Proposal', href: '/signal/create', icon: '✍️' },
      { name: 'My Votes', href: '/signal/voting', icon: '🗳️' },
      { name: 'Delegation', href: '/signal/delegation', icon: '🤝' },
    ]
  },
  {
    name: 'Staking',
    icon: '🪙',
    description: 'Earn Rewards',
    badge: 'Active',
    children: [
      { name: 'Dashboard', href: '/staking', icon: '📊' },
      { name: 'Pools', href: '/staking/pools', icon: '🏊' },
      { name: 'Rewards', href: '/staking/rewards', icon: '🎁' },
      { name: 'History', href: '/staking/history', icon: '📜' },
    ]
  },
  {
    name: 'Campaigns',
    icon: '💸',
    description: 'Crowdfunding',
    badge: 'Active',
    children: [
      { name: 'All Campaigns', href: '/flow', icon: '🎯' },
      { name: 'Create Campaign', href: '/flow/create', icon: '🚀' },
      { name: 'My Contributions', href: '/flow/contributions', icon: '💝' },
      { name: 'Analytics', href: '/flow/analytics', icon: '📊' },
    ]
  },
  {
    name: 'Profiles',
    icon: '👤',
    description: 'Identity & Reputation',
    badge: 'Active',
    children: [
      { name: 'My Profile', href: '/sense', icon: '🆔' },
      { name: 'Create Profile', href: '/sense/create', icon: '➕' },
      { name: 'Claim Name', href: '/sense/claim-name', icon: '🏷️' },
      { name: 'Achievements', href: '/sense/achievements', icon: '🏆' },
      { name: 'Reputation', href: '/sense/reputation', icon: '⭐' },
    ]
  }
]

export function Sidebar() {
  const pathname = usePathname()
  const { isConnected } = useGameDAO()
  const { data: modulesData } = useQuery(GET_MODULES, { pollInterval: 5000, errorPolicy: 'ignore' })

  const enabled = new Set<string>((modulesData?.modules || [])
    .filter((m: any) => m.enabled)
    .map((m: any) => m.id))

  // Map module sections to module IDs in Registry (keccak256 of names)
  const sectionToModuleId: Record<string, string> = {
    'Organizations': keccak256(stringToBytes('CONTROL')),
    'Governance': keccak256(stringToBytes('SIGNAL')),
    'Staking': keccak256(stringToBytes('STAKING')),
    'Campaigns': keccak256(stringToBytes('FLOW')),
    'Profiles': keccak256(stringToBytes('SENSE')),
  }

  return (
    <div className="w-64 border-r glass-strong">
      <div className="flex h-full flex-col">
        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {navigation.map((item) => (
            <div key={item.name}>
              {/* Module with children */}
              <div className="space-y-1">
                <div className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center space-x-2">
                    <span>{item.icon}</span>
                    <div>
                      <div className="font-medium text-sm">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{item.description}</div>
                    </div>
                  </div>
                  {(() => {
                    const modId = sectionToModuleId[item.name] || ''
                    const isEnabled = modId ? enabled.has(modId) : true
                    return (
                      <Badge
                        variant={isEnabled ? 'default' : 'outline'}
                        className="text-xs"
                      >
                        {isEnabled ? 'Active' : 'Disabled'}
                      </Badge>
                    )
                  })()}
                </div>

                {/* Child pages */}
                {item.children && (
                  <div className="ml-4 space-y-1">
                    {item.children.map((child) => (
                      <Link key={child.href} href={child.href}>
                        <Button
                          variant={pathname === child.href ? "secondary" : "ghost"}
                          className={cn(
                            "w-full justify-start text-sm",
                            ((!isConnected) || (() => { const modId = sectionToModuleId[item.name] || ''; return !!(modId && !enabled.has(modId)) })()) && "opacity-50 cursor-not-allowed"
                          )}
                          disabled={(!isConnected) || (() => { const modId = sectionToModuleId[item.name] || ''; return !!(modId && !enabled.has(modId)) })()}
                        >
                          <span className="mr-2">{child.icon}</span>
                          {child.name}
                        </Button>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </nav>

        {/* Connection Status */}
        <div className="border-t/50 p-4">
          <div className="text-xs text-muted-foreground">
            {isConnected ? (
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                  <span>Connected</span>
                </div>
                <div>Ready to interact with GameDAO Protocol</div>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
                  <span>Not Connected</span>
                </div>
                <div>Connect wallet to access modules</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
