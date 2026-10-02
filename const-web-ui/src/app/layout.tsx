import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Providers } from '@/components/providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
});

export const metadata: Metadata = {
  title: 'ADO Innenausbau · Bau- & Projektplattform',
  description: 'Baumanagement- & Innenausbau-Portal für ADO Innenausbau (ado-innenausbau.de)',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrains.variable} min-h-screen bg-slate-950 text-slate-100 antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
