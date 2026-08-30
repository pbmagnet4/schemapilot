import { useState } from 'react';
import { useAuditStore } from '../lib/store';
import { runFullAudit } from '../lib/runFullAudit';
import { IssueList } from './IssueList';
import { DetailPanel } from './DetailPanel';
import type { Finding, Severity } from '../types';

export function AuditApp() {
  const [url, setUrl] = useState('');
  const [targetMode, setTargetMode] = useState<'current' | 'url'>('current');
  const [activeFinding, setActiveFinding] = useState<Finding | null>(null);

  const { findings, setFindings, dismissFinding, updateCorrection, clearAudit } =
    useAuditStore();

  const handleRunAudit = () => {
    setFindings(runFullAudit(document).findings);
    if (window.location.href) {
      setUrl(window.location.href);
    }
  };

  const handleUrlAudit = () => {
    if (!url) return;
    // In a real implementation, this would load the page in an iframe
    // For the demo, we audit the current document
    handleRunAudit();
  };

  const handleDismiss = (findingId: string, note?: string) => {
    dismissFinding(findingId, note);
  };

  const handleSeverityChange = (findingId: string, severity: Severity) => {
    updateCorrection(findingId, {
      findingId,
      severityOverride: severity,
      dismissed: false,
      note: '',
    });
  };

  const handleNoteChange = (findingId: string, note: string) => {
    updateCorrection(findingId, {
      findingId,
      note,
    });
  };

  const handleClear = () => {
    clearAudit();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
      {/* Top bar */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-4">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">SchemaPilot</h1>
        <span className="text-sm text-gray-500 dark:text-gray-400">SEO Audit via WebMCP</span>

        <div className="ml-auto flex items-center gap-3">
          <select
            value={targetMode}
            onChange={(e) => setTargetMode(e.target.value as 'current' | 'url')}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-gray-50 dark:bg-gray-700"
          >
            <option value="current">Current Page</option>
            <option value="url">URL (demo: current page)</option>
          </select>

          {targetMode === 'url' && (
            <input
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 w-64 bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}

          <button
            onClick={targetMode === 'url' ? handleUrlAudit : handleRunAudit}
            className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
          >
            Run Full Audit
          </button>

          <button
            onClick={handleClear}
            className="px-3 py-1 text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Clear
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex h-[calc(100vh-56px)]">
        {/* Left panel — 60% */}
        <div className="w-3/5 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
          <IssueList findings={findings} onSelect={setActiveFinding} />
        </div>

        {/* Right panel — 40% */}
        <div className="w-2/5 overflow-y-auto">
          <DetailPanel
            finding={activeFinding}
            onClose={() => setActiveFinding(null)}
            onDismiss={handleDismiss}
            onSeverityChange={handleSeverityChange}
            onNoteChange={handleNoteChange}
          />
        </div>
      </div>
    </div>
  );
}
