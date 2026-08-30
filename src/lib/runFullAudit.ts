import type { AuditFindingInput } from '../types';
import { auditTitleAndMeta } from './auditTitleAndMeta';
import { auditHeadings } from './auditHeadings';
import { auditStructuredData } from './auditStructuredData';
import { auditLinks } from './auditLinks';
import { auditContentQuality } from './auditContentQuality';
import { checkInternalLinking } from './checkInternalLinking';
import { auditPerformanceSignals } from './auditPerformanceSignals';

export interface FullAuditResult {
  findings: AuditFindingInput[];
}

export function runFullAudit(doc: Document): FullAuditResult {
  const findings: AuditFindingInput[] = [];

  const titleMeta = auditTitleAndMeta(doc);
  findings.push(...titleMeta.findings);

  const headings = auditHeadings(doc);
  findings.push(...headings.findings);

  const structuredData = auditStructuredData(doc);
  findings.push(...structuredData.findings);

  const links = auditLinks(doc);
  findings.push(...links.findings);

  const contentQuality = auditContentQuality(doc);
  findings.push(...contentQuality.findings);

  const internalLinking = checkInternalLinking(doc);
  findings.push(...internalLinking.findings);

  const performance = auditPerformanceSignals(doc);
  findings.push(...performance.findings);

  return { findings };
}
