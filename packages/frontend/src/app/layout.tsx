import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "@/providers/web3-provider";
import { ThemeProvider } from "@/providers/theme-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GameDAO Protocol",
  description: "Decentralized Autonomous Organizations for Gaming Communities - Create, manage, and govern gaming DAOs with advanced treasury, governance, and reputation systems.",
  keywords: ["GameDAO", "DAO", "Gaming", "Web3", "Governance", "DeFi", "Community"],
  authors: [{ name: "GameDAO Team" }],
  creator: "GameDAO",
  publisher: "GameDAO",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Web3Provider>
            <div className="relative flex min-h-screen flex-col">
              <div className="flex-1">
                {children}
              </div>
            </div>
          </Web3Provider>
        </ThemeProvider>
      </body>
    </html>
  );
}
