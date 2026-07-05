'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import TickerCard from '@/components/TickerCard';
import NarrativePanel from '@/components/NarrativePanel';
import QuotaAlertBanner, { ApiQuota } from '@/components/QuotaAlertBanner';
import Link from 'next/link';

export default function PortfolioBriefingPage() {
  const params = useParams();
  const portfolioId = params.id as string;

  const [user, setUser] = useState<any>(null);
  const [summaries, setSummaries] = useState<any[]>([]);
  const [allTickers, setAllTickers] = useState<string[]>([]);
  const [narrative, setNarrative] = useState('');
  const [loading, setLoading] = useState(true);
  const [portfolioName, setPortfolioName] = useState('Briefing');
  const [apiQuota, setApiQuota] = useState<ApiQuota | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    const fetchUserAndPortfolio = async () => {
      const { data } = await supabase.auth.getUser();
      const currentUser = data.user;
      setUser(currentUser);

      const userId = localStorage.getItem('userId') || currentUser?.id || 'demo';
      setIsDemo(userId === 'demo');
      let userTickers: string[] = [];

      // Fetch the portfolio details to get the name and tickers list
      try {
        if (userId === 'demo') {
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
          const portfolios = JSON.parse(demoPortfoliosStr);
          const current = portfolios.find((p: any) => p.id === portfolioId);
          if (current) {
            if (current.name) {
              setPortfolioName(current.name);
            }
            userTickers = current.tickers || [];
          }
        } else {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
          const res = await fetch(`${API_URL}/portfolio/${userId}`);
          if (res.ok) {
            const portfolios = await res.json();
            const current = portfolios.find((p: any) => p.id === portfolioId);
            if (current) {
              if (current.name) {
                setPortfolioName(current.name);
              }
              userTickers = current.tickers || [];
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch portfolio name and tickers", err);
      }

      setAllTickers(userTickers);
      await loadPortfolioNarrative(userId, userTickers);
    };

    fetchUserAndPortfolio();
  }, [portfolioId]);

  const loadPortfolioNarrative = async (userId: string, currentTickers: string[]) => {
    setLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      let url = `${API_URL}/portfolio/${userId}/narrative/${portfolioId}`;
      if (userId === 'demo' && currentTickers && currentTickers.length > 0) {
        url += `?tickers=${encodeURIComponent(currentTickers.join(','))}`;
      }

      const headers: Record<string, string> = {};
      const customKey = localStorage.getItem('gemini_api_key');
      if (customKey && userId !== 'demo') {
        headers['X-Gemini-API-Key'] = customKey;
      }

      const res = await fetch(url, { headers });

      if (res.ok) {
        const data = await res.json();
        setSummaries(data.summaries || []);
        setNarrative(data.narrative || '');
        setApiQuota(data.api_quota || null);
        if (data.tickers) {
          setAllTickers(data.tickers);
        }
      }
    } catch (err) {
      console.error("Failed to load narrative", err);
    } finally {
      setLoading(false);
    }
  };

  const showNarrative = narrative &&
    apiQuota?.status !== 'server_exhausted' &&
    apiQuota?.status !== 'user_exhausted' &&
    !apiQuota?.narrative_limited &&
    narrative !== 'No portfolio data available.';

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <nav className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex">
              <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-3.5 py-1.5 rounded">
                Back to Dashboard
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                AI Stock Portfolio Analyzer
              </span>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600 mb-4"></div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Fetching briefings…</p>
          </div>
        ) : (
          <>
            <QuotaAlertBanner apiQuota={apiQuota} isDemo={isDemo} />

            <div className="mb-6">
              <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-100">
                {portfolioName}
              </h1>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                Daily market briefings compiled from scraped RSS feeds.
              </p>
              {allTickers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {allTickers.map((ticker) => (
                    <span key={ticker} className="inline-flex items-center rounded bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                      {ticker}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {showNarrative && <NarrativePanel narrative={narrative} />}

            {allTickers.length > 0 ? (
              <>
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-6 mt-8">Ticker Briefings</h2>
                <div className="grid grid-cols-1 gap-6">
                  {allTickers.map((ticker, idx) => {
                    const summary = summaries.find(s => s.ticker.toUpperCase() === ticker.toUpperCase());
                    if (summary) {
                      return <TickerCard key={ticker || idx} summary={summary} />;
                    } else {
                      const quotaBlocked = apiQuota?.failed_tickers?.some(
                        (t) => t.toUpperCase() === ticker.toUpperCase()
                      );
                      const invalidKeyBlocked = apiQuota?.status === 'invalid_key' || apiQuota?.invalid_tickers?.some(
                        (t) => t.toUpperCase() === ticker.toUpperCase()
                      );
                      const blocked = quotaBlocked || invalidKeyBlocked;

                      return (
                        <div
                          key={ticker || idx}
                          className={`border rounded-lg p-6 flex flex-col justify-between ${
                            invalidKeyBlocked
                              ? 'border-rose-200 dark:border-rose-900/40 bg-rose-50/10 dark:bg-rose-950/10'
                              : quotaBlocked
                                ? 'border-amber-200 dark:border-amber-900/40 bg-amber-50/20 dark:bg-amber-950/10'
                                : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
                          }`}
                        >
                          <div>
                            <div className="flex justify-between items-center mb-3">
                              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 m-0">{ticker}</h2>
                              <span
                                className={`rounded px-2.5 py-0.5 text-xs font-medium ${
                                  invalidKeyBlocked
                                    ? 'text-rose-700 bg-rose-50 border border-rose-200 dark:text-rose-400 dark:bg-rose-950/20 dark:border-rose-900/40'
                                    : quotaBlocked
                                      ? 'text-amber-700 bg-amber-50 border border-amber-200 dark:text-amber-400 dark:bg-amber-950/20 dark:border-amber-900/40'
                                      : 'text-zinc-700 bg-zinc-50 border border-zinc-200 dark:text-zinc-400 dark:bg-zinc-800/20 dark:border-zinc-700'
                                }`}
                              >
                                {invalidKeyBlocked ? 'Invalid key' : quotaBlocked ? 'Quota limit' : 'No data'}
                              </span>
                            </div>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-4 leading-relaxed">
                              {invalidKeyBlocked
                                ? 'Gemini API key is invalid or inactive. Please check your configuration on the Dashboard.'
                                : quotaBlocked
                                  ? apiQuota?.used_custom_key
                                    ? 'Quota limit reached. Verify your API key limits or try again later.'
                                    : isDemo
                                      ? apiQuota?.using_demo_key
                                        ? 'Demo limit hit. Try again later or sign in.'
                                        : 'Shared demo limit reached. Sign in with your own key.'
                                        : 'Shared limit reached. Add your own API key to continue.'
                                  : 'No recent articles found for this ticker.'}
                            </p>
                          </div>
                        </div>
                      );
                    }
                  })}
                </div>
              </>
            ) : apiQuota?.status === 'ok' && !narrative ? (
              <div className="rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 px-6 py-10 text-center bg-white dark:bg-zinc-900">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Nothing here yet. Briefings show up once the ingestion pipeline has run.
                </p>
              </div>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}
