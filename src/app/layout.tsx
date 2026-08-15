import type { Metadata } from 'next';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'Table i-Cue — Billiards Tournament & League Engine',
  description: 'Real-time Scotch Doubles Chip Tournament Engine, TV Environmental Broadcast, and APA Sync.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#121212] text-white antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
