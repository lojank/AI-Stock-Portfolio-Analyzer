'use client';

import Link from 'next/link';

export interface ApiQuota {
  status: 'ok' | 'server_exhausted' | 'user_exhausted' | 'partial';
  used_custom_key: boolean;
  using_demo_key?: boolean;
  failed_tickers: string[];
  narrative_limited: boolean;
  message: string;
}

export default function QuotaAlertBanner({
  apiQuota,
  isDemo,
}: {
  apiQuota: ApiQuota | null;
  isDemo: boolean;
}) {
  if (!apiQuota || apiQuota.status === 'ok') return null;

  const isUserQuota =
    apiQuota.status === 'user_exhausted' ||
    (apiQuota.status === 'partial' && apiQuota.used_custom_key);

  const title =
    apiQuota.status === 'server_exhausted'
      ? isDemo
        ? apiQuota.using_demo_key
          ? 'Demo briefings temporarily unavailable'
          : 'Demo briefing limit reached'
        : 'Shared API limit reached'
      : apiQuota.status === 'user_exhausted'
        ? 'Your API key quota is used up'
        : isUserQuota
          ? 'Some briefings blocked by your API quota'
          : 'Some briefings blocked by the shared API limit';

  const containerClass = isUserQuota
    ? 'bg-amber-50/30 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900/40'
    : 'bg-teal-50/30 dark:bg-teal-950/10 border-teal-200 dark:border-teal-900/40';

  const titleClass = isUserQuota
    ? 'text-amber-800 dark:text-amber-300'
    : 'text-teal-800 dark:text-teal-300';

  const bodyClass = isUserQuota
    ? 'text-amber-700 dark:text-amber-400'
    : 'text-teal-700 dark:text-teal-400';

  const buttonClass = isUserQuota
    ? 'bg-amber-700 hover:bg-amber-800 border-amber-800 text-white dark:bg-amber-600 dark:hover:bg-amber-700 dark:border-amber-500'
    : 'bg-teal-700 hover:bg-teal-800 border-teal-800 text-white dark:bg-teal-600 dark:hover:bg-teal-700 dark:border-teal-500';

  const secondaryButtonClass = isUserQuota
    ? 'border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/10'
    : 'border-teal-200 dark:border-teal-900/50 text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/10';

  return (
    <div className={`rounded-lg border p-6 mb-8 ${containerClass}`} role="alert">
      <div className="flex gap-3">
        <div className="flex-1 min-w-0">
          <h2 className={`text-base font-semibold ${titleClass}`}>{title}</h2>
          <p className={`mt-2 text-sm leading-relaxed ${bodyClass}`}>{apiQuota.message}</p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            {!isUserQuota && !isDemo && (
              <Link
                href="/dashboard#gemini-api-key"
                className={`inline-flex items-center rounded px-4 py-2 text-sm font-medium border transition-colors ${buttonClass}`}
              >
                Add your API key
              </Link>
            )}
            {!isUserQuota && isDemo && (
              <Link
                href="/login"
                className={`inline-flex items-center rounded px-4 py-2 text-sm font-medium border transition-colors ${buttonClass}`}
              >
                Sign in to use your own key
              </Link>
            )}
            {isUserQuota && (
              <>
                <a
                  href="https://ai.dev/rate-limit"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center rounded border bg-white dark:bg-zinc-900 px-4 py-2 text-sm font-medium transition-colors ${secondaryButtonClass}`}
                >
                  Check quota usage
                </a>
                <Link
                  href="/dashboard#gemini-api-key"
                  className={`inline-flex items-center rounded border bg-white dark:bg-zinc-900 px-4 py-2 text-sm font-medium transition-colors ${secondaryButtonClass}`}
                >
                  Update API key
                </Link>
              </>
            )}
            {!isUserQuota && !isDemo && (
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center rounded border bg-white dark:bg-zinc-900 px-4 py-2 text-sm font-medium transition-colors ${secondaryButtonClass}`}
              >
                Get a free key
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

