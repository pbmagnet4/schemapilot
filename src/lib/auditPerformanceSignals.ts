import type { AuditFindingInput } from '../types';

function generateId(prefix: string, counter: { n: number }): string {
  counter.n += 1;
  return `${prefix}-${counter.n}`;
}

export interface PerformanceResult {
  imagesWithoutDimensions: number;
  imagesWithoutLazyLoad: number;
  findings: AuditFindingInput[];
}

export function auditPerformanceSignals(doc: Document): PerformanceResult {
  const counter = { n: 0 };
  const findings: AuditFindingInput[] = [];

  const images = Array.from(doc.querySelectorAll('img')) as HTMLImageElement[];
  const imagesWithoutDimensions: HTMLImageElement[] = [];
  const imagesWithoutLazyLoad: HTMLImageElement[] = [];

  images.forEach((img) => {
    const width = img.getAttribute('width');
    const height = img.getAttribute('height');
    const hasDimensions = width !== null && height !== null;
    if (!hasDimensions) {
      imagesWithoutDimensions.push(img);
    }

    const loading = img.getAttribute('loading');
    if (!loading) {
      imagesWithoutLazyLoad.push(img);
    }
  });

  if (imagesWithoutDimensions.length > 0) {
    findings.push({
      id: generateId('pf', counter),
      category: 'performance',
      severity: 'medium',
      title: `Missing width/height on ${imagesWithoutDimensions.length} image(s)`,
      description:
        'Images without explicit width and height can cause layout shift (CLS). Set dimensions to reserve space before images load.',
      affectedElements: imagesWithoutDimensions.map((img) => ({
        selector: 'img',
        text: img.getAttribute('src') ?? '',
      })),
      sourceTool: 'audit_performance_signals',
    });
  }

  if (imagesWithoutLazyLoad.length > 0) {
    findings.push({
      id: generateId('pf', counter),
      category: 'performance',
      severity: 'low',
      title: `Images without lazy loading`,
      description: `${imagesWithoutLazyLoad.length} image(s) lack loading="lazy". Adding it improves initial page load performance.`,
      affectedElements: imagesWithoutLazyLoad.map((img) => ({
        selector: 'img',
        text: img.getAttribute('src') ?? '',
      })),
      sourceTool: 'audit_performance_signals',
    });
  }

  // Check for viewport meta tag (already checked in title/meta, but included for completeness)
  const viewportEl = doc.querySelector('meta[name="viewport"]');
  if (!viewportEl) {
    findings.push({
      id: generateId('pf', counter),
      category: 'performance',
      severity: 'high',
      title: 'Missing viewport meta tag',
      description:
        'No <meta name="viewport"> found. This causes mobile rendering issues and hurts Core Web Vitals.',
      affectedElements: [],
      sourceTool: 'audit_performance_signals',
    });
  }

  return {
    imagesWithoutDimensions: imagesWithoutDimensions.length,
    imagesWithoutLazyLoad: imagesWithoutLazyLoad.length,
    findings,
  };
}
