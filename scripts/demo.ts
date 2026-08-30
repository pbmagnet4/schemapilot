/**
 * Demo script for SchemaPilot
 * Runs the full audit on sample-page.html, simulates human corrections,
 * and generates the prioritized action list — all in Node.js with jsdom.
 */
import { JSDOM } from 'jsdom';
import { runFullAudit } from '../src/lib/runFullAudit';
import { generateAuditSummary, applyCorrections } from '../src/lib/auditSummary';
import type { Correction } from '../src/types';

const html = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="description" content="A page with intentional SEO issues for SchemaPilot demo" />
    <title>Sample Page with Planted SEO Issues for Demo Testing</title>
  </head>
  <body>
    <main>
      <h1>Welcome to SchemaPilot Demo</h1>

      <h3>Key Features</h3>
      <p>SchemaPilot is a browser-based SEO audit tool.</p>

      <h3>How It Works</h3>
      <p>It uses WebMCP to expose tools to AI agents.</p>

      <img src="/placeholder.png" />
      <img src="/another.png" />

      <p><a href="#">Jump to top</a></p>
      <p><a href="https://other-site.com">External link</a></p>

      <article>
        <p>This content is too short.</p>
      </article>
    </main>
  </body>
</html>
`;

function border(title: string): string {
  return `═══ ${title} ═══`;
}

function run() {
  console.log(border('SchemaPilot Demo - Agent-Human Correction Loop'));
  console.log('');

  // Step 1: Load the sample page in jsdom
  const dom = new JSDOM(html);
  const doc = dom.window.document as unknown as Document;

  // Step 2: Agent runs audit
  console.log('Agent runs full audit via 8 WebMCP tools');
  console.log('');
  const result = runFullAudit(doc);
  console.log(`Found ${result.findings.length} issues:\n`);

  result.findings.forEach((f: typeof result.findings[0], i: number) => {
    console.log(`  ${i + 1}. [${f.severity.toUpperCase()}] ${f.title}`);
    console.log(`     -> ${f.description}`);
  });

  console.log('\n');

  // Step 3: Human corrects a false positive
  console.log(border('Human corrects false positives'));
  console.log('');

  const corrections: Record<string, Correction> = {};

  // The heading skip from H1 to H3 - human says "this is intentional"
  const headingSkipFinding = result.findings.find(
    (f: typeof result.findings[0]) => f.title.includes('Heading level skip'),
  );
  if (headingSkipFinding) {
    corrections[headingSkipFinding.id] = {
      findingId: headingSkipFinding.id,
      dismissed: true,
      note: 'This H1->H3 skip is intentional. H3 elements are section labels in a card layout, not a hierarchy skip.',
      severityOverride: undefined,
    };
    console.log(`Human dismissed: "${headingSkipFinding.title}"`);
    console.log(`  Note: "This H1->H3 skip is intentional. H3 elements are section labels..."`);
  }

  // Also downgrade severity on "Multiple homepage links" (only 1, not multiple)
  const homepageFinding = result.findings.find(
    (f: typeof result.findings[0]) => f.title.includes('Multiple homepage links'),
  );
  if (homepageFinding) {
    corrections[homepageFinding.id] = {
      findingId: homepageFinding.id,
      dismissed: false,
      severityOverride: 'info',
      note: 'Only 1 link, not multiple. Downgraded severity.',
    };
    console.log(`\nHuman adjusted: "${homepageFinding.title}"`);
    console.log(`  Severity changed to: info`);
  }

  console.log('\n');

  // Step 4: Agent re-runs with corrections
  console.log(border('Agent re-audits with corrections -> prioritized action list'));
  console.log('');

  const correctedFindings = applyCorrections(result.findings, corrections);
  const summary = generateAuditSummary(correctedFindings, corrections);
  console.log(summary);

  console.log('\n');
  console.log(border('Demo complete'));
}

run();
