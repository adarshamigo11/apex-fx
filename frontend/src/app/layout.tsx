import './globals.css';
import type { Metadata, Viewport } from 'next';
import AppShell from '../components/AppShell';

export const metadata: Metadata = {
  title: 'ApexFX Trader',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'ApexFX' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, maximumScale: 1 };

const noFlash = `(function(){try{var t=localStorage.getItem('theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: noFlash }} /></head>
      <body className="antialiased">
        <AppShell>{children}</AppShell>
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js'))}` }} />
      </body>
    </html>
  );
}
