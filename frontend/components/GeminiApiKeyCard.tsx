'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'gemini_api_key';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

type KeyStatus = 'unset' | 'checking' | 'valid' | 'rate_limited' | 'invalid' | 'error';

async function validateKey(key: string) {
  const res = await fetch(`${API_URL}/validate-gemini-key`, {
    method: 'POST',
    headers: { 'X-Gemini-API-Key': key },
  });
  return res.json() as Promise<{
    valid: boolean;
    status: string;
    message: string;
  }>;
}

function statusFromResponse(data: { valid: boolean; status: string }): KeyStatus {
  if (!data.valid) {
    if (data.status === 'invalid' || data.status === 'missing') return 'invalid';
    return 'error';
  }
  if (data.status === 'rate_limited') return 'rate_limited';
  return 'valid';
}

export default function GeminiApiKeyCard() {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<KeyStatus>('unset');
  const [message, setMessage] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [hasSavedKey, setHasSavedKey] = useState(false);

  const runValidation = useCallback(async (key: string, silent = false) => {
    const trimmed = key.trim();
    if (!trimmed) {
      setStatus('unset');
      setMessage('');
      return;
    }

    setStatus('checking');
    if (!silent) setMessage('Checking key format…');

    try {
      const data = await validateKey(trimmed);
      const nextStatus = statusFromResponse(data);
      setStatus(nextStatus);
      setMessage(data.message || '');
      return data;
    } catch {
      setStatus('error');
      setMessage('Could not reach the server.');
      return null;
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) || '';
    setHasSavedKey(Boolean(stored));
    if (stored) {
      setApiKey(stored);
      setIsDirty(false);
      runValidation(stored, true);
    }
  }, [runValidation]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = apiKey.trim();

    if (!trimmed) {
      localStorage.removeItem(STORAGE_KEY);
      setHasSavedKey(false);
      setStatus('unset');
      setMessage('API key removed. System default key will be used for briefings.');
      setIsDirty(false);
      return;
    }

    const data = await runValidation(trimmed);
    if (!data?.valid) return;

    localStorage.setItem(STORAGE_KEY, trimmed);
    setHasSavedKey(true);
    setIsDirty(false);
    setMessage(
      data.status === 'ok'
        ? 'Key saved. Briefings will use your Gemini quota.'
        : 'Key saved.',
    );
  };

  const handleClear = () => {
    localStorage.removeItem(STORAGE_KEY);
    setHasSavedKey(false);
    setApiKey('');
    setStatus('unset');
    setMessage('API key removed. System default key will be used for briefings.');
    setIsDirty(false);
  };

  const statusBadge = (() => {
    switch (status) {
      case 'checking':
        return { label: 'Checking…', className: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300' };
      case 'valid':
        return { label: 'Connected', className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' };
      case 'rate_limited':
        return { label: 'Quota limited', className: 'bg-amber-50 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400' };
      case 'invalid':
        return { label: 'Invalid', className: 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400' };
      case 'error':
        return { label: 'Error', className: 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400' };
      default:
        return isDirty && apiKey.trim()
          ? { label: 'Not verified', className: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400' }
          : { label: 'Not configured', className: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400' };
    }
  })();

  const borderClass =
    status === 'valid'
      ? 'border-emerald-200 dark:border-emerald-900/50'
      : status === 'rate_limited'
        ? 'border-amber-200 dark:border-amber-900/50'
        : status === 'invalid' || status === 'error'
          ? 'border-rose-200 dark:border-rose-900/50'
          : 'border-zinc-200 dark:border-zinc-800';

  const messageClass =
    status === 'valid'
      ? 'text-emerald-700 dark:text-emerald-400'
      : status === 'rate_limited'
        ? 'text-amber-700 dark:text-amber-400'
        : status === 'invalid' || status === 'error'
          ? 'text-rose-600 dark:text-rose-400'
          : 'text-zinc-500 dark:text-zinc-400';

  return (
    <div
      id="gemini-api-key"
      className={`bg-white dark:bg-zinc-900 border rounded-lg p-6 mb-8 scroll-mt-24 ${borderClass}`}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="max-w-xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-base font-semibold text-zinc-900 dark:text-white">Custom Gemini API Key</h3>
              <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${statusBadge.className}`}>
                {statusBadge.label}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
              Optional. Use your own key from{' '}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-600 hover:text-teal-700 dark:text-teal-400 underline font-medium"
              >
                Google AI Studio
              </a>{' '}
              so briefings use your quota instead of the shared server limit.
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <input
                type={showKey ? 'text' : 'password'}
                placeholder="Paste your API key"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setIsDirty(true);
                  if (status !== 'unset' && status !== 'checking') {
                    setStatus('unset');
                    setMessage('');
                  }
                }}
                autoComplete="off"
                className="block w-full rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 pl-3.5 pr-12 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-teal-500 focus:ring-0 focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 px-1"
                aria-label={showKey ? 'Hide API key' : 'Show API key'}
              >
                {showKey ? 'HIDE' : 'SHOW'}
              </button>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                type="submit"
                disabled={status === 'checking' || !apiKey.trim()}
                className="inline-flex items-center justify-center rounded bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[7.5rem]"
              >
                {status === 'checking' ? 'Checking…' : 'Save Key'}
              </button>
              {(apiKey.trim() || hasSavedKey) && (
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={status === 'checking'}
                  className="inline-flex items-center justify-center rounded border border-zinc-200 dark:border-zinc-700 px-3.5 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          {message && (
            <p className={`text-xs leading-relaxed font-medium ${messageClass}`} role="status">
              {message}
            </p>
          )}

          {!isDirty && hasSavedKey && (status === 'valid' || status === 'rate_limited') && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Stored key saved. Edit the field and click Save Key to change it.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

