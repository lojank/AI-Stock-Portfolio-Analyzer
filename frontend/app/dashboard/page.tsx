'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPortfolios = async () => {
      const userId = localStorage.getItem('userId') || 'demo';
      try {
        if (userId === 'demo') {
          const demoPortfoliosStr = localStorage.getItem('demo_portfolios');
          if (demoPortfoliosStr) {
            setPortfolios(JSON.parse(demoPortfoliosStr));
          }
        } else {
          const res = await fetch(`http://localhost:8000/portfolio/${userId}`);
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
    if (!window.confirm('Are you sure you want to delete this portfolio?')) return;
    
    const userId = localStorage.getItem('userId') || 'demo';
    
    if (userId === 'demo') {
      const demoPortfoliosStr = localStorage.getItem('demo_portfolios');
      if (demoPortfoliosStr) {
        const portfoliosList = JSON.parse(demoPortfoliosStr);
        const updated = portfoliosList.filter((p: any) => p.id !== portfolioId);
        localStorage.setItem('demo_portfolios', JSON.stringify(updated));
        setPortfolios(updated);
      }
    } else {
      try {
        const res = await fetch(`http://localhost:8000/portfolio/${userId}/${portfolioId}`, {
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
    <div className="min-h-screen bg-zinc-50 dark:bg-black font-sans">
      <nav className="bg-white dark:bg-zinc-900 shadow-sm border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex">
              <div className="flex flex-shrink-0 items-center">
                <span className="text-xl font-bold text-zinc-900 dark:text-white">Portfolio Summarizer</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-zinc-500 dark:text-zinc-400 hidden sm:inline-block">
                Welcome back!
              </span>
              <Link 
                href="/login" 
                className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-md"
              >
                Sign out
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="py-10">
        <header>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between">
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-zinc-900 dark:text-zinc-100">
              Dashboard
            </h1>
            {portfolios.length > 0 && (
              <Link
                href="/dashboard/new"
                className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors"
              >
                <svg className="-ml-0.5 mr-1.5 h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                </svg>
                New Portfolio
              </Link>
            )}
          </div>
        </header>
        <main>
          <div className="mx-auto max-w-7xl sm:px-6 lg:px-8 mt-8">
            <div className="px-4 py-8 sm:px-0">
              {isLoading ? (
                <div className="rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-800 p-12 text-center flex items-center justify-center h-48">
                  <p className="text-zinc-500 dark:text-zinc-400">Loading portfolios...</p>
                </div>
              ) : portfolios.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-800 p-12 text-center h-96 flex flex-col items-center justify-center">
                   <svg
                      className="mx-auto h-12 w-12 text-zinc-400 dark:text-zinc-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        vectorEffect="non-scaling-stroke"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                      />
                    </svg>
                    <h3 className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">No portfolios yet</h3>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                      Get started by adding some stocks to summarize.
                    </p>
                    <div className="mt-6">
                      <Link
                        href="/dashboard/new"
                        className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors"
                      >
                        <svg className="-ml-0.5 mr-1.5 h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                        </svg>
                        New Portfolio
                      </Link>
                    </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {portfolios.map((portfolio, idx) => (
                    <div key={portfolio.id || idx} className="overflow-hidden rounded-lg bg-white dark:bg-zinc-900 shadow border border-zinc-200 dark:border-zinc-800">
                      <div className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <svg className="h-6 w-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                              </svg>
                            </div>
                            <div className="ml-4">
                              <h3 className="text-lg font-medium text-zinc-900 dark:text-white">
                                {portfolio.name || `Portfolio #${idx + 1}`}
                              </h3>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Link href={`/dashboard/edit/${portfolio.id}`} className="text-zinc-400 hover:text-indigo-500 transition-colors">
                              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </Link>
                            <button onClick={() => handleDelete(portfolio.id)} className="text-zinc-400 hover:text-red-500 transition-colors">
                              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">Tracked Stocks</h4>
                          <div className="flex flex-wrap gap-2">
                            {portfolio.tickers.map((ticker: string) => (
                              <span key={ticker} className="inline-flex items-center rounded-md bg-indigo-50 dark:bg-indigo-400/10 px-2 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-400 ring-1 ring-inset ring-indigo-700/10 dark:ring-indigo-400/30">
                                {ticker}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="bg-zinc-50 dark:bg-zinc-900/50 px-6 py-4 border-t border-zinc-200 dark:border-zinc-800">
                        <div className="text-sm">
                          <Link href="#" className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
                            View Summary <span aria-hidden="true">&rarr;</span>
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
