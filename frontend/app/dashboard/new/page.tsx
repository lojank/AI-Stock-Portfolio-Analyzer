'use client';

import Link from 'next/link';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function NewPortfolioPage() {
  const [tickers, setTickers] = useState<string[]>(['AAPL']);
  const [name, setName] = useState('');
  const [newTicker, setNewTicker] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('userId');
    router.push('/login');
  };

  const addTicker = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (newTicker && !tickers.includes(newTicker.toUpperCase())) {
      setTickers([...tickers, newTicker.toUpperCase()]);
      setNewTicker('');
    }
  };

  const removeTicker = (tickerToRemove: string) => {
    setTickers(tickers.filter(t => t !== tickerToRemove));
  };

  const savePortfolio = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    // Mock logic to determine if demo or real user
    const userId = localStorage.getItem('userId') || 'demo';

    try {
      if (userId === 'demo') {
        // Save to local storage for demo account to mimic real response
        const existingStr = localStorage.getItem('demo_portfolios');
        const existing = existingStr ? JSON.parse(existingStr) : [];

        const sortedNewTickers = [...tickers].sort().join(',');
        const isDuplicate = existing.some((p: any) => [...p.tickers].sort().join(',') === sortedNewTickers);

        if (!isDuplicate) {
          const newPortfolio = { id: `demo-${Date.now()}`, name: name || undefined, tickers, created_at: new Date().toISOString() };
          localStorage.setItem('demo_portfolios', JSON.stringify([...existing, newPortfolio]));
        }

        await new Promise(resolve => setTimeout(resolve, 600)); // fake network delay
      } else {
        // Real authenticated user API call
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await fetch(`${API_URL}/portfolio/${userId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tickers, name: name || undefined })
        });

        if (!res.ok) {
          throw new Error('Failed to save portfolio');
        }
      }

      router.push('/dashboard');
    } catch (err) {
      console.error(err);
      alert('Failed to save portfolio');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black font-sans">
      <nav className="bg-white dark:bg-zinc-900 shadow-sm border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                </svg>
              </Link>
              <span className="text-xl font-bold text-zinc-900 dark:text-white">New Portfolio</span>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={handleSignOut}
                className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-md"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="py-10">
        <header>
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-zinc-900 dark:text-zinc-100">
              Add Stocks to summarize
            </h1>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Enter the stock tickers you want to include in your new portfolio.
            </p>
          </div>
        </header>
        <main>
          <div className="mx-auto max-w-3xl sm:px-6 lg:px-8 mt-8">
            <div className="bg-white dark:bg-zinc-900 shadow-sm sm:rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <div className="px-4 py-5 sm:p-6">
                <form onSubmit={savePortfolio}>
                  
                  <div className="mb-6">
                    <label htmlFor="name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Portfolio Name (Optional)
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="name"
                        id="name"
                        className="block w-full rounded-md border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border"
                        placeholder="e.g. Tech Stocks"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="mb-6">
                    <label htmlFor="ticker" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Add Ticker Symbol
                    </label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                      <div className="relative flex flex-grow items-stretch focus-within:z-10">
                        <input
                          type="text"
                          name="ticker"
                          id="ticker"
                          className="block w-full rounded-none rounded-l-md border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border uppercase"
                          placeholder="e.g. MSFT"
                          value={newTicker}
                          onChange={(e) => setNewTicker(e.target.value)}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={addTicker}
                        className="relative -ml-px inline-flex items-center gap-x-1.5 rounded-r-md px-3 py-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100 ring-1 ring-inset ring-zinc-300 dark:ring-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 bg-zinc-50 dark:bg-zinc-900"
                      >
                        <svg className="-ml-0.5 h-5 w-5 text-zinc-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                        </svg>
                        Add
                      </button>
                    </div>
                  </div>

                  {tickers.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Selected Stocks</h4>
                      <ul className="divide-y divide-zinc-200 dark:divide-zinc-800 rounded-md border border-zinc-200 dark:border-zinc-800">
                        {tickers.map((ticker) => (
                          <li key={ticker} className="flex items-center justify-between py-3 pl-3 pr-4 text-sm">
                            <div className="flex w-0 flex-1 items-center">
                              <span className="ml-2 w-0 flex-1 truncate font-semibold text-zinc-900 dark:text-white">
                                {ticker}
                              </span>
                            </div>
                            <div className="ml-4 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => removeTicker(ticker)}
                                className="font-medium text-red-600 hover:text-red-500 dark:text-red-400 transition-colors"
                              >
                                Remove
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-8 pt-5 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-x-6">
                    <Link href="/dashboard" className="text-sm font-semibold leading-6 text-zinc-900 dark:text-zinc-100 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
                      Cancel
                    </Link>
                    <button
                      type="submit"
                      className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                      disabled={tickers.length === 0 || isSaving}
                    >
                      {isSaving ? 'Saving...' : 'Save Portfolio'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
