import './globals.css';
import Link from 'next/link';
import IdentityBadge from '@/components/IdentityBadge';

export const metadata = {
  title: 'SCIS Connect',
  description: 'Quiz Mania and Backtracking Arena for the SCIS Connect competition',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
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
