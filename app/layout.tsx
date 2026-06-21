import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AGL Practice Tracker',
  description: 'AGL Coaching Practice Tracking Tool',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  )
}
