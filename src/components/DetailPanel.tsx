import type { Finding, Severity } from '../types';

const SEVERITY_OPTIONS: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];

interface DetailPanelProps {
  finding: Finding | null;
  onClose: () => void;
  onDismiss: (findingId: string, note?: string) => void;
  onSeverityChange: (findingId: string, severity: Severity) => void;
  onNoteChange: (findingId: string, note: string) => void;
}

export function DetailPanel({
  finding,
  onClose,
  onDismiss,
  onSeverityChange,
  onNoteChange,
}: DetailPanelProps) {
  if (!finding) {
    return (
      <div className="p-6 bg-gray-50 dark:bg-gray-800 h-full flex flex-col">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Details</h2>
        <div className="text-gray-500 dark:text-gray-400 text-sm">
          Select a finding to see details and correction options.
        </div>
      </div>
    );
  }

  const currentSeverity = finding.humanSeverity ?? finding.severity;

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-800 h-full overflow-y-auto">
      <div className="flex items-start justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Details</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          ✕
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <span
            className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
              currentSeverity === 'critical'
                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                : currentSeverity === 'high'
                ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200'
                : currentSeverity === 'medium'
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200'
                : currentSeverity === 'low'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
            }`}
          >
            {currentSeverity}
          </span>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Category: {finding.category}
          </p>
        </div>

        <div>
          <h3 className="font-medium text-gray-900 dark:text-white">{finding.title}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            {finding.description}
          </p>
        </div>

        {finding.affectedElements.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Affected elements
            </h4>
            <ul className="space-y-1">
              {finding.affectedElements.map((el, i) => (
                <li key={i} className="text-xs">
                  <code className="bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-800 dark:text-gray-200">
                    {el.selector}
                  </code>
                  {el.text && (
                    <span className="text-gray-500 dark:text-gray-400 ml-2">
                      — "{el.text.slice(0, 60)}"{el.text.length > 60 && '…'}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {finding.status === 'corrected' && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
            <p className="text-xs text-green-800 dark:text-green-200">
              ✅ Corrected by human
              {finding.humanSeverity &&
                ` — severity changed to ${finding.humanSeverity}`}
              {finding.humanNote && ` — "${finding.humanNote}"`}
            </p>
          </div>
        )}

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Human correction
          </h4>

          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">
              Adjust severity
            </label>
            <div className="flex gap-2 flex-wrap">
              {SEVERITY_OPTIONS.map((sev) => (
                <button
                  key={sev}
                  onClick={() => onSeverityChange(finding.id, sev)}
                  className={`px-3 py-1 text-xs rounded border transition-colors ${
                    currentSeverity === sev
                      ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                      : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">
              Notes (for the agent)
            </label>
            <textarea
              value={finding.humanNote ?? ''}
              onChange={(e) => onNoteChange(finding.id, e.target.value)}
              placeholder="e.g., 'This H1 skip is intentional — H4 is a section label'"
              className="w-full text-sm px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              rows={3}
            />
          </div>

          <button
            onClick={() => onDismiss(finding.id, 'Dismissed by human')}
            className="w-full px-3 py-1.5 text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          >
            Dismiss (false positive)
          </button>
        </div>
      </div>
    </div>
  );
}
