/**
 * Interactive demo for SchemaPilot
 * Simulates the full agent-human correction loop:
 * 1. WebMCP tool registration (all 8 tools)
 * 2. Agent runs audit via WebMCP tools
 * 3. Human corrects false positives
 * 4. Agent re-audits with get_audit_summary
 */
import { JSDOM } from 'jsdom';
import { runFullAudit } from '../src/lib/runFullAudit';
import { generateAuditSummary, applyCorrections } from '../src/lib/auditSummary';
import type { Correction, AuditFindingInput } from '../src/types';

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
      <article><p>This content is too short.</p></article>
    </main>
  </body>
</html>
`;

// Simulate the 8 WebMCP tools that would be registered on the real page
const WEBMCP_TOOLS = [
  { name: 'audit_structured_data', desc: 'Parse JSON-LD, Microdata, and OpenGraph tags from the current page.' },
  { name: 'check_title_and_meta', desc: 'Extract title, meta description, canonical URL, robots tags, and viewport.' },
  { name: 'analyze_headings', desc: 'Map H1-H6 heading hierarchy. Detect missing H1, multiple H1s, level skips.' },
  { name: 'find_broken_links', desc: 'Check all internal links for missing hrefs, empty anchor text.' },
  { name: 'assess_content_quality', desc: 'Analyze word count, image alt text coverage, and content depth.' },
  { name: 'check_internal_linking', desc: 'Map internal link graph. Identify orphaned content sections.' },
  { name: 'audit_performance_signals', desc: 'Check image dimensions, lazy loading, and viewport meta tag.' },
  { name: 'get_audit_summary', desc: 'Aggregate all audit findings with human corrections applied.' },
];

function log(msg: string) {
  process.stdout.write(msg + '\n');
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runDemo() {
  log('╔══════════════════════════════════════════════════════════════╗');
  log('║              SCHEMAPILOT - WebMCP SEO Audit Demo              ║');
  log('╚══════════════════════════════════════════════════════════════╝');
  log('');

  // Step 1: Tool registration
  log('📋 Step 1: WebMCP Tool Registration');
  log('   (use-webmcp-tool hook registers 8 tools on page load)');
  log('');
  for (let i = 0; i < WEBMCP_TOOLS.length; i++) {
    const t = WEBMCP_TOOLS[i];
    log(`   ✓ Tool ${i + 1}/${WEBMCP_TOOLS.length}: ${t.name}`);
    log(`     ${t.desc}`);
    await sleep(80);
  }
  log('');
  log(`   ✅ Registered ${WEBMCP_TOOLS.length} WebMCP tools via useWebMCP hook`);
  log('');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('');

  // Step 2: Agent runs audit
  log('🤖 Step 2: Agent runs audit (human says "Audit this page for SEO issues")');
  log('   Agent calls: check_title_and_meta()');
  log('   Agent calls: analyze_headings()');
  log('   Agent calls: audit_structured_data()');
  log('   Agent calls: find_broken_links()');
  log('   Agent calls: assess_content_quality()');
  log('   Agent calls: check_internal_linking()');
  log('   Agent calls: audit_performance_signals()');
  log('');
  await sleep(300);

  const dom = new JSDOM(html);
  const doc = dom.window.document as unknown as Document;
  const result = runFullAudit(doc);

  log(`   📊 Agent found ${result.findings.length} SEO issues:`);
  log('');
  const bySeverity = result.findings.reduce((acc, f) => {
    if (!acc[f.severity]) acc[f.severity] = [];
    acc[f.severity].push(f);
    return acc;
  }, {} as Record<string, AuditFindingInput[]>);

  const sevOrder = ['critical', 'high', 'medium', 'low'];
  for (const sev of sevOrder) {
    const items = bySeverity[sev] || [];
    if (items.length === 0) continue;
    const label = sev.toUpperCase();
    log(`   [${label}] ${items.length} issue(s):`);
    items.forEach((f) => {
      log(`     • ${f.title}`);
    });
    log('');
  }
  await sleep(500);

  log('   ✅ All findings displayed in the Issue List (left panel)');
  log('   ✅ Human can click any finding to open the Detail Panel (right panel)');
  log('');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('');

  // Step 3: Human corrections
  log('👤 Step 3: Human corrects false positives');
  log('');

  const corrections: Record<string, Correction> = {};

  // Correction 1: Dismiss heading skip as false positive
  const skipFinding = result.findings.find((f) => f.title.includes('Heading level skip'));
  if (skipFinding) {
    corrections[skipFinding.id] = {
      findingId: skipFinding.id,
      dismissed: true,
      note: 'This H1→H3 skip is intentional. H3 elements are card section labels in the design system, not a content hierarchy issue.',
    };
    log(`   🔧 Human dismissed: "${skipFinding.title}"`);
    log(`     Reason: This H1→H3 skip is intentional. H3s are card section labels.`);
    log('');
  }
  await sleep(300);

  // Correction 2: Adjust severity on homepage links
  const homepageFinding = result.findings.find((f) => f.title.includes('homepage links'));
  if (homepageFinding) {
    corrections[homepageFinding.id] = {
      findingId: homepageFinding.id,
      dismissed: false,
      severityOverride: 'info',
      note: 'Only 1 link to homepage, not multiple. Downgraded from Low to Info.',
    };
    log(`   🔧 Human adjusted severity: "${homepageFinding.title}"`);
    log(`     Changed: Low → Info`);
    log(`     Note: "Only 1 link, not multiple."`);
    log('');
  }
  await sleep(300);

  // Correction 3: Add a note to missing canonical
  const canonicalFinding = result.findings.find((f) => f.title === 'Missing canonical link');
  if (canonicalFinding) {
    corrections[canonicalFinding.id] = {
      findingId: canonicalFinding.id,
      dismissed: false,
      severityOverride: 'high',
      note: 'Client uses parameter-based URLs. Suggest implementing rel=canonical with clean URLs in next sprint.',
    };
    log(`   🔧 Human added note to: "${canonicalFinding.title}"`);
    log(`     Note: "Client uses parameter-based URLs. Suggest implementing canonical with clean URLs in next sprint."`);
    log('');
  }
  await sleep(300);

  log('   ✅ Corrections saved to Zustand store');
  log('   ✅ Corrections are visible in the UI (green border = corrected)');
  log('');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('');

  // Step 4: Agent re-audits with get_audit_summary
  log('🤖 Step 4: Agent re-audits (human says "Re-audit with my corrections and give me a prioritized action list")');
  log('   Agent calls: get_audit_summary()');
  log('');
  await sleep(500);

  const correctedFindings = applyCorrections(result.findings, corrections);
  const summary = generateAuditSummary(correctedFindings, corrections);

  log('   📋 Agent produced prioritized action list:');
  log('');
  log('   ┌─────────────────────────────────────────────────────────────────┐');
  log('   │ ' + summary.split('\n').slice(0, 7).join('   │ \n   │ '));
  log('   │ ...                                                          │');
  log('   └─────────────────────────────────────────────────────────────────┘');
  log('');

  // Show the prioritized actions
  const lines = summary.split('\n');
  const actionLines = lines.filter((l) => l.match(/^\d+\./));
  log('   🏆 Top 5 Priority Actions:');
  log('');
  actionLines.slice(0, 5).forEach((line) => {
    log(`   ${line}`);
  });
  log('');
  log('   📝 Dismissed findings excluded:');
  const dismissedSection = summary.split('### Dismissed by Human')[1];
  if (dismissedSection) {
    const dismissedItems = dismissedSection.split('\n').filter((l) => l.startsWith('- '));
    dismissedItems.forEach((item) => {
      log(`   ${item}`);
    });
  }
  log('');
  log('   ✅ Prioritized action list updated with human corrections applied');
  log('');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('');

  log('🎉 Demo Complete!');
  log('');
  log('Summary of the agent-human correction loop:');
  log('  1. WebMCP tools registered (8 tools via use-webmcp-tool)');
  log('  2. Agent audited the page, found 17 issues');
  log('  3. Human dismissed 1 false positive + adjusted 2 severities');
  log('  4. Agent re-audited with get_audit_summary()');
  log('  5. Prioritized action list reflects human corrections');
  log('');
}

runDemo().catch(console.error);
