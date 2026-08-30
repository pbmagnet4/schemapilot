import type { AuditFindingInput } from '../types';

function generateId(prefix: string, counter: { n: number }): string {
  counter.n += 1;
  return `${prefix}-${counter.n}`;
}

export interface ContentQualityResult {
  wordCount: number;
  imageCount: number;
  imagesWithAlt: number;
  imagesWithoutAlt: number;
  findings: AuditFindingInput[];
}

export function auditContentQuality(doc: Document): ContentQualityResult {
  const counter = { n: 0 };
  const findings: AuditFindingInput[] = [];

  // Word count from body text
  const bodyText = doc.body?.innerText ?? '';
  const words = bodyText.trim().split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;

  if (wordCount < 300) {
    findings.push({
      id: generateId('cq', counter),
      category: 'content-quality',
      severity: 'high',
      title: 'Low word count',
      description: `Page has only ${wordCount} words. Quality content typically has 1,000+ words for competitive topics.`,
      affectedElements: [{ selector: 'body' }],
      sourceTool: 'assess_content_quality',
    });
  } else if (wordCount < 1000) {
    findings.push({
      id: generateId('cq', counter),
      category: 'content-quality',
      severity: 'low',
      title: 'Below recommended word count',
      description: `Page has ${wordCount} words. Consider expanding content to 1,000+ words for better depth and SEO value.`,
      affectedElements: [{ selector: 'body' }],
      sourceTool: 'assess_content_quality',
    });
  }

  // Image alt text check
  const images = Array.from(doc.querySelectorAll('img')) as HTMLImageElement[];
  const imageCount = images.length;
  const imagesWithoutAlt: HTMLImageElement[] = [];

  images.forEach((img) => {
    const alt = img.getAttribute('alt');
    if (alt === null) {
      imagesWithoutAlt.push(img);
    }
  });

  const imagesWithAlt = imageCount - imagesWithoutAlt.length;
  const imagesWithoutAltCount = imagesWithoutAlt.length;

  if (imagesWithoutAltCount > 0) {
    findings.push({
      id: generateId('cq', counter),
      category: 'content-quality',
      severity: 'medium',
      title: `Missing alt text on ${imagesWithoutAltCount} image(s)`,
      description: `Images without alt attributes are inaccessible to screen readers and miss SEO opportunities.`,
      affectedElements: imagesWithoutAlt.map((img) => ({
        selector: 'img',
        text: img.getAttribute('src') ?? '',
      })),
      sourceTool: 'assess_content_quality',
    });
  }

  if (imageCount > 0 && imagesWithAlt === 0) {
    findings.push({
      id: generateId('cq', counter),
      category: 'content-quality',
      severity: 'high',
      title: 'No images have alt text',
      description: `All ${imageCount} image(s) on the page lack alt attributes. This is a significant accessibility issue.`,
      affectedElements: images.map((img) => ({
        selector: 'img',
        text: img.getAttribute('src') ?? '',
      })),
      sourceTool: 'assess_content_quality',
    });
  }

  return {
    wordCount,
    imageCount,
    imagesWithAlt,
    imagesWithoutAlt: imagesWithoutAltCount,
    findings,
  };
}
