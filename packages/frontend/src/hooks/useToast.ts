import toast from 'react-hot-toast'

export const useToast = () => {
  const success = (message: string, options?: any) => {
    return toast.success(message, options)
  }

  const error = (message: string, options?: any) => {
    return toast.error(message, options)
  }

  const loading = (message: string, options?: any) => {
    return toast.loading(message, options)
  }

  const dismiss = (toastId?: string) => {
    if (toastId) {
      toast.dismiss(toastId)
    } else {
      toast.dismiss()
    }
  }

  const promise = <T>(
    promise: Promise<T>,
    {
      loading: loadingMessage,
      success: successMessage,
      error: errorMessage,
    }: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: any) => string)
    }
  ) => {
    return toast.promise(promise, {
      loading: loadingMessage,
      success: successMessage,
      error: errorMessage,
    })
  }

  // GameDAO-specific toast functions
  const walletConnected = (address: string) => {
    return success(`Wallet connected: ${address.slice(0, 6)}...${address.slice(-4)}`)
  }

  const walletDisconnected = () => {
    return success('Wallet disconnected')
  }

  const transactionPending = (txHash: string) => {
    return loading(`Transaction pending: ${txHash.slice(0, 6)}...${txHash.slice(-4)}`)
  }

  const transactionSuccess = (txHash: string, action: string) => {
    return success(`${action} successful: ${txHash.slice(0, 6)}...${txHash.slice(-4)}`)
  }

  const transactionError = (error: any, action: string) => {
    const message = error?.message || error?.reason || 'Transaction failed'
    return error(`${action} failed: ${message}`)
  }

  const organizationCreated = (name: string) => {
    return success(`Organization "${name}" created successfully!`)
  }

  const campaignCreated = (title: string) => {
    return success(`Campaign "${title}" created successfully!`)
  }

  const proposalCreated = (title: string) => {
    return success(`Proposal "${title}" created successfully!`)
  }

  const profileCreated = (username: string) => {
    return success(`Profile "${username}" created successfully!`)
  }

  const memberAdded = (address: string, orgName: string) => {
    return success(`Member ${address.slice(0, 6)}...${address.slice(-4)} added to ${orgName}`)
  }

  const stakeSuccess = (amount: string, token: string) => {
    return success(`Successfully staked ${amount} ${token}`)
  }

  const unstakeSuccess = (amount: string, token: string) => {
    return success(`Successfully unstaked ${amount} ${token}`)
  }

  return {
    success,
    error,
    loading,
    dismiss,
    promise,
    // GameDAO-specific
    walletConnected,
    walletDisconnected,
    transactionPending,
    transactionSuccess,
    transactionError,
    organizationCreated,
    campaignCreated,
    proposalCreated,
    profileCreated,
    memberAdded,
    stakeSuccess,
    unstakeSuccess,
  }
}
