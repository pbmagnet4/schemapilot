import { useState } from 'react';
import type { Finding, Severity, FindingCategory } from '../types';

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
  low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
  info: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
};

const SEVERITY_LABELS: Record<Severity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  info: 'Info',
};

const CATEGORY_LABELS: Record<FindingCategory, string> = {
  'title-meta': 'Title & Meta',
  headings: 'Headings',
  'structured-data': 'Structured Data',
  links: 'Links',
  'content-quality': 'Content Quality',
  'internal-linking': 'Internal Linking',
  performance: 'Performance',
};

interface IssueListProps {
  findings: Finding[];
  onSelect: (finding: Finding) => void;
}

export function IssueList({ findings, onSelect }: IssueListProps) {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  if (findings.length === 0) {
    return (
      <div className="p-6">
        <p className="text-gray-500 dark:text-gray-400">No findings yet. Click "Run Full Audit" to get started.</p>
      </div>
    );
  }

  const byCategory = findings.reduce((acc, f) => {
    if (!acc[f.category]) acc[f.category] = [];
    acc[f.category].push(f);
    return acc;
  }, {} as Record<string, Finding[]>);

  const totalActive = findings.filter((f) => f.status !== 'dismissed').length;

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">
            {totalActive} active finding{totalActive !== 1 ? 's' : ''}
          </span>
          <span className="text-gray-400 dark:text-gray-500">
            {findings.filter((f) => f.status === 'dismissed').length} dismissed
          </span>
        </div>
      </div>

      {Object.entries(byCategory).map(([category]) => {
        const catsFindings = byCategory[category];
        const active = catsFindings.filter((f) => f.status !== 'dismissed');
        if (active.length === 0) return null;

        const isOpen = expandedCategories[category] ?? true;

        return (
          <div key={category} className="mb-3">
            <button
              onClick={() =>
                setExpandedCategories((prev) => ({ ...prev, [category]: !prev[category] }))
              }
              className="w-full flex items-center justify-between px-3 py-2 text-left bg-gray-100 dark:bg-gray-700/50 rounded-t-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="font-medium text-sm">
                {CATEGORY_LABELS[category as FindingCategory]}
              </span>
              <span className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full">
                {active.length}
              </span>
            </button>

            {isOpen && (
              <div className="border-l-2 border-gray-200 dark:border-gray-600 ml-[18px] pl-2 mt-1 space-y-1">
                {active.map((finding) => {
                  const isCorrected = finding.status === 'corrected';
                  return (
                    <div
                      key={finding.id}
                      onClick={() => onSelect(finding)}
                      className={`group p-3 rounded-md border cursor-pointer transition-all text-sm ${
                        isCorrected
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium shrink-0 ${
                            SEVERITY_COLORS[finding.humanSeverity ?? finding.severity]
                          }`}
                        >
                          {SEVERITY_LABELS[finding.humanSeverity ?? finding.severity]}
                        </span>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {finding.title}
                          </div>
                          <p className="text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                            {finding.description}
                          </p>
                          {isCorrected && finding.humanNote && (
                            <div className="mt-1 text-xs text-green-700 dark:text-green-300">
                              💬 {finding.humanNote}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
