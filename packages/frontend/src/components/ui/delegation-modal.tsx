'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Users, ArrowRight, Minus, Plus } from 'lucide-react'

interface DelegationModalProps {
  isOpen: boolean
  onClose: () => void
  onDelegate: (delegatee: string, amount: number) => Promise<void>
  onUndelegate: (delegatee: string, amount: number) => Promise<void>
  isDelegating: boolean
  currentVotingPower: number
}

export function DelegationModal({
  isOpen,
  onClose,
  onDelegate,
  onUndelegate,
  isDelegating,
  currentVotingPower
}: DelegationModalProps) {
  const [mode, setMode] = useState<'delegate' | 'undelegate'>('delegate')
  const [delegateeAddress, setDelegateeAddress] = useState('')
  const [amount, setAmount] = useState('')

  const handleSubmit = async () => {
    if (!delegateeAddress || !amount) return

    try {
      const amountNum = parseInt(amount)
      if (mode === 'delegate') {
        await onDelegate(delegateeAddress, amountNum)
      } else {
        await onUndelegate(delegateeAddress, amountNum)
      }
      onClose()
      // Reset form
      setDelegateeAddress('')
      setAmount('')
    } catch (error) {
      console.error('Error with delegation:', error)
    }
  }

  const isValidAddress = delegateeAddress.length === 42 && delegateeAddress.startsWith('0x')
  const isValidAmount = amount && parseInt(amount) > 0 && parseInt(amount) <= currentVotingPower

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Voting Power Delegation
          </DialogTitle>
          <DialogDescription>
            Delegate your voting power to another address or reclaim delegated power.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Mode Selection */}
          <div className="space-y-3">
            <Label>Action</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={mode === 'delegate' ? 'default' : 'outline'}
                onClick={() => setMode('delegate')}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Delegate
              </Button>
              <Button
                variant={mode === 'undelegate' ? 'default' : 'outline'}
                onClick={() => setMode('undelegate')}
                className="flex items-center gap-2"
              >
                <Minus className="h-4 w-4" />
                Undelegate
              </Button>
            </div>
          </div>

          {/* Current Voting Power */}
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Your Voting Power</span>
              <Badge variant="secondary">
                {currentVotingPower}
              </Badge>
            </div>
          </div>

          {/* Delegatee Address */}
          <div className="space-y-2">
            <Label htmlFor="delegatee">
              {mode === 'delegate' ? 'Delegate To' : 'Undelegate From'}
            </Label>
            <Input
              id="delegatee"
              value={delegateeAddress}
              onChange={(e) => setDelegateeAddress(e.target.value)}
              placeholder="0x..."
              className={!isValidAddress && delegateeAddress ? 'border-red-500' : ''}
            />
            {!isValidAddress && delegateeAddress && (
              <p className="text-sm text-red-500">Please enter a valid Ethereum address</p>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="flex gap-2">
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1"
                min="1"
                max={currentVotingPower}
                className={!isValidAmount && amount ? 'border-red-500' : ''}
              />
              <Button
                variant="outline"
                onClick={() => setAmount(currentVotingPower.toString())}
                disabled={currentVotingPower === 0}
              >
                Max
              </Button>
            </div>
            {!isValidAmount && amount && (
              <p className="text-sm text-red-500">
                Amount must be between 1 and {currentVotingPower}
              </p>
            )}
          </div>

          {/* Summary */}
          {isValidAddress && isValidAmount && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <h4 className="font-medium">
                {mode === 'delegate' ? 'Delegation' : 'Undelegation'} Summary
              </h4>
              <div className="flex items-center justify-between text-sm">
                <span>You</span>
                <ArrowRight className="h-4 w-4" />
                <span>{delegateeAddress.slice(0, 6)}...{delegateeAddress.slice(-4)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Amount:</span>
                <span>{amount} voting power</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Remaining:</span>
                <span>{currentVotingPower - parseInt(amount)} voting power</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isValidAddress || !isValidAmount || isDelegating}
              className="flex-1"
            >
              {isDelegating ? 'Processing...' : mode === 'delegate' ? 'Delegate' : 'Undelegate'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
