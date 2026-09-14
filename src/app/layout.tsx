import type { Metadata, Viewport } from 'next';
import { Saira_Condensed, Inter } from 'next/font/google';
import '@/styles/globals.css';

const saira = Saira_Condensed({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-saira',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'RackIQ — APA Captain Strategy',
  description: 'Outsmart the rack. Lineup legality, matchup analytics, and live put-up strategy for APA pool captains.',
  robots: 'noindex, nofollow',
  icons: { icon: '/favicon.ico' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1A1A1A',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${saira.variable} ${inter.variable}`}>
      <body className="font-body min-h-screen">
        {children}
      </body>
    </html>
  );
}
