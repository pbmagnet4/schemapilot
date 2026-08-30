import type { AuditFindingInput } from '../types';

function generateId(prefix: string, counter: { n: number }): string {
  counter.n += 1;
  return `${prefix}-${counter.n}`;
}

export interface LinkInfo {
  href: string;
  text: string;
  isInternal: boolean;
  isExternal: boolean;
  element: HTMLAnchorElement;
}

export interface LinksResult {
  links: LinkInfo[];
  findings: AuditFindingInput[];
}

export function auditLinks(doc: Document): LinksResult {
  const counter = { n: 0 };
  const findings: AuditFindingInput[] = [];

  const anchors = Array.from(doc.querySelectorAll('a[href]')) as HTMLAnchorElement[];
  const origin = doc.location.origin;
  const homeUrl = origin + '/';

  const links: LinkInfo[] = anchors.map((el) => {
    const href = el.getAttribute('href') ?? '';
    let isInternal = false;
    let isExternal = false;
    try {
      const url = new URL(href, doc.baseURI);
      if (url.origin === origin || href.startsWith('/')) {
        isInternal = true;
      } else {
        isExternal = true;
      }
    } catch {
      // Relative URL without base
      isInternal = href.startsWith('/') || !href.includes('://');
    }
    return {
      href,
      text: el.textContent?.trim().slice(0, 80) ?? '',
      isInternal,
      isExternal,
      element: el,
    };
  });

  // Find broken links (mock: check if href is empty or just "#")
  const brokenLinks = links.filter(
    (l) => !l.href || l.href === '#' || l.href === '' || l.href.startsWith('javascript:'),
  );
  if (brokenLinks.length > 0) {
    findings.push({
      id: generateId('lk', counter),
      category: 'links',
      severity: 'high',
      title: 'Broken or invalid links found',
      description: `${brokenLinks.length} anchor element(s) have missing or invalid href attributes.`,
      affectedElements: brokenLinks.map((l) => ({
        selector: 'a',
        text: l.text,
      })),
      sourceTool: 'find_broken_links',
    });
  }

  // Find links with no text content (empty anchor text)
  const emptyTextLinks = links.filter(
    (l) => !l.text || l.text.length === 0,
  );
  if (emptyTextLinks.length > 0) {
    findings.push({
      id: generateId('lk', counter),
      category: 'links',
      severity: 'medium',
      title: 'Links with no anchor text',
      description: `${emptyTextLinks.length} link(s) have empty anchor text. Screen readers and search engines cannot determine the link's purpose.`,
      affectedElements: emptyTextLinks.map(() => ({
        selector: 'a[href]',
        text: '[empty]',
      })),
      sourceTool: 'find_broken_links',
    });
  }

  // Check for links pointing to homepage with just "/"
  const homepageLinks = links.filter((l) => l.href === '/' || l.href === homeUrl);
  if (homepageLinks.length > 0) {
    findings.push({
      id: generateId('lk', counter),
      category: 'links',
      severity: 'low',
      title: 'Multiple homepage links',
      description: `${homepageLinks.length} link(s) point to the homepage root. Consider using descriptive anchor text.`,
      affectedElements: homepageLinks.map((l) => ({
        selector: 'a[href="/"]',
        text: l.text,
      })),
      sourceTool: 'find_broken_links',
    });
  }

  const internalLinks = links.filter((l) => l.isInternal);

  if (internalLinks.length === 0) {
    findings.push({
      id: generateId('lk', counter),
      category: 'links',
      severity: 'medium',
      title: 'No internal links found',
      description:
        'No internal links detected. Internal linking helps distribute page authority and improves crawlability.',
      affectedElements: [],
      sourceTool: 'find_broken_links',
    });
  }

  return { links, findings };
}
