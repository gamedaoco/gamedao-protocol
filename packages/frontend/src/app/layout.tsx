import './globals.css'
import type { Metadata } from 'next'
import { Inter, Instrument_Serif } from 'next/font/google'
import { Providers } from '@/components/providers'

const inter = Inter({ subsets: ['latin'] })
const serif = Instrument_Serif({ subsets: ['latin'], weight: '400', style: ['normal', 'italic'], variable: '--font-serif' })

export const metadata: Metadata = {
  title: 'GameDAO Protocol',
  description: 'Form a collective, fund the work, ship together. Kickstarter for the long haul, paired with a place to put everything you have ever made.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} ${serif.variable}`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
