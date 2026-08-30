import type { AuditFindingInput } from '../types';

function generateId(prefix: string, counter: { n: number }): string {
  counter.n += 1;
  return `${prefix}-${counter.n}`;
}

export interface InternalLinkingResult {
  internalLinkCount: number;
  orphanedSections: string[];
  findings: AuditFindingInput[];
}

export function checkInternalLinking(doc: Document): InternalLinkingResult {
  const counter = { n: 0 };
  const findings: AuditFindingInput[] = [];

  const anchors = Array.from(doc.querySelectorAll('a[href]')) as HTMLAnchorElement[];
  const origin = doc.location.origin;

  const internalLinks = anchors.filter((el) => {
    const href = el.getAttribute('href') ?? '';
    try {
      const url = new URL(href, doc.baseURI);
      return url.origin === origin;
    } catch {
      return href.startsWith('/') || !href.includes('://');
    }
  });

  // Find content sections without links
  const contentSections = Array.from(
    doc.querySelectorAll('article, main, section, .content, .body'),
  );
  const orphanedSections: string[] = [];

  contentSections.forEach((section) => {
    const sectionLinks = section.querySelectorAll('a[href]');
    if (sectionLinks.length === 0) {
      const selector = section.tagName.toLowerCase() + (section.className ? '.' + section.className.split(' ').join('.') : '');
      orphanedSections.push(selector);
    }
  });

  if (orphanedSections.length > 0) {
    findings.push({
      id: generateId('il', counter),
      category: 'internal-linking',
      severity: 'medium',
      title: 'Orphaned content sections',
      description: `Found ${orphanedSections.length} content section(s) with no internal links. Adding cross-links helps search engines discover and rank pages.`,
      affectedElements: orphanedSections.map((s) => ({ selector: s })),
      sourceTool: 'check_internal_linking',
    });
  }

  if (internalLinks.length < 3) {
    findings.push({
      id: generateId('il', counter),
      category: 'internal-linking',
      severity: 'medium',
      title: 'Insufficient internal links',
      description: `Page has only ${internalLinks.length} internal link(s). A well-linked page typically has at least 3-5 internal links to related content.`,
      affectedElements: [],
      sourceTool: 'check_internal_linking',
    });
  }

  return {
    internalLinkCount: internalLinks.length,
    orphanedSections,
    findings,
  };
}
