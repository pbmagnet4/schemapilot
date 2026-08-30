import type { AuditFindingInput } from '../types';

function generateId(prefix: string, counter: { n: number }): string {
  counter.n += 1;
  return `${prefix}-${counter.n}`;
}

export interface StructuredDataResult {
  jsonLd: unknown[];
  openGraph: Record<string, string>;
  twitterCard: Record<string, string>;
  findings: AuditFindingInput[];
}

export function auditStructuredData(doc: Document): StructuredDataResult {
  const counter = { n: 0 };
  const findings: AuditFindingInput[] = [];

  // Parse JSON-LD
  const jsonLdScripts = Array.from(
    doc.querySelectorAll('script[type="application/ld+json"]'),
  );
  const jsonLd: unknown[] = [];
  for (const script of jsonLdScripts) {
    const raw = script.textContent?.trim();
    if (!raw) {
      findings.push({
        id: generateId('sd', counter),
        category: 'structured-data',
        severity: 'low',
        title: 'Empty JSON-LD script',
        description: 'A <script type="application/ld+json"> exists but has no content.',
        affectedElements: [{ selector: 'script[type="application/ld+json"]' }],
        sourceTool: 'audit_structured_data',
      });
      continue;
    }
    try {
      const parsed = JSON.parse(raw);
      jsonLd.push(parsed);
    } catch {
      findings.push({
        id: generateId('sd', counter),
        category: 'structured-data',
        severity: 'high',
        title: 'Invalid JSON-LD syntax',
        description: 'A JSON-LD script block contains invalid JSON and cannot be parsed.',
        affectedElements: [{ selector: 'script[type="application/ld+json"]', text: raw.slice(0, 100) }],
        sourceTool: 'audit_structured_data',
      });
    }
  }

  // Check for missing structured data
  if (jsonLd.length === 0) {
    findings.push({
      id: generateId('sd', counter),
      category: 'structured-data',
      severity: 'high',
      title: 'No JSON-LD structured data found',
      description:
        'No JSON-LD markup detected. Structured data helps search engines understand page content for rich results.',
      affectedElements: [],
      sourceTool: 'audit_structured_data',
    });
  }

  // Parse OpenGraph tags
  const openGraph: Record<string, string> = {};
  const ogEls = doc.querySelectorAll('meta[name^="og"]');
  ogEls.forEach((el) => {
    const name = el.getAttribute('name');
    const content = el.getAttribute('content');
    if (name && content) {
      openGraph[name] = content;
    }
  });

  const hasOgTitle = 'og:title' in openGraph;
  const hasOgDescription = 'og:description' in openGraph;
  const hasOgImage = 'og:image' in openGraph;

  if (!hasOgTitle) {
    findings.push({
      id: generateId('sd', counter),
      category: 'structured-data',
      severity: 'medium',
      title: 'Missing og:title',
      description:
        'No OpenGraph og:title meta tag found. Without it, shared links may show the page <title> which can be suboptimal.',
      affectedElements: [],
      sourceTool: 'audit_structured_data',
    });
  }
  if (!hasOgDescription) {
    findings.push({
      id: generateId('sd', counter),
      category: 'structured-data',
      severity: 'medium',
      title: 'Missing og:description',
      description: 'No OpenGraph og:description meta tag found. Shared links will lack a compelling description.',
      affectedElements: [],
      sourceTool: 'audit_structured_data',
    });
  }
  if (!hasOgImage) {
    findings.push({
      id: generateId('sd', counter),
      category: 'structured-data',
      severity: 'medium',
      title: 'Missing og:image',
      description:
        'No OpenGraph og:image meta tag found. Shared links will not have a preview image.',
      affectedElements: [],
      sourceTool: 'audit_structured_data',
    });
  }

  // Parse Twitter Card tags
  const twitterCard: Record<string, string> = {};
  const twitterEls = doc.querySelectorAll('meta[name^="twitter"]');
  twitterEls.forEach((el) => {
    const name = el.getAttribute('name');
    const content = el.getAttribute('content');
    if (name && content) {
      twitterCard[name] = content;
    }
  });

  if (!('twitter:card' in twitterCard)) {
    findings.push({
      id: generateId('sd', counter),
      category: 'structured-data',
      severity: 'low',
      title: 'Missing Twitter Card tags',
      description:
        'No Twitter Card meta tags found. Adding them improves link previews when shared on X/Twitter.',
      affectedElements: [],
      sourceTool: 'audit_structured_data',
    });
  }

  return { jsonLd, openGraph, twitterCard, findings };
}
