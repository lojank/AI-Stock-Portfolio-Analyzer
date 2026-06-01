'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import GeminiApiKeyCard from '@/components/GeminiApiKeyCard';

export default function DashboardPage() {
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string>('demo');
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('userId');
    router.push('/login');
  };

  useEffect(() => {
    const activeUserId = localStorage.getItem('userId') || 'demo';
    setUserId(activeUserId);
    const fetchPortfolios = async () => {
      try {
        if (activeUserId === 'demo') {
          let demoPortfoliosStr = localStorage.getItem('demo_portfolios');
          if (!demoPortfoliosStr) {
            const defaultDemo = [
              {
                id: 'demo-default',
                name: 'Demo Portfolio',
                tickers: ['AAPL', 'NVDA', 'TSLA', 'MSFT', 'GOOG', 'META', 'AMZN'],
                created_at: new Date().toISOString()
              }
            ];
            localStorage.setItem('demo_portfolios', JSON.stringify(defaultDemo));
            demoPortfoliosStr = JSON.stringify(defaultDemo);
          }
          setPortfolios(JSON.parse(demoPortfoliosStr));
        } else {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
          const res = await fetch(`${API_URL}/portfolio/${activeUserId}`);
          if (res.ok) {
            const data = await res.json();
            setPortfolios(data);
          }
        }
      } catch (error) {
        console.error('Failed to fetch portfolios', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPortfolios();
  }, []);

  const handleDelete = async (portfolioId: string) => {
    const activeId = localStorage.getItem('userId') || 'demo';
    if (activeId === 'demo') return;
    if (!window.confirm('Are you sure you want to delete this portfolio?')) return;

    {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
        const res = await fetch(`${API_URL}/portfolio/${userId}/${portfolioId}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          setPortfolios(portfolios.filter(p => p.id !== portfolioId));
        } else {
          alert('Failed to delete portfolio');
        }
      } catch (err) {
        console.error(err);
        alert('Failed to delete portfolio');
      }
    }
  };




  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <nav className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex">
              <div className="flex flex-shrink-0 items-center">
                <span className="text-xl font-semibold text-zinc-900 dark:text-white">Portfolio Summarizer</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-zinc-500 dark:text-zinc-400 hidden sm:inline-block">
                Welcome back
              </span>
              <button
                onClick={handleSignOut}
                className="text-sm text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-3.5 py-1.5 rounded"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="py-10">
        <header>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between">
            <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-100">
              Dashboard
            </h1>
            {userId !== 'demo' && portfolios.length > 0 && (
              <Link
                href="/dashboard/new"
                className="inline-flex items-center rounded bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 text-sm font-medium transition-colors"
              >
                <svg className="-ml-0.5 mr-2 h-4 w-4 stroke-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                New Portfolio
              </Link>
            )}
          </div>
        </header>
        <main>
          <div className="mx-auto max-w-7xl sm:px-6 lg:px-8 mt-8">
            {userId !== 'demo' && <GeminiApiKeyCard />}
            {userId === 'demo' && (
              <div className="bg-teal-50/30 dark:bg-teal-950/10 border border-teal-200 dark:border-teal-900/40 rounded-lg p-6 mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-teal-900 dark:text-teal-300">Demo Mode</h3>
                    <p className="text-xs text-teal-700 dark:text-teal-400 mt-1 leading-relaxed">
                      Sign in to manage your own watchlists.
                    </p>
                  </div>
                  <Link
                    href="/login"
                    className="inline-flex items-center rounded bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 text-sm font-medium transition-colors shrink-0"
                  >
                    Sign In
                  </Link>
                </div>
              </div>
            )}
            <div className="px-4 py-4 sm:px-0">
              {isLoading ? (
                <div className="rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 p-12 text-center flex items-center justify-center h-48 bg-white dark:bg-zinc-900">
                  <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Loading portfolios...</p>
                </div>
              ) : portfolios.length === 0 ? (
                <div className="rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 px-6 py-10 text-center bg-white dark:bg-zinc-900">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {userId !== 'demo'
                      ? <>No active watchlists. Click <span className="font-semibold text-zinc-700 dark:text-zinc-300">&lsquo;New Portfolio&rsquo;</span> above to get started.</>
                      : <>No watchlists. <Link href="/login" className="font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400 underline">Sign in</Link> to create your first one.</>}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {portfolios.map((portfolio, idx) => (
                    <div key={portfolio.id || idx} className="overflow-hidden rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                      <div className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <svg className="h-6 w-6 text-teal-600 dark:text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                              </svg>
                            </div>
                            <div className="ml-3">
                              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                                {portfolio.name || `Portfolio #${idx + 1}`}
                              </h3>
                            </div>
                          </div>
                          {userId !== 'demo' && (
                            <div className="flex space-x-2">
                              <Link href={`/dashboard/edit/${portfolio.id}`} className="text-zinc-400 hover:text-teal-600 transition-colors p-1 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800">
                                <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </Link>
                              <button onClick={() => handleDelete(portfolio.id)} className="text-zinc-400 hover:text-rose-600 transition-colors p-1 rounded hover:bg-rose-50 dark:hover:bg-zinc-800">
                                <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="mt-5">
                          <h4 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">Tickers</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {portfolio.tickers.map((ticker: string) => (
                              <span key={ticker} className="inline-flex items-center rounded bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                                {ticker}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="bg-zinc-50 dark:bg-zinc-900/30 px-6 py-4 border-t border-zinc-200 dark:border-zinc-800">
                        <div className="text-sm">
                          <Link href={`/dashboard/${portfolio.id}`} className="font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 text-sm">
                            Open &rarr;
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
