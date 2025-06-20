'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useUserRegistration } from '@/hooks/useUserRegistration'
import { useGameDAO } from '@/hooks/useGameDAO'
import { formatAddress } from '@/lib/utils'

interface UserRegistrationModalProps {
  isOpen: boolean
  onClose: () => void
}

export function UserRegistrationModal({ isOpen, onClose }: UserRegistrationModalProps) {
  const { address, networkName } = useGameDAO()
  const { registerUser, isLoading, error } = useUserRegistration()
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    avatar: ''
  })

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      alert('Please enter a name')
      return
    }

    try {
      await registerUser(formData)
      onClose()
    } catch (err) {
      console.error('Registration failed:', err)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle>Welcome to GameDAO</CardTitle>
          <CardDescription>
            Create your profile to start participating in gaming DAOs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connection Info */}
          <div className="bg-muted p-3 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span>Connected Account:</span>
              <Badge variant="secondary">{formatAddress(address!)}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span>Network:</span>
              <Badge variant="outline">{networkName}</Badge>
            </div>
          </div>

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                Display Name *
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter your display name"
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
                required
              />
            </div>

            <div>
              <label htmlFor="bio" className="block text-sm font-medium mb-1">
                Bio
              </label>
              <textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                placeholder="Tell us about yourself (optional)"
                rows={3}
                className="w-full px-3 py-2 border border-input rounded-md bg-background resize-none"
              />
            </div>

            <div>
              <label htmlFor="avatar" className="block text-sm font-medium mb-1">
                Avatar URL
              </label>
              <input
                id="avatar"
                type="url"
                value={formData.avatar}
                onChange={(e) => setFormData(prev => ({ ...prev, avatar: e.target.value }))}
                placeholder="https://example.com/avatar.jpg (optional)"
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
              />
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                {error}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isLoading || !formData.name.trim()}
              >
                {isLoading ? 'Creating Profile...' : 'Create Profile'}
              </Button>
            </div>
          </form>

          {/* Info */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Your profile will be stored on-chain via the Sense module</p>
            <p>• You can update your profile information anytime</p>
            <p>• Your reputation will be tracked across all GameDAO organizations</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
