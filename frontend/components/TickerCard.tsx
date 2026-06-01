'use client';

export default function TickerCard({ summary }: { summary: any }) {
  const getSentimentLabel = () => {
    if (summary.sentiment) return summary.sentiment;
    if (summary.sentiment_score !== undefined && summary.sentiment_score !== null) {
      if (summary.sentiment_score > 0) return 'positive';
      if (summary.sentiment_score < 0) return 'negative';
      return 'neutral';
    }
    return 'unknown';
  };

  const sentiment = getSentimentLabel().toLowerCase();
  const sentimentStyles: Record<string, string> = {
    positive: "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30",
    negative: "text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/30",
    neutral: "text-zinc-700 bg-zinc-100 dark:text-zinc-400 dark:bg-zinc-800",
    unknown: "text-zinc-700 bg-zinc-100 dark:text-zinc-400 dark:bg-zinc-800"
  };
  const sentimentStyle = sentimentStyles[sentiment] || sentimentStyles.unknown;

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 bg-white dark:bg-zinc-900">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 m-0">{summary.ticker}</h2>
        <span className={`rounded px-2.5 py-0.5 text-xs font-medium capitalize ${sentimentStyle}`}>
          {getSentimentLabel()}
        </span>
      </div>
      <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-4 leading-relaxed">
        {summary.summary}
      </p>
      
      <div className="mt-5 space-y-2.5">
        {summary.key_risk && (
          <div className="flex items-start bg-rose-50/50 dark:bg-rose-950/10 p-3 rounded border border-rose-100/80 dark:border-rose-950/30">
            <p className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed m-0">
              <span className="font-semibold mr-1.5 text-rose-700 dark:text-rose-400">Risk:</span>
              {summary.key_risk}
            </p>
          </div>
        )}
        {summary.key_opportunity && (
          <div className="flex items-start bg-emerald-50/50 dark:bg-emerald-950/10 p-3 rounded border border-emerald-100/80 dark:border-emerald-950/30">
            <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed m-0">
              <span className="font-semibold mr-1.5 text-emerald-700 dark:text-emerald-400">Opportunity:</span>
              {summary.key_opportunity}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
