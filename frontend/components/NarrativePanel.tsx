'use client';

const cleanMarkdown = (text: string) => {
  if (!text) return '';
  return text
    .replace(/\*\*/g, '') // Remove bold markers
    .split('\n')
    .map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        return '• ' + trimmed.substring(2);
      }
      return line;
    })
    .join('\n');
};

export default function NarrativePanel({ narrative }: { narrative: string }) {
  // Parse sections from the narrative text using a robust regex to handle Markdown bold formatting and multi-line content
  const sections: Record<string, string> = {};

  const regex = /(?:^|\n)(?:\*|-|\s)*(PORTFOLIO_SUMMARY|SHARED_RISKS|CONCENTRATION_WARNING|WEEKLY_WATCHLIST)(?:\*)*\s*:\s*([\s\S]*?)(?=(?:\n(?:\*|-|\s)*(?:PORTFOLIO_SUMMARY|SHARED_RISKS|CONCENTRATION_WARNING|WEEKLY_WATCHLIST)(?:\*)*\s*:)|$)/gi;

  let match;
  while ((match = regex.exec(narrative)) !== null) {
    const key = match[1].toUpperCase();
    const val = match[2].trim();
    if (key === 'PORTFOLIO_SUMMARY') sections.summary = val;
    else if (key === 'SHARED_RISKS') sections.risks = val;
    else if (key === 'CONCENTRATION_WARNING') sections.concentration = val;
    else if (key === 'WEEKLY_WATCHLIST') sections.watchlist = val;
  }

  // Fallback parsing line-by-line if regex matched nothing
  if (Object.keys(sections).length === 0) {
    narrative.split("\n").forEach(line => {
      const cleanLine = line.replace(/^[\*\-\s]+/, '').trim();
      const cleanUpper = cleanLine.toUpperCase();
      if (cleanUpper.startsWith("PORTFOLIO_SUMMARY:") || cleanUpper.startsWith("**PORTFOLIO_SUMMARY**:")) {
        sections.summary = cleanLine.substring(cleanLine.indexOf(":") + 1).trim();
      } else if (cleanUpper.startsWith("SHARED_RISKS:") || cleanUpper.startsWith("**SHARED_RISKS**:")) {
        sections.risks = cleanLine.substring(cleanLine.indexOf(":") + 1).trim();
      } else if (cleanUpper.startsWith("CONCENTRATION_WARNING:") || cleanUpper.startsWith("**CONCENTRATION_WARNING**:")) {
        sections.concentration = cleanLine.substring(cleanLine.indexOf(":") + 1).trim();
      } else if (cleanUpper.startsWith("WEEKLY_WATCHLIST:") || cleanUpper.startsWith("**WEEKLY_WATCHLIST**:")) {
        sections.watchlist = cleanLine.substring(cleanLine.indexOf(":") + 1).trim();
      }
    });
  }

  const activeCards = [];

  if (sections.risks) {
    activeCards.push(
      <div key="risks" className="bg-white dark:bg-zinc-900 border border-rose-100 dark:border-rose-950/20 rounded p-5">
        <h3 className="text-sm font-semibold text-rose-800 dark:text-rose-400 flex items-center mb-2.5">
          Shared Risks
        </h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 m-0 whitespace-pre-line leading-relaxed">{cleanMarkdown(sections.risks)}</p>
      </div>
    );
  }

  if (sections.concentration) {
    activeCards.push(
      <div key="concentration" className="bg-white dark:bg-zinc-900 border border-amber-100 dark:border-amber-950/20 rounded p-5">
        <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-400 flex items-center mb-2.5">
          Concentration Warning
        </h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 m-0 whitespace-pre-line leading-relaxed">{cleanMarkdown(sections.concentration)}</p>
      </div>
    );
  }

  if (sections.watchlist) {
    activeCards.push(
      <div key="watchlist" className="bg-white dark:bg-zinc-900 border border-teal-100 dark:border-teal-950/20 rounded p-5">
        <h3 className="text-sm font-semibold text-teal-800 dark:text-teal-400 flex items-center mb-2.5">
          Watch This Week
        </h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 m-0 whitespace-pre-line leading-relaxed">{cleanMarkdown(sections.watchlist)}</p>
      </div>
    );
  }

  // Dynamically compute columns based on the number of active cards to prevent empty space next to them
  const gridColsClass = activeCards.length === 1
    ? 'grid-cols-1'
    : activeCards.length === 2
      ? 'grid-cols-1 md:grid-cols-2'
      : 'grid-cols-1 md:grid-cols-3';

  return (
    <div className="bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
      <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white mt-0 mb-4 flex items-center">
        <svg className="w-5.5 h-5.5 mr-2 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Briefing Digest
      </h2>

      {sections.summary && (
        <p className="text-zinc-700 dark:text-zinc-300 text-sm leading-relaxed mb-6 whitespace-pre-line">
          {cleanMarkdown(sections.summary)}
        </p>
      )}

      {activeCards.length > 0 && (
        <div className={`grid gap-5 mt-6 ${gridColsClass}`}>
          {activeCards}
        </div>
      )}
    </div>
  );
}

