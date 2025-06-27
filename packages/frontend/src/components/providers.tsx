'use client'

import { Web3Provider } from '@/providers/web3-provider'
import { ThemeProvider } from '@/providers/theme-provider'
import { ApolloProviderWrapper } from '@/providers/apollo-provider'
import { AppLayout } from '@/components/layout/app-layout'

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
        </Web3Provider>
      </ApolloProviderWrapper>
    </ThemeProvider>
  )
}
