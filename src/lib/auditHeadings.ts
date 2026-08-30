import type { AuditFindingInput } from '../types';

function generateId(prefix: string, counter: { n: number }): string {
  counter.n += 1;
  return `${prefix}-${counter.n}`;
}

export interface HeadingInfo {
  level: number;
  text: string;
  selector: string;
}

export interface HeadingsResult {
  headings: HeadingInfo[];
  findings: AuditFindingInput[];
}

export function auditHeadings(doc: Document): HeadingsResult {
  const counter = { n: 0 };
  const findings: AuditFindingInput[] = [];

  const headingEls = Array.from(
    doc.querySelectorAll('h1, h2, h3, h4, h5, h6'),
  ) as HTMLElement[];

  const headings: HeadingInfo[] = headingEls.map((el) => ({
    level: parseInt(el.tagName[1], 10),
    text: el.textContent?.trim() ?? '',
    selector: 'h' + el.tagName[1],
  }));

  const h1Count = headings.filter((h) => h.level === 1).length;

  if (h1Count === 0) {
    findings.push({
      id: generateId('hd', counter),
      category: 'headings',
      severity: 'critical',
      title: 'Missing H1 heading',
      description:
        'No <h1> tag found on the page. The H1 establishes the main topic for search engines and should appear once per page.',
      affectedElements: [],
      sourceTool: 'analyze_headings',
    });
  } else if (h1Count > 1) {
    findings.push({
      id: generateId('hd', counter),
      category: 'headings',
      severity: 'high',
      title: 'Multiple H1 headings',
      description: `Found ${h1Count} <h1> tags. Best practice is one H1 per page to clearly define the main topic.`,
      affectedElements: headingEls
        .filter((el) => el.tagName === 'H1')
        .map(() => ({ selector: 'h1' })),
      sourceTool: 'analyze_headings',
    });
  }

  // Check for heading level skips (e.g., H2 → H4)
  if (headings.length > 0) {
    for (let i = 1; i < headings.length; i++) {
      const prev = headings[i - 1];
      const curr = headings[i];
      const jump = curr.level - prev.level;
      if (jump > 1) {
        findings.push({
          id: generateId('hd', counter),
          category: 'headings',
          severity: 'medium',
          title: `Heading level skip (H${prev.level} → H${curr.level})`,
          description: `An H${prev.level} is followed directly by an H${curr.level}, skipping level(s). This can confuse search engine crawlers about the content hierarchy.`,
          affectedElements: [{ selector: `h${curr.level}` }],
          sourceTool: 'analyze_headings',
        });
      }
    }
  }

  // Check for empty headings
  const emptyHeadings = headingEls.filter((el) => {
    const text = el.textContent?.trim();
    return !text || text.length === 0;
  });
  if (emptyHeadings.length > 0) {
    findings.push({
      id: generateId('hd', counter),
      category: 'headings',
      severity: 'low',
      title: 'Empty heading(s) found',
      description: `${emptyHeadings.length} heading element(s) have no text content. Empty headings provide no semantic value.`,
      affectedElements: emptyHeadings.map(() => ({ selector: 'h' })),
      sourceTool: 'analyze_headings',
    });
  }

  return { headings, findings };
}
