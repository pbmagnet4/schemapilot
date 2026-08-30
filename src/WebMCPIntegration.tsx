import { useEffect, useState } from 'react';
import { useWebMCP } from 'use-webmcp-tool';
import { runFullAudit } from './lib/runFullAudit';
import { auditTitleAndMeta } from './lib/auditTitleAndMeta';
import { auditHeadings } from './lib/auditHeadings';
import { auditStructuredData } from './lib/auditStructuredData';
import { auditLinks } from './lib/auditLinks';
import { auditContentQuality } from './lib/auditContentQuality';
import { checkInternalLinking } from './lib/checkInternalLinking';
import { auditPerformanceSignals } from './lib/auditPerformanceSignals';
import { generateAuditSummary, applyCorrections } from './lib/auditSummary';
import { useAuditStore } from './lib/store';
import type { Correction } from './types';

function safeSerialize(obj: unknown): string {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WebMCPArgs = Record<string, any>;

export function WebMCPIntegration() {
  const { corrections, setFindings, addCorrections } = useAuditStore();
  const [registrationStatus, setRegistrationStatus] = useState({
    supported: false,
    registered: false,
    error: null as Error | null,
  });

  // Tool 1: audit_structured_data
  useWebMCP({
    name: 'audit_structured_data',
    description:
      'Parse JSON-LD, Microdata, and OpenGraph tags from the current page. Returns structured data types found, missing, or invalid.',
    inputSchema: {},
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: () => {
      const result = auditStructuredData(document);
      return safeSerialize({
        jsonLdCount: result.jsonLd.length,
        jsonLdTypes: result.jsonLd.map((ld) => {
          if (ld && typeof ld === 'object' && '@type' in ld) {
            return (ld as { '@type': string })['@type'];
          }
          return typeof ld;
        }),
        openGraph: result.openGraph,
        twitterCard: result.twitterCard,
      });
    },
  });

  // Tool 2: check_title_and_meta
  useWebMCP({
    name: 'check_title_and_meta',
    description:
      'Extract title, meta description, canonical URL, robots tags, and viewport from the page. Flag length issues and missing fields.',
    inputSchema: {},
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: () => {
      const result = auditTitleAndMeta(document);
      return safeSerialize({
        title: result.title,
        titleLength: result.titleLength,
        metaDescription: result.metaDescription,
        metaDescriptionLength: result.metaDescriptionLength,
        canonical: result.canonical,
        robots: result.robots,
        viewport: result.viewport,
      });
    },
  });

  // Tool 3: analyze_headings
  useWebMCP({
    name: 'analyze_headings',
    description:
      'Map H1-H6 heading hierarchy. Detect missing H1, multiple H1s, heading level skips, and empty headings.',
    inputSchema: {},
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: () => {
      const result = auditHeadings(document);
      return safeSerialize({
        headingCount: result.headings.length,
        h1Count: result.headings.filter((h) => h.level === 1).length,
        headings: result.headings,
      });
    },
  });

  // Tool 4: find_broken_links
  useWebMCP({
    name: 'find_broken_links',
    description:
      'Check all internal links for missing hrefs, empty anchor text, and homepage redirect patterns. Returns link count and broken URLs.',
    inputSchema: {},
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: () => {
      const result = auditLinks(document);
      return safeSerialize({
        totalLinks: result.links.length,
        internalLinks: result.links.filter((l) => l.isInternal).length,
        externalLinks: result.links.filter((l) => l.isExternal).length,
        links: result.links.map((l) => ({
          href: l.href,
          text: l.text,
          isInternal: l.isInternal,
          isExternal: l.isExternal,
        })),
      });
    },
  });

  // Tool 5: assess_content_quality
  useWebMCP({
    name: 'assess_content_quality',
    description:
      'Analyze word count, image alt text coverage, and content depth. Flag low word count and missing alt attributes.',
    inputSchema: {},
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: () => {
      const result = auditContentQuality(document);
      return safeSerialize({
        wordCount: result.wordCount,
        imageCount: result.imageCount,
        imagesWithAlt: result.imagesWithAlt,
        imagesWithoutAlt: result.imagesWithoutAlt,
      });
    },
  });

  // Tool 6: check_internal_linking
  useWebMCP({
    name: 'check_internal_linking',
    description:
      'Map internal link graph. Identify orphaned content sections and suggest cross-linking opportunities between related pages.',
    inputSchema: {},
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: () => {
      const result = checkInternalLinking(document);
      return safeSerialize({
        internalLinkCount: result.internalLinkCount,
        orphanedSections: result.orphanedSections,
      });
    },
  });

  // Tool 7: audit_performance_signals
  useWebMCP({
    name: 'audit_performance_signals',
    description:
      'Check image dimensions, lazy loading, and viewport meta tag. Return findings about layout shift risks and mobile rendering.',
    inputSchema: {},
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: () => {
      const result = auditPerformanceSignals(document);
      return safeSerialize({
        imagesWithoutDimensions: result.imagesWithoutDimensions,
        imagesWithoutLazyLoad: result.imagesWithoutLazyLoad,
      });
    },
  });

  // Tool 8: get_audit_summary
  useWebMCP({
    name: 'get_audit_summary',
    description:
      'Aggregate all audit findings with human corrections applied. Returns a prioritized action list sorted by severity.',
    inputSchema: {
      type: 'object',
      properties: {
        corrections: {
          type: 'string',
          description: 'JSON string of human corrections to apply (optional).',
        },
      },
      required: [],
    },
    annotations: { readOnlyHint: true },
    execute: (args: WebMCPArgs) => {
      let externalCorrections: Record<string, Correction> = {};
      if (args?.corrections) {
        try {
          externalCorrections = JSON.parse(args.corrections);
        } catch {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: invalid corrections JSON provided.',
              },
            ],
            isError: true,
          };
        }
      }

      const fullResult = runFullAudit(document);
      const allCorrections = { ...corrections, ...externalCorrections };
      const appliedFindings = applyCorrections(fullResult.findings, allCorrections);
      const summary = generateAuditSummary(appliedFindings, allCorrections);
      return summary;
    },
  });

  // Track aggregate registration state
  useEffect(() => {
    const mc = document as unknown as Record<string, unknown>;
    setRegistrationStatus({
      supported: Boolean(mc.modelContext),
      registered: Boolean(mc.modelContext),
      error: null,
    });
    window.addEventListener('modelcontextloaded', () => {
      const mc2 = document as unknown as Record<string, unknown>;
      setRegistrationStatus({
        supported: Boolean(mc2.modelContext),
        registered: Boolean(mc2.modelContext),
        error: null,
      });
    });
  }, []);

  // Expose audit runner to the global scope for the UI
  useEffect(() => {
    const win = window as unknown as Record<string, unknown>;
    win.runSchemaPilotAudit = () => {
      const result = runFullAudit(document);
      setFindings(result.findings);
      return result.findings;
    };

    win.applyHumanCorrections = (newCorrections: Record<string, Correction>) => {
      addCorrections(newCorrections);
    };
  }, [setFindings, addCorrections]);

  return (
    <div style={{ display: 'none' }}>
      <div data-testid="webmcp-status">
        Supported: {registrationStatus.supported ? 'yes' : 'no'} |
        Registered: {registrationStatus.registered ? 'yes' : 'no'}
        {registrationStatus.error && (
          <span> | Error: {registrationStatus.error.message}</span>
        )}
      </div>
    </div>
  );
}
