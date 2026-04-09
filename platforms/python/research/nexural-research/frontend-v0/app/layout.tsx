import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AccessibilityProvider } from '@/lib/accessibility-context'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Nexural Research | Strategy Analysis Platform',
  description: 'Institutional-grade strategy analysis dashboard for quant desks, prop traders, and systematic fund managers. Evaluate NinjaTrader backtest results with 71+ metrics.',
  generator: 'Nexural Research',
  keywords: ['trading', 'backtest', 'quant', 'strategy', 'analysis', 'NinjaTrader', 'futures'],
  icons: {
    icon: [
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
    ],
  },
}

export const viewport: Viewport = {
  themeColor: '#0a0a0f',
  width: 'device-width',
  initialScale: 1,
  userScalable: true,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <AccessibilityProvider>
          {children}
        </AccessibilityProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
