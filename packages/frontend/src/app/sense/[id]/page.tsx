'use client'

import { useState, useEffect, use } from 'react'
import { useAccount } from 'wagmi'
import { DetailPageLayout } from '@/components/layout/detail-page-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  User,
  Shield,
  Trophy,
  Star,
  TrendingUp,
  Heart,
  Award,
  Target,
  Edit,
  Save,
  X,
  Copy,
  ExternalLink,
  MessageCircle,
  UserPlus,
  Calendar,
  MapPin,
  Link,
  Github,
  Twitter
} from 'lucide-react'
import { formatAddress } from '@/lib/utils'

interface ProfileData {
  address: string
  username: string | null
  displayName: string | null
  bio: string | null
  location: string | null
  website: string | null
  twitter: string | null
  github: string | null
  verified: boolean
  xp: number
  level: number
  reputation: number
  trust: number
  followers: number
  following: number
  joinedAt: string | null
  profileCreated: boolean
}

interface ProfilePageProps {
  params: { id: string } | Promise<{ id: string }>
}

export default function ProfilePage({ params }: ProfilePageProps) {
  const resolvedParams = params instanceof Promise ? use(params) : params
  const { id } = resolvedParams

  const { address: connectedAddress } = useAccount()
  const [isEditing, setIsEditing] = useState(false)
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [editData, setEditData] = useState<Partial<ProfileData>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  // Determine if the ID is an address or username
  const isAddress = id.startsWith('0x') && id.length === 42
  const profileAddress = isAddress ? id : null

  // Check if connected user owns this profile
  const isOwner = connectedAddress && (
    connectedAddress.toLowerCase() === profileAddress?.toLowerCase() ||
    connectedAddress.toLowerCase() === profileData?.address?.toLowerCase()
  )

  // Mock function to resolve username to address
  const resolveProfile = async (identifier: string) => {
    // TODO: Replace with actual contract calls
    const mockProfiles: { [key: string]: any } = {
      'alice_gamer': {
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        username: 'alice_gamer',
        displayName: 'Alice Cooper',
        bio: 'Gaming enthusiast and DAO contributor building the future of decentralized gaming. Love RPGs and strategy games!',
        location: 'San Francisco, CA',
        website: 'https://alice-gaming.com',
        twitter: 'alice_gamer',
        github: 'alice-cooper',
        verified: true,
        xp: 2450,
        level: 12,
        reputation: 89,
        trust: 94,
        followers: 156,
        following: 89,
        joinedAt: '2024-01-15',
        profileCreated: true,
      },
      '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266': {
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        username: 'alice_gamer',
        displayName: 'Alice Cooper',
        bio: 'Gaming enthusiast and DAO contributor building the future of decentralized gaming. Love RPGs and strategy games!',
        location: 'San Francisco, CA',
        website: 'https://alice-gaming.com',
        twitter: 'alice_gamer',
        github: 'alice-cooper',
        verified: true,
        xp: 2450,
        level: 12,
        reputation: 89,
        trust: 94,
        followers: 156,
        following: 89,
        joinedAt: '2024-01-15',
        profileCreated: true,
      }
    }

    // Default profile for any address
    const defaultProfile = {
      address: isAddress ? identifier : connectedAddress || '0x0000000000000000000000000000000000000000',
      username: null,
      displayName: null,
      bio: null,
      location: null,
      website: null,
      twitter: null,
      github: null,
      verified: false,
      xp: 0,
      level: 1,
      reputation: 0,
      trust: 0,
      followers: 0,
      following: 0,
      joinedAt: null,
      profileCreated: false,
    }

    return mockProfiles[identifier] || defaultProfile
  }

  // Load profile data
  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true)
      try {
        const profile = await resolveProfile(id)
        setProfileData(profile)
        setEditData(profile)
      } catch (error) {
        console.error('Failed to load profile:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadProfile()
  }, [id])

  // Mock achievements and collectibles
  const achievements = [
    { id: 1, name: 'First DAO Creator', description: 'Created your first organization', icon: '🏛️', rarity: 'common', earned: true },
    { id: 2, name: 'Campaign Master', description: 'Successfully funded 5 campaigns', icon: '🎯', rarity: 'rare', earned: true },
    { id: 3, name: 'Community Builder', description: 'Gained 100+ followers', icon: '👥', rarity: 'epic', earned: (profileData?.followers || 0) >= 100 },
    { id: 4, name: 'Governance Expert', description: 'Voted on 50+ proposals', icon: '🗳️', rarity: 'legendary', earned: true },
    { id: 5, name: 'Early Adopter', description: 'Joined in the first month', icon: '⚡', rarity: 'rare', earned: false },
    { id: 6, name: 'Social Butterfly', description: 'Connected with 50+ users', icon: '🦋', rarity: 'common', earned: false },
  ]

  const collectibles = [
    { id: 1, name: 'Genesis DAO Badge', description: 'Early adopter NFT', image: '🏆', collection: 'GameDAO Genesis', tokenId: '#001' },
    { id: 2, name: 'Alpha Tester', description: 'Participated in alpha testing', image: '🧪', collection: 'GameDAO Beta', tokenId: '#042' },
    { id: 3, name: 'Community Champion', description: 'Outstanding community contribution', image: '⭐', collection: 'GameDAO Honors', tokenId: '#123' },
    { id: 4, name: 'Governance Guru', description: 'Active in protocol governance', image: '🗳️', collection: 'GameDAO Governance', tokenId: '#456' },
  ]

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
      case 'rare': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'epic': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'legendary': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
    }
  }

  const copyAddress = async () => {
    if (profileData?.address) {
      await navigator.clipboard.writeText(profileData.address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleSaveProfile = async () => {
    try {
      // TODO: Implement profile update logic with contract calls
      setProfileData({ ...profileData, ...editData, profileCreated: true })
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to save profile:', error)
    }
  }

  const handleCancelEdit = () => {
    setEditData(profileData)
    setIsEditing(false)
  }

  if (isLoading) {
    return (
      <DetailPageLayout
        title="Loading Profile"
        breadcrumbs={[
          { label: 'Sense', href: '/sense' },
          { label: 'Profile', current: true }
        ]}
        loading={true}
      >
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-64 mb-4"></div>
            <div className="h-4 bg-muted rounded w-96"></div>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </DetailPageLayout>
    )
  }

  if (!profileData) {
    return (
      <DetailPageLayout
        title="Profile Not Found"
        breadcrumbs={[
          { label: 'Sense', href: '/sense' },
          { label: 'Profile', current: true }
        ]}
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="text-center">
                <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Profile Not Found</h3>
                <p className="text-muted-foreground">
                  The profile you're looking for doesn't exist or hasn't been claimed yet.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DetailPageLayout>
    )
  }

  return (
    <DetailPageLayout
      title={profileData.displayName ||
             (profileData.username ? `@${profileData.username}` : formatAddress(profileData.address))
            }
      subtitle={profileData.username && profileData.displayName ? `@${profileData.username}` : undefined}
      description={profileData.bio || undefined}
      breadcrumbs={[
        { label: 'Sense', href: '/sense' },
        { label: 'Profile', current: true }
      ]}
      backHref="/sense"
      backLabel="Back to Profiles"
    >
      <div className="space-y-6">
        {/* Profile Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="text-xl">
                {profileData.displayName ?
                  profileData.displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase() :
                  profileData.username ?
                    profileData.username[0].toUpperCase() :
                    formatAddress(profileData.address)[0]
                }
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-3xl font-bold">
                  {profileData.displayName ||
                   (profileData.username ? `@${profileData.username}` : formatAddress(profileData.address))
                  }
                </h1>
                {profileData.verified && <Shield className="h-6 w-6 text-green-600" />}
              </div>

              {profileData.username && profileData.displayName && (
                <p className="text-lg text-muted-foreground mb-2">@{profileData.username}</p>
              )}

              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                <button
                  onClick={copyAddress}
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  <code>{formatAddress(profileData.address)}</code>
                  <Copy className="h-3 w-3" />
                  {copied && <span className="text-green-600">✓</span>}
                </button>
                <Button variant="ghost" size="sm" className="p-0 h-auto" onClick={() => window.open(`https://etherscan.io/address/${profileData.address}`, '_blank')}>
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>

              {profileData.bio && (
                <p className="text-muted-foreground max-w-2xl mb-3">{profileData.bio}</p>
              )}

              {/* Profile Details */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {profileData.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>{profileData.location}</span>
                  </div>
                )}
                {profileData.website && (
                  <div className="flex items-center gap-1">
                    <Link className="h-4 w-4" />
                    <a href={profileData.website} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
                      {profileData.website.replace('https://', '')}
                    </a>
                  </div>
                )}
                {profileData.twitter && (
                  <div className="flex items-center gap-1">
                    <Twitter className="h-4 w-4" />
                    <a href={`https://twitter.com/${profileData.twitter}`} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
                      @{profileData.twitter}
                    </a>
                  </div>
                )}
                {profileData.github && (
                  <div className="flex items-center gap-1">
                    <Github className="h-4 w-4" />
                    <a href={`https://github.com/${profileData.github}`} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
                      {profileData.github}
                    </a>
                  </div>
                )}
                {profileData.joinedAt && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>Joined {new Date(profileData.joinedAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 mt-3 text-sm">
                <span><strong>{profileData.followers}</strong> followers</span>
                <span><strong>{profileData.following}</strong> following</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {isOwner ? (
              <>
                {isEditing ? (
                  <>
                    <Button variant="outline" onClick={handleCancelEdit}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button onClick={handleSaveProfile}>
                      <Save className="h-4 w-4 mr-2" />
                      Save Profile
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setIsEditing(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    {profileData.profileCreated ? 'Edit Profile' : 'Create Profile'}
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button variant="outline" size="sm">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Message
                </Button>
                <Button variant="outline" size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Follow
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Profile Creation/Edit Form (only for owners) */}
        {isOwner && isEditing && (
          <Card>
            <CardHeader>
              <CardTitle>
                {profileData.profileCreated ? 'Edit Profile' : 'Create Your Profile'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="edit-displayName">Display Name</Label>
                  <Input
                    id="edit-displayName"
                    value={editData.displayName || ''}
                    onChange={(e) => setEditData({ ...editData, displayName: e.target.value })}
                    placeholder="Your full name"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-username">Username</Label>
                  <Input
                    id="edit-username"
                    value={editData.username || ''}
                    onChange={(e) => setEditData({ ...editData, username: e.target.value })}
                    placeholder="your_username"
                    disabled={profileData.username} // Can't change once set
                  />
                  {profileData.username && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Username cannot be changed once claimed
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="edit-bio">Bio</Label>
                <Textarea
                  id="edit-bio"
                  value={editData.bio || ''}
                  onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                  placeholder="Tell us about yourself..."
                  rows={3}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="edit-location">Location</Label>
                  <Input
                    id="edit-location"
                    value={editData.location || ''}
                    onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                    placeholder="City, Country"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-website">Website</Label>
                  <Input
                    id="edit-website"
                    value={editData.website || ''}
                    onChange={(e) => setEditData({ ...editData, website: e.target.value })}
                    placeholder="https://your-website.com"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="edit-twitter">Twitter</Label>
                  <Input
                    id="edit-twitter"
                    value={editData.twitter || ''}
                    onChange={(e) => setEditData({ ...editData, twitter: e.target.value })}
                    placeholder="username"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-github">GitHub</Label>
                  <Input
                    id="edit-github"
                    value={editData.github || ''}
                    onChange={(e) => setEditData({ ...editData, github: e.target.value })}
                    placeholder="username"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Show profile content only if profile exists or is being created */}
        {(profileData.profileCreated || (isOwner && isEditing)) && (
          <>
            {/* Stats Overview */}
            <div className="grid gap-6 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Level</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{profileData.level}</div>
                  <p className="text-xs text-muted-foreground">{profileData.xp.toLocaleString()} XP</p>
                  <Progress value={(profileData.xp % 250) / 250 * 100} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Reputation</CardTitle>
                  <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{profileData.reputation}</div>
                  <p className="text-xs text-muted-foreground">Out of 100</p>
                  <Progress value={profileData.reputation} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Trust Score</CardTitle>
                  <Heart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{profileData.trust}</div>
                  <p className="text-xs text-muted-foreground">Community rating</p>
                  <Progress value={profileData.trust} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Achievements</CardTitle>
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{achievements.filter(a => a.earned).length}</div>
                  <p className="text-xs text-muted-foreground">Unlocked</p>
                </CardContent>
              </Card>
            </div>

            {/* Achievements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Achievements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {achievements.map((achievement) => (
                    <div
                      key={achievement.id}
                      className={`p-4 rounded-lg border ${
                        achievement.earned ? 'bg-background' : 'bg-muted/50 opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">{achievement.icon}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{achievement.name}</h4>
                            <Badge className={getRarityColor(achievement.rarity)} variant="secondary">
                              {achievement.rarity}
                            </Badge>
                            {achievement.earned && <Award className="h-4 w-4 text-yellow-500" />}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {achievement.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Collectibles */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  NFT Collectibles
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  {collectibles.map((collectible) => (
                    <div key={collectible.id} className="p-4 rounded-lg border bg-background">
                      <div className="text-center">
                        <div className="text-4xl mb-2">{collectible.image}</div>
                        <h4 className="font-medium">{collectible.name}</h4>
                        <p className="text-xs text-muted-foreground mb-2">
                          {collectible.collection}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {collectible.tokenId}
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-2">
                          {collectible.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Profile Not Created State */}
        {!profileData.profileCreated && !isOwner && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Profile Not Created</h3>
                <p className="text-muted-foreground">
                  This user hasn't created their profile yet.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DetailPageLayout>
  )
}
