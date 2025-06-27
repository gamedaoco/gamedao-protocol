'use client'

import { use } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { DetailPageLayout } from '@/components/layout/detail-page-layout'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { EmptyState } from '@/components/ui/empty-state'
import { useProfile } from '@/hooks/useReputation'
import {
  Star,
  Trophy,
  Users,
  Calendar,
  Globe,
  Shield,
  Heart,
  MessageCircle,
  Award,
  TrendingUp,
  Target,
  Zap
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface ProfileDetailPageProps {
  params: Promise<{ id: string }>
}

export default function ProfileDetailPage({ params }: ProfileDetailPageProps) {
  const { id } = use(params)
  const { profile, isLoading, error, refetch } = useProfile(id)

  // Loading state
  if (isLoading) {
    return (
      <DetailPageLayout
        title="Loading Profile..."
        breadcrumbs={[
          { label: 'Sense', href: '/sense' },
          { label: 'Profiles', href: '/sense' },
          { label: 'Loading...', current: true }
        ]}
        loading={true}
      >
        <div>Loading profile details...</div>
      </DetailPageLayout>
    )
  }

  // Error state
  if (error) {
    return (
      <DetailPageLayout
        title="Error"
        breadcrumbs={[
          { label: 'Sense', href: '/sense' },
          { label: 'Profiles', href: '/sense' },
          { label: 'Error', current: true }
        ]}
      >
        <EmptyState
          title="Error Loading Profile"
          description={typeof error === 'string' ? error : 'An error occurred while loading the profile'}
          primaryAction={{
            label: 'Try Again',
            onClick: () => refetch()
          }}
        />
      </DetailPageLayout>
    )
  }

  // Not found state
  if (!profile) {
    return (
      <DetailPageLayout
        title="Profile Not Found"
        breadcrumbs={[
          { label: 'Sense', href: '/sense' },
          { label: 'Profiles', href: '/sense' },
          { label: 'Not Found', current: true }
        ]}
        backHref="/sense"
      >
        <EmptyState
          title="Profile not found"
          description="The profile you're looking for doesn't exist or may have been removed."
          primaryAction={{
            label: 'Browse Profiles',
            onClick: () => window.location.href = '/sense'
          }}
        />
      </DetailPageLayout>
    )
  }

  // Calculate profile metrics
  const reputationLevel = Math.floor(profile.reputation / 1000) + 1
  const nextLevelReputation = reputationLevel * 1000
  const progressToNextLevel = ((profile.reputation % 1000) / 1000) * 100
  const trustRating = profile.trustScore / 100 // Convert to percentage

  // Get verification badge
  const getVerificationBadge = () => {
    if (profile.verificationLevel >= 5) return { label: 'Verified Pro', color: 'bg-purple-100 text-purple-800', icon: <Shield className="h-3 w-3" /> }
    if (profile.verificationLevel >= 3) return { label: 'Verified', color: 'bg-blue-100 text-blue-800', icon: <Shield className="h-3 w-3" /> }
    if (profile.verificationLevel >= 1) return { label: 'Basic', color: 'bg-green-100 text-green-800', icon: <Shield className="h-3 w-3" /> }
    return { label: 'Unverified', color: 'bg-gray-100 text-gray-800', icon: <Shield className="h-3 w-3" /> }
  }

  const verification = getVerificationBadge()

  return (
    <ErrorBoundary>
      <DetailPageLayout
        title={profile.username}
        subtitle={profile.bio || 'GameDAO Community Member'}
        breadcrumbs={[
          { label: 'Sense', href: '/sense' },
          { label: 'Profiles', href: '/sense' },
          { label: profile.username, current: true }
        ]}
        backHref="/sense"
        status={{
          label: verification.label,
          variant: 'default',
          color: verification.color
        }}
        metadata={[
          {
            label: 'Organization',
            value: profile.organization.name,
            icon: <Users className="h-4 w-4" />
          },
          {
            label: 'Member Since',
            value: formatDistanceToNow(new Date(profile.createdAt * 1000), { addSuffix: true }),
            icon: <Calendar className="h-4 w-4" />
          },
          {
            label: 'Reputation Level',
            value: reputationLevel.toString(),
            icon: <Star className="h-4 w-4" />
          },
          {
            label: 'Achievements',
            value: profile.achievementCount.toString(),
            icon: <Trophy className="h-4 w-4" />
          }
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <MessageCircle className="h-4 w-4 mr-2" />
              Message
            </Button>
            <Button variant="outline" size="sm">
              <Heart className="h-4 w-4 mr-2" />
              Follow
            </Button>
          </div>
        }
      >
        <div className="space-y-8">
          {/* Profile Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Profile Card */}
            <div className="lg:col-span-2 space-y-6">
              {/* Profile Header */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start space-x-6">
                    <Avatar className="w-24 h-24">
                      <AvatarImage src={profile.avatar || undefined} />
                      <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-2xl">
                        {profile.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 space-y-4">
                      <div>
                        <div className="flex items-center space-x-3 mb-2">
                          <h2 className="text-2xl font-bold">{profile.username}</h2>
                          <Badge className={`${verification.color} flex items-center space-x-1`}>
                            {verification.icon}
                            <span>{verification.label}</span>
                          </Badge>
                        </div>
                        <p className="text-muted-foreground font-mono text-sm">
                          {profile.owner.address}
                        </p>
                        {profile.website && (
                          <div className="flex items-center space-x-2 mt-2">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            <a
                              href={profile.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline text-sm"
                            >
                              {profile.website}
                            </a>
                          </div>
                        )}
                      </div>

                      <div>
                        <p className="text-sm leading-relaxed">
                          {profile.bio || 'This user hasn\'t added a bio yet.'}
                        </p>
                      </div>

                      {/* Reputation Progress */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">Level {reputationLevel}</span>
                          <span className="text-muted-foreground">
                            {profile.reputation.toLocaleString()} / {nextLevelReputation.toLocaleString()} XP
                          </span>
                        </div>
                        <Progress value={progressToNextLevel} className="h-2" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Star className="h-5 w-5 text-yellow-500" />
                    </div>
                    <div className="text-2xl font-bold">{profile.reputation.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Reputation</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                    </div>
                    <div className="text-2xl font-bold">{profile.experience.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Experience</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Target className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="text-2xl font-bold">{trustRating.toFixed(0)}%</div>
                    <div className="text-xs text-muted-foreground">Trust Score</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Zap className="h-5 w-5 text-purple-500" />
                    </div>
                    <div className="text-2xl font-bold">{profile.convictionScore}</div>
                    <div className="text-xs text-muted-foreground">Conviction</div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Achievements */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Trophy className="h-5 w-5" />
                    <span>Recent Achievements</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {profile.achievements && profile.achievements.length > 0 ? (
                    <div className="space-y-3">
                      {profile.achievements.slice(0, 5).map((achievement: any) => (
                        <div key={achievement.id} className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                          <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                            <Award className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">{achievement.title}</h4>
                            <p className="text-sm text-muted-foreground">{achievement.description}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant="secondary" className="text-xs">
                                {achievement.category}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                +{achievement.points} points
                              </span>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(achievement.timestamp * 1000), { addSuffix: true })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-medium mb-2">No achievements yet</h3>
                      <p className="text-sm text-muted-foreground">
                        This user hasn't earned any achievements yet.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Feedback Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Community Feedback</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Feedback</span>
                    <span className="font-bold">{profile.feedbackCount}</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-green-600">Positive</span>
                      <span className="text-sm font-medium">{profile.positiveFeedbacks}</span>
                    </div>
                    <Progress
                      value={profile.feedbackCount > 0 ? (profile.positiveFeedbacks / profile.feedbackCount) * 100 : 0}
                      className="h-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-red-600">Negative</span>
                      <span className="text-sm font-medium">{profile.negativeFeedbacks}</span>
                    </div>
                    <Progress
                      value={profile.feedbackCount > 0 ? (profile.negativeFeedbacks / profile.feedbackCount) * 100 : 0}
                      className="h-2"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Activity Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-muted-foreground">
                        Profile updated {formatDistanceToNow(new Date(profile.updatedAt * 1000), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-muted-foreground">
                        Joined {formatDistanceToNow(new Date(profile.createdAt * 1000), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Organization */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Organization</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium">{profile.organization.name}</h4>
                      <p className="text-sm text-muted-foreground">Member organization</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Recent Feedback */}
          {profile.feedbacksReceived && profile.feedbacksReceived.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Feedback</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {profile.feedbacksReceived.slice(0, 3).map((feedback: any) => (
                    <div key={feedback.id} className="border-l-4 border-l-primary/20 pl-4 py-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium text-sm">
                              {feedback.author.username || `User ${feedback.author.id.slice(0, 8)}`}
                            </span>
                            <Badge
                              variant={feedback.feedbackType === 'POSITIVE' ? 'default' : 'destructive'}
                              className="text-xs"
                            >
                              {feedback.feedbackType}
                            </Badge>
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-3 w-3 ${
                                    i < feedback.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">{feedback.comment}</p>
                        </div>
                        <span className="text-xs text-muted-foreground ml-4">
                          {formatDistanceToNow(new Date(feedback.timestamp * 1000), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DetailPageLayout>
    </ErrorBoundary>
  )
}
