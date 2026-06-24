import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import ThemeProvider from '@/components/ThemeProvider'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'My Wishlist',
  description: 'Track products you want and find the best prices',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'My Wishlist' },
  icons: {
    icon: '/icon-192.png',
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  // Matches manifest theme_color so the browser/status-bar chrome is consistent.
  themeColor: '#4f46e5',
  width: 'device-width',
  initialScale: 1,
}

// Runs before React hydrates — sets theme + registers service worker
const themeScript = `
(function(){
  try {
    var m = localStorage.getItem('wl-mode') || 'dark';
    var a = localStorage.getItem('wl-accent') || 'indigo';
    if (m === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    document.documentElement.setAttribute('data-accent', a);
  } catch(e){}
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('/sw.js').catch(function(){});
    });
  }
})();
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the inline script above intentionally changes
    // class/data-accent before React hydrates, so React would otherwise warn.
    // This attribute tells React "I know, it's fine."
    <html lang="en" className={`${geistSans.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full bg-canvas text-ink antialiased">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
