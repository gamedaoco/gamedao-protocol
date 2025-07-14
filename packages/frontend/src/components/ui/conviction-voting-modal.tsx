'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
// import { Slider } from '@/components/ui/slider' // TODO: Add slider component
import { CheckCircle, XCircle, Pause, Clock, TrendingUp } from 'lucide-react'

interface ConvictionVotingModalProps {
  isOpen: boolean
  onClose: () => void
  proposalId: string
  proposalTitle: string
  onVote: (choice: 0 | 1 | 2, convictionTime: number, reason: string) => Promise<void>
  isVoting: boolean
}

export function ConvictionVotingModal({
  isOpen,
  onClose,
  // proposalId, // Currently unused but may be needed for future features
  proposalTitle,
  onVote,
  isVoting
}: ConvictionVotingModalProps) {
  const [choice, setChoice] = useState<0 | 1 | 2 | null>(null)
  const [convictionDays, setConvictionDays] = useState([7]) // Default 7 days
  const [reason, setReason] = useState('')
  const [useConviction, setUseConviction] = useState(false)

  // Calculate conviction multiplier (simplified version of contract logic)
  const calculateMultiplier = (days: number): number => {
    if (days === 0) return 1
    const multiplier = 1 + (days / 30) // Up to 3x max
    return Math.min(multiplier, 3)
  }

  const currentMultiplier = useConviction ? calculateMultiplier(convictionDays[0]) : 1
  const convictionTimeSeconds = useConviction ? convictionDays[0] * 24 * 60 * 60 : 0

  const handleVote = async () => {
    if (choice === null) return

    try {
      await onVote(choice, convictionTimeSeconds, reason)
      onClose()
      // Reset form
      setChoice(null)
      setUseConviction(false)
      setConvictionDays([7])
      setReason('')
    } catch (error) {
      console.error('Error voting:', error)
    }
  }

  const getChoiceIcon = (voteChoice: 0 | 1 | 2) => {
    switch (voteChoice) {
      case 1: return <CheckCircle className="h-4 w-4" />
      case 0: return <XCircle className="h-4 w-4" />
      case 2: return <Pause className="h-4 w-4" />
    }
  }

  const getChoiceColor = (voteChoice: 0 | 1 | 2) => {
    switch (voteChoice) {
      case 1: return 'bg-green-500 hover:bg-green-600'
      case 0: return 'bg-red-500 hover:bg-red-600'
      case 2: return 'bg-gray-500 hover:bg-gray-600'
    }
  }

  const getChoiceLabel = (voteChoice: 0 | 1 | 2) => {
    switch (voteChoice) {
      case 1: return 'For'
      case 0: return 'Against'
      case 2: return 'Abstain'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Cast Your Vote
          </DialogTitle>
          <DialogDescription>
            Vote on &quot;{proposalTitle}&quot; with optional conviction voting for increased impact.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Vote Choice */}
          <div className="space-y-3">
            <Label>Your Vote</Label>
            <div className="grid grid-cols-3 gap-2">
              {([1, 0, 2] as const).map((voteChoice) => (
                <Button
                  key={voteChoice}
                  variant={choice === voteChoice ? 'default' : 'outline'}
                  className={choice === voteChoice ? getChoiceColor(voteChoice) : ''}
                  onClick={() => setChoice(voteChoice)}
                >
                  {getChoiceIcon(voteChoice)}
                  <span className="ml-1">{getChoiceLabel(voteChoice)}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Conviction Voting Toggle */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Conviction Voting</Label>
              <Button
                variant={useConviction ? 'default' : 'outline'}
                size="sm"
                onClick={() => setUseConviction(!useConviction)}
              >
                {useConviction ? 'Enabled' : 'Disabled'}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Lock your tokens for a period to increase your voting power
            </p>
          </div>

          {/* Conviction Time Slider */}
          {useConviction && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Conviction Period</Label>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {convictionDays[0]} days
                </Badge>
              </div>

              <Input
                type="range"
                value={convictionDays[0]}
                onChange={(e) => setConvictionDays([parseInt(e.target.value)])}
                min={1}
                max={90}
                step={1}
                className="w-full"
              />

              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1 day</span>
                <span>90 days</span>
              </div>

              {/* Multiplier Display */}
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Voting Power Multiplier</span>
                  <Badge variant="secondary" className="text-lg">
                    {currentMultiplier.toFixed(2)}x
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Your vote will be worth {currentMultiplier.toFixed(2)}x normal voting power
                </p>
              </div>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (Optional)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain your vote..."
              rows={3}
            />
          </div>

          {/* Vote Summary */}
          {choice !== null && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <h4 className="font-medium">Vote Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Choice:</span>
                  <Badge variant="outline">{getChoiceLabel(choice)}</Badge>
                </div>
                {useConviction && (
                  <>
                    <div className="flex justify-between">
                      <span>Conviction Period:</span>
                      <span>{convictionDays[0]} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Power Multiplier:</span>
                      <span>{currentMultiplier.toFixed(2)}x</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleVote}
              disabled={choice === null || isVoting}
              className="flex-1"
            >
              {isVoting ? 'Voting...' : 'Cast Vote'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
