'use client';

import Link from 'next/link';

export interface ApiQuota {
  status: 'ok' | 'server_exhausted' | 'user_exhausted' | 'partial' | 'invalid_key';
  used_custom_key: boolean;
  using_demo_key?: boolean;
  failed_tickers: string[];
  invalid_tickers?: string[];
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

  const isInvalidKey = apiQuota.status === 'invalid_key';

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
        : apiQuota.status === 'invalid_key'
          ? 'Invalid Gemini API Key'
          : isUserQuota
            ? 'Some briefings blocked by your API quota'
            : 'Some briefings blocked by the shared API limit';

  const containerClass = isInvalidKey
    ? 'bg-rose-50/30 dark:bg-rose-950/10 border-rose-200 dark:border-rose-900/40'
    : isUserQuota
      ? 'bg-amber-50/30 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900/40'
      : 'bg-teal-50/30 dark:bg-teal-950/10 border-teal-200 dark:border-teal-900/40';

  const titleClass = isInvalidKey
    ? 'text-rose-800 dark:text-rose-300'
    : isUserQuota
      ? 'text-amber-800 dark:text-amber-300'
      : 'text-teal-800 dark:text-teal-300';

  const bodyClass = isInvalidKey
    ? 'text-rose-700 dark:text-rose-400'
    : isUserQuota
      ? 'text-amber-700 dark:text-amber-400'
      : 'text-teal-700 dark:text-teal-400';

  const buttonClass = isInvalidKey
    ? 'bg-rose-700 hover:bg-rose-800 border-rose-800 text-white dark:bg-rose-600 dark:hover:bg-rose-700 dark:border-rose-500'
    : isUserQuota
      ? 'bg-amber-700 hover:bg-amber-800 border-amber-800 text-white dark:bg-amber-600 dark:hover:bg-amber-700 dark:border-amber-500'
      : 'bg-teal-700 hover:bg-teal-800 border-teal-800 text-white dark:bg-teal-600 dark:hover:bg-teal-700 dark:border-teal-500';

  const secondaryButtonClass = isInvalidKey
    ? 'border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/10'
    : isUserQuota
      ? 'border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/10'
      : 'border-teal-200 dark:border-teal-900/50 text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/10';

  return (
    <div className={`rounded-lg border p-6 mb-8 ${containerClass}`} role="alert">
      <div className="flex gap-3">
        <div className="flex-1 min-w-0">
          <h2 className={`text-base font-semibold ${titleClass}`}>{title}</h2>
          <p className={`mt-2 text-sm leading-relaxed ${bodyClass}`}>{apiQuota.message}</p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            {isInvalidKey && (
              <Link
                href="/dashboard#gemini-api-key"
                className={`inline-flex items-center rounded px-4 py-2 text-sm font-medium border transition-colors ${buttonClass}`}
              >
                Update API key
              </Link>
            )}
            {!isInvalidKey && !isUserQuota && !isDemo && (
              <Link
                href="/dashboard#gemini-api-key"
                className={`inline-flex items-center rounded px-4 py-2 text-sm font-medium border transition-colors ${buttonClass}`}
              >
                Add your API key
              </Link>
            )}
            {!isInvalidKey && !isUserQuota && isDemo && (
              <Link
                href="/login"
                className={`inline-flex items-center rounded px-4 py-2 text-sm font-medium border transition-colors ${buttonClass}`}
              >
                Sign in to use your own key
              </Link>
            )}
            {!isInvalidKey && isUserQuota && (
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
            {!isInvalidKey && !isUserQuota && !isDemo && (
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
