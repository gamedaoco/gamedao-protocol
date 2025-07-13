'use client'

import { Web3Provider } from '@/providers/web3Provider'
import { ThemeProvider } from '@/providers/themeProvider'
import { ApolloProviderWrapper } from '@/providers/apolloProvider'
import { ToastProvider } from '@/providers/toastProvider'
import { AppLayout } from '@/components/layout/appLayout'

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <ApolloProviderWrapper>
        <Web3Provider>
          <AppLayout>
            {children}
          </AppLayout>
          <ToastProvider />
        </Web3Provider>
      </ApolloProviderWrapper>
    </ThemeProvider>
  )
}
