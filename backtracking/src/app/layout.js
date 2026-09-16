import './globals.css';
import Link from 'next/link';
import IdentityBadge from '@/components/IdentityBadge';

export const metadata = {
  title: 'Backtracking Arena | SCIS Connect',
  description:
    'Interactive black-box pattern deduction contest. Probe the hidden program, infer the logic, and write the C code that replicates it.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased">
        <header className="border-b border-white/10 px-6 py-4">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <Link href="/" className="text-lg font-semibold tracking-tight">
                SCIS<span className="text-indigo-400">Connect</span>
              </Link>
              <nav className="flex items-center gap-4 text-sm text-white/60">
                <Link href="/" className="transition hover:text-white">
                  Quizzes
                </Link>
                <Link href="/arena" className="transition hover:text-white">
                  Arena
                </Link>
              </nav>
            </div>
            <IdentityBadge />
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
