'use client';

import Link from 'next/link';
import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function NewPortfolioPage() {
  const [tickers, setTickers] = useState<string[]>(['AAPL']);
  const [name, setName] = useState('');
  const [newTicker, setNewTicker] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId || userId === 'demo') {
      router.push('/login');
    }
  }, [router]);

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
    setError('');

    // Mock logic to determine if demo or real user
    const userId = localStorage.getItem('userId') || 'demo';
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

    try {
      const invalidTickers: string[] = [];

      // Analyze each ticker and collect any invalid ones
      const results = await Promise.all(
        tickers.map(async ticker => {
          try {
            const headers: Record<string, string> = {};
            const customKey = localStorage.getItem('gemini_api_key');
            if (customKey && userId !== 'demo') {
              headers['X-Gemini-API-Key'] = customKey;
            }

            const analyzeRes = await fetch(`${API_URL}/analyze/${encodeURIComponent(ticker)}`, {
              method: "POST",
              headers
            });
            return { ticker, data: await analyzeRes.json() };
          } catch (err) {
            console.error(`Failed to analyze ${ticker}`, err);
            return null;
          }
        })
      );

      results.forEach(result => {
        if (result && result.data && result.data.status === "invalid_ticker") {
          invalidTickers.push(result.ticker);
        }
      });

      if (invalidTickers.length > 0) {
        setError(`These tickers weren't found: ${invalidTickers.join(", ")}. Please check the symbols.`);
        setTickers(prev => prev.filter(t => !invalidTickers.includes(t)));
        setIsSaving(false);
        return; // Don't redirect, let user see the error
      }

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
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <nav className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors p-1 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                </svg>
              </Link>
              <span className="text-xl font-semibold text-zinc-900 dark:text-white">New Watchlist</span>
            </div>
            <div className="flex items-center space-x-4">
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
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-100">
              New Watchlist
            </h1>
            <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              List the assets you want to track.
            </p>
          </div>
        </header>
        <main>
          <div className="mx-auto max-w-3xl sm:px-6 lg:px-8 mt-8">
            <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <div className="px-6 py-6 sm:p-8">
                <form onSubmit={savePortfolio}>

                  <div className="mb-6">
                    <label htmlFor="name" className="block text-sm font-medium text-zinc-600 dark:text-zinc-300">
                      Portfolio Name (Optional)
                    </label>
                    <div className="mt-2">
                      <input
                        type="text"
                        name="name"
                        id="name"
                        className="block w-full rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3.5 py-2 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-teal-500 focus:ring-0 focus:outline-none text-sm transition-colors"
                        placeholder="e.g. Tech Stocks"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="mb-6">
                    <label htmlFor="ticker" className="block text-sm font-medium text-zinc-600 dark:text-zinc-300">
                      Add Ticker Symbol
                    </label>
                    <div className="mt-2 flex rounded">
                      <div className="relative flex flex-grow items-stretch focus-within:z-10">
                        <input
                          type="text"
                          name="ticker"
                          id="ticker"
                          className="block w-full rounded-l border border-r-0 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3.5 py-2 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-teal-500 focus:ring-0 focus:outline-none text-sm transition-colors uppercase"
                          placeholder="e.g. MSFT"
                          value={newTicker}
                          onChange={(e) => setNewTicker(e.target.value)}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={addTicker}
                        className="relative -ml-px inline-flex items-center gap-x-1.5 rounded-r px-4 py-2 text-sm font-medium text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 bg-zinc-50 dark:bg-zinc-900 transition-colors"
                      >
                        <svg className="-ml-0.5 h-4 w-4 text-zinc-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                        </svg>
                        Add
                      </button>
                    </div>
                  </div>

                  {tickers.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-zinc-600 dark:text-zinc-300 mb-2">Tickers</h4>
                      <div className="flex flex-wrap gap-2 p-4 border border-zinc-200 dark:border-zinc-800 rounded bg-zinc-50 dark:bg-zinc-900/40">
                        {tickers.map((ticker) => (
                          <div key={ticker} className="inline-flex items-center gap-2 rounded bg-white dark:bg-zinc-800 pl-3 pr-2 py-1 text-xs font-medium text-zinc-800 dark:text-zinc-200">
                            <span>{ticker}</span>
                            <button
                              type="button"
                              onClick={() => removeTicker(ticker)}
                              className="text-zinc-400 hover:text-rose-600 transition-colors p-0.5 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800"
                              aria-label={`Remove ${ticker}`}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                      {error && (
                        <p style={{ color: "#ef4444", fontSize: 12, fontWeight: 600, marginTop: 10 }}>
                          Error: {error}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="mt-8 pt-5 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-x-6">
                    <Link href="/dashboard" className="text-xs font-bold tracking-wider uppercase text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors">
                      Cancel
                    </Link>
                    <button
                      type="submit"
                      className="rounded bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                      disabled={tickers.length === 0 || isSaving}
                    >
                      {isSaving ? 'Saving…' : 'Save Watchlist'}
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
