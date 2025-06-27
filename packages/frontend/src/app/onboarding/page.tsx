'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Camera,
  CheckCircle,
  ArrowRight,
  ArrowLeft
} from 'lucide-react'
import { useGameDAO } from '@/hooks/useGameDAO'
import { redirect } from 'next/navigation'
import { useEffect } from 'react'
import { useAccount } from 'wagmi'
import { Gamepad2, Shield, Trophy } from 'lucide-react'

export default function OnboardingPage() {
  const { isConnected, address } = useGameDAO()
  const [step, setStep] = useState(1)
  const [profile, setProfile] = useState({
    username: '',
    displayName: '',
    bio: '',
    avatar: '',
    interests: [] as string[]
  })

  // Redirect to home if not connected
  useEffect(() => {
    if (!isConnected) {
      redirect('/')
    }
  }, [isConnected])

  if (!isConnected) {
    return null
  }

  const handleNext = () => {
    if (step < 3) setStep(step + 1)
  }

  const handlePrev = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleComplete = () => {
    // TODO: Save profile to backend
    redirect('/dashboard')
  }

  const interestOptions = [
    'Game Development', 'Esports', 'NFT Gaming', 'DeFi', 'Metaverse',
    'Indie Games', 'Mobile Gaming', 'VR/AR', 'Blockchain Gaming'
  ]

  const toggleInterest = (interest: string) => {
    setProfile(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }))
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center justify-center space-x-4">
        {[1, 2, 3].map((stepNum) => (
          <div key={stepNum} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= stepNum
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}>
              {step > stepNum ? <CheckCircle className="h-4 w-4" /> : stepNum}
            </div>
            {stepNum < 3 && (
              <div className={`w-12 h-0.5 mx-2 ${
                step > stepNum ? 'bg-primary' : 'bg-muted'
              }`} />
            )}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader className="text-center">
          <CardTitle>
            {step === 1 && 'Welcome to GameDAO!'}
            {step === 2 && 'Tell us about yourself'}
            {step === 3 && 'Choose your interests'}
          </CardTitle>
          <CardDescription>
            {step === 1 && 'Let\'s set up your profile to get started'}
            {step === 2 && 'Help others discover and connect with you'}
            {step === 3 && 'Select areas that interest you most'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="relative">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={profile.avatar} />
                    <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-2xl">
                      {profile.displayName?.charAt(0) || address?.slice(2, 3).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0"
                  >
                    <Camera className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    placeholder="Choose a unique username"
                    value={profile.username}
                                         onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfile(prev => ({ ...prev, username: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This will be your unique identifier (e.g., gamedao.app/@{profile.username || 'username'})
                  </p>
                </div>

                <div>
                  <Label htmlFor="displayName">Display Name *</Label>
                  <Input
                    id="displayName"
                    placeholder="Your display name"
                    value={profile.displayName}
                                         onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfile(prev => ({ ...prev, displayName: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Bio */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell us about yourself, your gaming interests, and what you're looking to accomplish..."
                  value={profile.bio}
                                     onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {profile.bio.length}/500 characters
                </p>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Preview</h4>
                <div className="flex items-start space-x-3">
                  <Avatar>
                    <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                      {profile.displayName?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{profile.displayName || 'Your Name'}</p>
                    <p className="text-sm text-muted-foreground">@{profile.username || 'username'}</p>
                    <p className="text-sm mt-1">{profile.bio || 'Your bio will appear here...'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Interests */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-4">
                  Select the areas that interest you most. This helps us personalize your experience.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {interestOptions.map((interest) => (
                    <Badge
                      key={interest}
                      variant={profile.interests.includes(interest) ? 'default' : 'outline'}
                      className="cursor-pointer p-3 justify-center"
                      onClick={() => toggleInterest(interest)}
                    >
                      {interest}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Selected: {profile.interests.length} interests
                </p>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Profile Summary</h4>
                <div className="space-y-2">
                  <p><span className="font-medium">Username:</span> @{profile.username}</p>
                  <p><span className="font-medium">Display Name:</span> {profile.displayName}</p>
                  <p><span className="font-medium">Bio:</span> {profile.bio || 'No bio provided'}</p>
                  <div>
                    <span className="font-medium">Interests:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {profile.interests.map((interest) => (
                        <Badge key={interest} variant="secondary" className="text-xs">
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={step === 1}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            {step < 3 ? (
              <Button
                onClick={handleNext}
                disabled={
                  (step === 1 && (!profile.username || !profile.displayName)) ||
                  (step === 2 && profile.bio.length > 500)
                }
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleComplete}>
                Complete Setup
                <CheckCircle className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
