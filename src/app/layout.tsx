import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'My Little Toyota',
  description: 'See your Toyota\'s future and find your smartest next move.',
  icons: { icon: '/toyota-red.png' }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body>{children}</body></html>);
}
