'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useGameDAO } from '@/hooks/useGameDAO'
import { useModules } from '@/hooks/useModules'
import { keccak256, stringToBytes } from 'viem'
import { cn } from '@/lib/utils'

const navigation = [
  {
    name: 'Organizations',
    icon: '🏛️',
    description: 'DAO Management',
    badge: 'Active',
    children: [
      { name: 'All Organizations', href: '/collectives', icon: '🏢' },
      { name: 'Create DAO', href: '/collectives/create', icon: '➕' },
      { name: 'My Organizations', href: '/collectives/my-orgs', icon: '👥' },
      { name: 'Claim Name', href: '/collectives/claim-name', icon: '🏷️' },
      { name: 'Treasury', href: '/collectives/treasury', icon: '💰' },
    ]
  },
  {
    name: 'Governance',
    icon: '🗳️',
    description: 'Proposals & Voting',
    badge: 'Active',
    children: [
      { name: 'All Proposals', href: '/governance', icon: '📋' },
      { name: 'Create Proposal', href: '/governance/create', icon: '✍️' },
      { name: 'My Votes', href: '/governance/voting', icon: '🗳️' },
      { name: 'Delegation', href: '/governance/delegation', icon: '🤝' },
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
      { name: 'All Campaigns', href: '/campaigns', icon: '🎯' },
      { name: 'Create Campaign', href: '/campaigns/create', icon: '🚀' },
      { name: 'My Contributions', href: '/campaigns/contributions', icon: '💝' },
      { name: 'Analytics', href: '/campaigns/analytics', icon: '📊' },
    ]
  },
  {
    name: 'Profiles',
    icon: '👤',
    description: 'Identity & Reputation',
    badge: 'Active',
    children: [
      { name: 'My Profile', href: '/profiles', icon: '🆔' },
      { name: 'Create Profile', href: '/profiles/create', icon: '➕' },
      { name: 'Claim Name', href: '/profiles/claim-name', icon: '🏷️' },
      { name: 'Achievements', href: '/profiles/achievements', icon: '🏆' },
      { name: 'Reputation', href: '/profiles/reputation', icon: '⭐' },
    ]
  }
]

export function Sidebar() {
  const pathname = usePathname()
  const { isConnected } = useGameDAO()
  const { enabled } = useModules()

  // Map nav sections to Registry-managed module IDs. Sections not in this map
  // default to enabled (e.g. Staking is a standalone contract, not a module).
  const sectionToModuleId: Record<string, string> = {
    'Organizations': keccak256(stringToBytes('CONTROL')),
    'Governance': keccak256(stringToBytes('SIGNAL')),
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
                        variant={isEnabled ? 'glass' : 'glass'}
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
                <div>Sign in to access modules</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
