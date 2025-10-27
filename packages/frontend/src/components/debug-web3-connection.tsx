'use client'

import { useState } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useGameDAO } from '@/hooks/useGameDAO'
import { ABIS } from '@/lib/abis'

export function DebugWeb3Connection() {
  const { address, isConnected, chain } = useAccount()
  const { contracts } = useGameDAO()
  const [testResult, setTestResult] = useState<string>('')

  // Test read function
  const { data: orgCount, error: readError, isLoading: isReading } = useReadContract({
    address: contracts.CONTROL,
    abi: ABIS.CONTROL,
    functionName: 'getOrganizationCount',
  })

  // Test write function
  const {
    writeContract: createTestOrg,
    isPending: isCreating,
    data: txHash,
    error: writeError,
  } = useWriteContract()

  // Wait for transaction confirmation
  const {
    isLoading: isConfirming,
    isSuccess: txSuccess,
    error: confirmError
  } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  const handleTestCreate = async () => {
    try {
      setTestResult('Testing DAO creation...')

      const result = await createTestOrg({
        address: contracts.CONTROL,
        abi: ABIS.CONTROL,
        functionName: 'createOrganization',
        args: [
          'Debug Test DAO',
          '',
          2, // DAO
          0, // Open
          0, // No Fees
          BigInt(100), // memberLimit
          BigInt(0), // membershipFee
          BigInt(0), // gameStakeRequired
        ],
      })

      setTestResult(`Transaction submitted: ${result}`)
    } catch (error) {
      console.error('Test creation failed:', error)
      setTestResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>🔧 Web3 Connection Debug</CardTitle>
        <CardDescription>Test blockchain connectivity and contract interaction</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="space-y-2">
          <h3 className="font-semibold">Connection Status</h3>
          <div className="flex flex-wrap gap-2">
            <Badge variant={isConnected ? 'default' : 'destructive'}>
              {isConnected ? '✅ Connected' : '❌ Disconnected'}
            </Badge>
            <Badge variant="outline">Chain: {chain?.name || 'Unknown'}</Badge>
            <Badge variant="outline">Chain ID: {chain?.id || 'Unknown'}</Badge>
            <Badge variant={chain?.id === 31337 ? 'default' : 'destructive'}>
              {chain?.id === 31337 ? '✅ Correct Network' : '❌ Wrong Network'}
            </Badge>
          </div>
          {address && (
            <p className="text-sm text-muted-foreground">
              Address: {address}
            </p>
          )}
          {chain?.id !== 31337 && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>⚠️ Wrong Network!</strong> Please switch to Hardhat Local (Chain ID: 31337)
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                Add network: RPC URL: http://127.0.0.1:8545, Chain ID: 31337
              </p>
            </div>
          )}
        </div>

        {/* Contract Addresses */}
        <div className="space-y-2">
          <h3 className="font-semibold">Contract Addresses</h3>
          <div className="text-sm space-y-1">
            <p>CONTROL: {contracts.CONTROL}</p>
            <p>REGISTRY: {contracts.REGISTRY}</p>
            <p>FLOW: {contracts.FLOW}</p>
          </div>
        </div>

        {/* Read Test */}
        <div className="space-y-2">
          <h3 className="font-semibold">Read Test</h3>
          <div className="flex items-center gap-2">
            <Badge variant={readError ? 'destructive' : 'default'}>
              {isReading ? '⏳ Loading...' : readError ? '❌ Error' : '✅ Success'}
            </Badge>
            <span className="text-sm">
              Organization Count: {orgCount?.toString() || 'N/A'}
            </span>
          </div>
          {readError && (
            <p className="text-sm text-red-600">
              Error: {readError.message}
            </p>
          )}
        </div>

        {/* Write Test */}
        <div className="space-y-2">
          <h3 className="font-semibold">Write Test</h3>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleTestCreate}
              disabled={!isConnected || isCreating || isConfirming}
              size="sm"
            >
              {isCreating ? 'Creating...' : isConfirming ? 'Confirming...' : 'Test Create DAO'}
            </Button>
            <div className="flex gap-1">
              {isCreating && <Badge variant="outline">⏳ Pending</Badge>}
              {isConfirming && <Badge variant="outline">⏳ Confirming</Badge>}
              {txSuccess && <Badge variant="default">✅ Success</Badge>}
              {(writeError || confirmError) && <Badge variant="destructive">❌ Error</Badge>}
            </div>
          </div>

          {txHash && (
            <p className="text-sm text-muted-foreground">
              Tx Hash: {txHash}
            </p>
          )}

          {testResult && (
            <p className="text-sm">
              Result: {testResult}
            </p>
          )}

          {(writeError || confirmError) && (
            <p className="text-sm text-red-600">
              Error: {(writeError || confirmError)?.message}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
