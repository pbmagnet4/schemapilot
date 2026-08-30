import type {
  AuditFindingInput,
  Correction,
  Finding,
  Severity,
} from '../types';

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

const SEVERITY_LABELS: Record<Severity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  info: 'Info',
};

function getEffectiveSeverity(f: Finding): Severity {
  return f.humanSeverity ?? f.severity;
}

export function applyCorrections(
  findings: AuditFindingInput[],
  corrections: Record<string, Correction>,
): Finding[] {
  return findings.map((f) => {
    const correction = corrections[f.id];
    if (correction) {
      const status = correction.dismissed ? 'dismissed' : 'corrected';
      return {
        ...f,
        status,
        humanNote: correction.note,
        humanSeverity: correction.severityOverride,
      };
    }
    return { ...f, status: 'pending' as const };
  });
}

export function generateAuditSummary(
  findings: Finding[],
  _corrections: Record<string, Correction>,
): string {
  const activeFindings = findings.filter((f) => f.status !== 'dismissed');
  const dismissedCount = findings.length - activeFindings.length;

  const bySeverity = {
    critical: activeFindings.filter((f) => getEffectiveSeverity(f) === 'critical'),
    high: activeFindings.filter((f) => getEffectiveSeverity(f) === 'high'),
    medium: activeFindings.filter((f) => getEffectiveSeverity(f) === 'medium'),
    low: activeFindings.filter((f) => getEffectiveSeverity(f) === 'low'),
  };

  const prioritized = [...activeFindings].sort((a, b) => {
    return SEVERITY_RANK[getEffectiveSeverity(a)] - SEVERITY_RANK[getEffectiveSeverity(b)];
  });

  const lines: string[] = [];
  lines.push('## SEO Audit Summary - Prioritized Action List');
  lines.push('');
  lines.push(`**Page:** ${typeof window !== 'undefined' ? window.location.href : '(unknown)'}`)
  lines.push(`**Total findings:** ${findings.length} | **Active:** ${activeFindings.length} | **Dismissed by human:** ${dismissedCount}`)
  lines.push('');
  lines.push('### Priority Breakdown');
  lines.push('');
  lines.push(`- Critical: ${bySeverity.critical.length}`);
  lines.push(`- High: ${bySeverity.high.length}`);
  lines.push(`- Medium: ${bySeverity.medium.length}`);
  lines.push(`- Low: ${bySeverity.low.length}`);
  lines.push('');
  lines.push('### Prioritized Actions (top 20)');
  lines.push('');

  prioritized.slice(0, 20).forEach((f, i) => {
    const sev = getEffectiveSeverity(f);
    const label = f.humanSeverity ? SEVERITY_LABELS[f.humanSeverity] : SEVERITY_LABELS[sev];
    const note = f.humanNote ? ` *(Human note: ${f.humanNote})*` : '';
    lines.push(`${i + 1}. **[${label}]** ${f.title} - ${f.description}${note}`);
  });

  if (prioritized.length > 20) {
    lines.push('');
    lines.push(`... and ${prioritized.length - 20} more action(s).`);
  }

  if (dismissedCount > 0) {
    lines.push('');
    lines.push(`### Dismissed by Human (${dismissedCount})`);
    findings.filter((f) => f.status === 'dismissed').forEach((f) => {
      lines.push(`- ${f.title}`);
    });
  }

  return lines.join('\n');
}
