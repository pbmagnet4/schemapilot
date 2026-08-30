export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type FindingCategory =
  | 'title-meta'
  | 'headings'
  | 'structured-data'
  | 'links'
  | 'content-quality'
  | 'internal-linking'
  | 'performance';

export interface AffectedElement {
  selector: string;
  text?: string | null;
}

export interface Finding {
  id: string;
  category: FindingCategory;
  severity: Severity;
  title: string;
  description: string;
  affectedElements: AffectedElement[];
  status: 'pending' | 'corrected' | 'dismissed';
  humanNote?: string;
  humanSeverity?: Severity;
  sourceTool: string;
}

export interface AuditFindingInput {
  id: string;
  category: FindingCategory;
  severity: Severity;
  title: string;
  description: string;
  affectedElements: AffectedElement[];
  sourceTool: string;
}

export interface Correction {
  findingId: string;
  dismissed: boolean;
  severityOverride?: Severity;
  note: string;
}

export interface AuditResult {
  findings: Finding[];
  corrections: Record<string, Correction>;
  summary: string;
  timestamp: number;
}
