import type { Metadata, Viewport } from 'next';
import { Barlow, Saira_Condensed } from 'next/font/google';

const display = Saira_Condensed({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-display' });
const body = Barlow({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-body' });

export const metadata: Metadata = {
  title: 'Table I-Cue · TOC Match Day',
  description: 'Put-ups, counter-picks, and on-the-fly strategy for the Sep 13 Tournament of Champions.',
  icons: { icon: '/toc/icon-180.png', apple: '/toc/icon-180.png' },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#04090A',
};

export default function TocLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${display.variable} ${body.variable}`} style={{ fontFamily: 'var(--font-body), system-ui, sans-serif' }}>
      {children}
    </div>
  );
}
