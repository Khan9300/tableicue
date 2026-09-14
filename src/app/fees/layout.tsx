import { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'APA Fee Tracker',
  description: 'Manage APA pool team fees and rosters.',
  robots: 'noindex, nofollow'
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#04090A'
}

export default function FeesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#04090A] text-[#FCFCFC] font-[family-name:var(--font-body)]">
      {children}
    </div>
  )
}
