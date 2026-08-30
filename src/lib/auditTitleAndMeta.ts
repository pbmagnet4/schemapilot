import type { AuditFindingInput } from '../types';

function generateId(prefix: string, counter: { n: number }): string {
  counter.n += 1;
  return `${prefix}-${counter.n}`;
}

export interface TitleMetaResult {
  title: string | null;
  titleLength: number;
  metaDescription: string | null;
  metaDescriptionLength: number;
  canonical: string | null;
  robots: string[];
  viewport: string | null;
  findings: AuditFindingInput[];
}

export function auditTitleAndMeta(doc: Document): TitleMetaResult {
  const counter = { n: 0 };
  const findings: AuditFindingInput[] = [];

  const titleEl = doc.querySelector('title');
  const title = titleEl?.textContent ?? null;
  const titleLength = title ? title.trim().length : 0;

  const descEl = doc.querySelector('meta[name="description"]');
  const metaDescription = descEl?.getAttribute('content') ?? null;
  const metaDescriptionLength = metaDescription ? metaDescription.trim().length : 0;

  const canonicalEl = doc.querySelector('link[rel="canonical"]');
  const canonical = canonicalEl?.getAttribute('href') ?? null;

  const robotsEls = Array.from(doc.querySelectorAll('meta[name="robots"]'));
  const robots = robotsEls.map((el) => el.getAttribute('content') ?? '');

  const viewportEl = doc.querySelector('meta[name="viewport"]');
  const viewport = viewportEl?.getAttribute('content') ?? null;

  // Title checks
  if (!titleEl) {
    findings.push({
      id: generateId('tm', counter),
      category: 'title-meta',
      severity: 'critical',
      title: 'Missing <title> tag',
      description:
        'Every page must have a <title> element. It is required by search engines and shown as the clickable headline in SERPs.',
      affectedElements: [],
      sourceTool: 'check_title_and_meta',
    });
  } else if (titleLength === 0) {
    findings.push({
      id: generateId('tm', counter),
      category: 'title-meta',
      severity: 'critical',
      title: 'Empty <title> tag',
      description: 'The <title> element exists but has no text content.',
      affectedElements: [{ selector: 'title' }],
      sourceTool: 'check_title_and_meta',
    });
  } else if (titleLength > 60) {
    findings.push({
      id: generateId('tm', counter),
      category: 'title-meta',
      severity: 'medium',
      title: 'Title tag exceeds recommended length',
      description: `Title is ${titleLength} characters. Recommended range is 50–60 characters to avoid truncation in search results.`,
      affectedElements: [{ selector: 'title', text: title }],
      sourceTool: 'check_title_and_meta',
    });
  }

  // Meta description checks
  if (!descEl) {
    findings.push({
      id: generateId('tm', counter),
      category: 'title-meta',
      severity: 'medium',
      title: 'Missing meta description',
      description:
        'No <meta name="description"> found. While not a direct ranking factor, a good description improves click-through rate.',
      affectedElements: [],
      sourceTool: 'check_title_and_meta',
    });
  } else if (metaDescriptionLength === 0) {
    findings.push({
      id: generateId('tm', counter),
      category: 'title-meta',
      severity: 'medium',
      title: 'Empty meta description',
      description: 'The meta description tag exists but has no content attribute value.',
      affectedElements: [{ selector: 'meta[name="description"]' }],
      sourceTool: 'check_title_and_meta',
    });
  } else if (metaDescriptionLength > 160) {
    findings.push({
      id: generateId('tm', counter),
      category: 'title-meta',
      severity: 'low',
      title: 'Meta description exceeds recommended length',
      description: `Description is ${metaDescriptionLength} characters. Recommended range is 120–160 characters.`,
      affectedElements: [{ selector: 'meta[name="description"]', text: metaDescription }],
      sourceTool: 'check_title_and_meta',
    });
  } else if (metaDescriptionLength < 50) {
    findings.push({
      id: generateId('tm', counter),
      category: 'title-meta',
      severity: 'low',
      title: 'Meta description is too short',
      description: `Description is only ${metaDescriptionLength} characters. Aim for 120–160 characters for rich snippets.`,
      affectedElements: [{ selector: 'meta[name="description"]', text: metaDescription }],
      sourceTool: 'check_title_and_meta',
    });
  }

  // Canonical checks
  if (!canonicalEl) {
    findings.push({
      id: generateId('tm', counter),
      category: 'title-meta',
      severity: 'high',
      title: 'Missing canonical link',
      description:
        'No <link rel="canonical"> tag found. This can cause duplicate content issues if the page is accessible via multiple URLs.',
      affectedElements: [],
      sourceTool: 'check_title_and_meta',
    });
  }

  // Viewport checks
  if (!viewportEl) {
    findings.push({
      id: generateId('tm', counter),
      category: 'title-meta',
      severity: 'high',
      title: 'Missing viewport meta tag',
      description:
        'No <meta name="viewport"> found. This causes mobile rendering issues and hurts Core Web Vitals on mobile.',
      affectedElements: [],
      sourceTool: 'check_title_and_meta',
    });
  }

  // Robots tag checks
  if (robots.length > 0) {
    const noindex = robots.some(
      (r) => r.toLowerCase().includes('noindex'),
    );
    if (noindex) {
      findings.push({
        id: generateId('tm', counter),
        category: 'title-meta',
        severity: 'critical',
        title: 'Page is set to noindex',
        description:
          'A robots meta tag contains "noindex". The page will not appear in search results.',
        affectedElements: Array.from(robotsEls).map(() => ({ selector: 'meta[name="robots"]' })),
        sourceTool: 'check_title_and_meta',
      });
    }
  }

  return {
    title,
    titleLength,
    metaDescription,
    metaDescriptionLength,
    canonical,
    robots,
    viewport,
    findings,
  };
}
