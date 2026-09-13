import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Table I-Cue · TOC Match Day',
  description: 'Put-ups, counters, and live score for the Sep 13 Tournament of Champions.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0E1B17',
};

export default function TocLayout({ children }: { children: React.ReactNode }) {
  return children;
}
