const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

const TICKER_PATTERN = /^[A-Z0-9][A-Z0-9.-]{0,9}$/;

export type TickerValidationResult = {
  valid: boolean;
  status: string;
  message: string;
};

export function isValidTickerFormat(ticker: string): boolean {
  return TICKER_PATTERN.test(ticker.trim().toUpperCase());
}

export function getTickerFormatError(ticker: string): string | null {
  const trimmed = ticker.trim().toUpperCase();
  if (!trimmed) return null;
  if (!isValidTickerFormat(trimmed)) {
    return 'Enter a valid ticker symbol (1–10 characters, no spaces).';
  }
  return null;
}

export async function validateTicker(ticker: string): Promise<TickerValidationResult | null> {
  const trimmed = ticker.trim().toUpperCase();
  const formatError = getTickerFormatError(trimmed);
  if (formatError) {
    return {
      valid: false,
      status: 'invalid_ticker',
      message: formatError,
    };
  }

  try {
    const res = await fetch(`${API_URL}/validate-ticker/${encodeURIComponent(trimmed)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}