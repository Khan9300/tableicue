import type { Metadata, Viewport } from 'next';
import { Inter, Saira_Condensed } from 'next/font/google';

const display = Saira_Condensed({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-display' });
const body = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-body' });

export const metadata: Metadata = {
  title: 'RackIQ Match Day',
  description: 'Match day strategy app for pool captains.',
  icons: { icon: '/icon-180.png', apple: '/icon-180.png' },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1A1A1A',
};

export default function TeamLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${display.variable} ${body.variable}`} style={{ fontFamily: 'var(--font-body), system-ui, sans-serif' }}>
      {children}
    </div>
  );
}
