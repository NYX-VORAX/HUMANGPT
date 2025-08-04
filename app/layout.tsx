import './globals.css'
import { Inter } from 'next/font/google'
import { Metadata } from 'next'
import { AuthProvider } from '@/contexts/AuthContext'
import SmoothScrollProvider from '@/components/SmoothScrollProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'HumanGPT - Real Human-like AI Chat',
  description: 'Chat with AI personas that feel completely human',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style dangerouslySetInnerHTML={{
          __html: `
            /* Prevent FOUC */
            body { 
              opacity: 0; 
              transition: opacity 0.3s ease-in-out;
            }
            body.loaded { 
              opacity: 1; 
            }
            /* Ensure background is always visible */
            .min-h-screen {
              min-height: 100vh !important;
              background: linear-gradient(135deg, #0f172a 0%, #581c87 50%, #0f172a 100%) !important;
            }
          `
        }} />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // Prevent FOUC
                  window.addEventListener('load', function() {
                    document.body.classList.add('loaded');
                  });
                  
                  // Suppress React DevTools console messages
                  const originalLog = console.log;
                  console.log = function(...args) {
                    if (args[0] && typeof args[0] === 'string' && args[0].includes('React DevTools')) {
                      return;
                    }
                    originalLog.apply(console, args);
                  };
                  
                  // Suppress other warnings
                  const originalWarn = console.warn;
                  console.warn = function(...args) {
                    if (args[0] && typeof args[0] === 'string' && 
                        (args[0].includes('React DevTools') || 
                         args[0].includes('cross-origin'))) {
                      return;
                    }
                    originalWarn.apply(console, args);
                  };
                } catch (e) {
                  // Suppress errors
                }
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900" suppressHydrationWarning>
        <AuthProvider>
          <SmoothScrollProvider>
            {children}
          </SmoothScrollProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
