import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from '@/components/providers'
import { ScaffoldDataLoader } from '@/components/scaffold-data-loader'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'GameDAO Protocol',
  description: 'Decentralized gaming ecosystem with DAOs, campaigns, and governance',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <ScaffoldDataLoader />
          {children}
        </Providers>
      </body>
    </html>
  )
}
