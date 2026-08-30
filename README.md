# SchemaPilot

**A WebMCP-enabled SEO audit tool that bridges AI agents and human expertise.**

SchemaPilot exposes 8 WebMCP tools on any webpage, letting an AI agent audit SEO instantly while a human corrects false positives in real time. The agent then re-audits with those corrections, producing a prioritized action list.

## Why WebMCP?

Existing SEO audit tools produce **static reports**. An LLM reads the report but can't iterate in the same context. SchemaPilot flips this:

1. **Agent runs audit** — calls tools that read the live page DOM
2. **Human corrects** — clicks any finding, adjusts severity, marks false positives, adds notes
3. **Agent re-audits** — `get_audit_summary()` reads the correction state and produces a prioritized action list

## WebMCP Tools (8)

| Tool | Description |
|------|-------------|
| `audit_structured_data` | Parse JSON-LD, OpenGraph, Twitter Card tags |
| `check_title_and_meta` | Extract title, meta desc, canonical, robots, viewport |
| `analyze_headings` | Map H1-H6 hierarchy, detect skips and missing H1 |
| `find_broken_links` | Check internal links for missing hrefs and empty text |
| `assess_content_quality` | Word count, image alt coverage, content depth |
| `check_internal_linking` | Internal link graph, orphaned sections |
| `audit_performance_signals` | Image dimensions, lazy loading, viewport meta |
| `get_audit_summary` | Aggregate findings + human corrections, prioritized actions |

## Tech Stack

- **Vite + React + TypeScript** — fast HMR, type safety
- **Tailwind CSS v4** — styling
- **[use-webmcp-tool](https://github.com/GoogleChromeLabs/use-webmcp-tool)** — React hook for WebMCP tool registration
- **Zustand** — state management for corrections
- DOM APIs for auditing (no backend needed)

## Development

```bash
npm install
npm run dev
```

### Testing WebMCP locally

1. Enable the flag: `chrome://flags/#enable-webmcp-testing`
2. Open SchemaPilot in ChatGPT's built-in browser (supports WebMCP out of the box)
3. Verify tool registration: `document.modelContext.getTools()`

### Building

```bash
npm run build
```

## Usage

```tsx
import { WebMCPIntegration } from './WebMCPIntegration';
import { AuditApp } from './components/AuditApp';

// Register all 8 WebMCP tools on mount
<WebMCPIntegration />

// UI for running audits and human corrections
<AuditApp />
```

## Architecture

```
src/
├── types.ts              # Shared types (Finding, Correction, Severity, etc.)
├── WebMCPIntegration.tsx # Registers 8 WebMCP tools via useWebMCP hook
├── lib/
│   ├── auditTitleAndMeta.ts      # Title/meta/robots/viewport audit
│   ├── auditHeadings.ts          # H1-H6 hierarchy analysis
│   ├── auditStructuredData.ts    # JSON-LD, OpenGraph, Twitter Card parsing
│   ├── auditLinks.ts             # Internal/external link checking
│   ├── auditContentQuality.ts    # Word count, alt text, content depth
│   ├── checkInternalLinking.ts   # Internal link graph analysis
│   ├── auditPerformanceSignals.ts # Image dimensions, lazy loading, viewport
│   ├── auditSummary.ts           # Corrections application + prioritized summary
│   ├── runFullAudit.ts            # Runs all 7 audit functions
│   └── store.ts                  # Zustand store for findings + corrections
└── components/
    ├── AuditApp.tsx              # Top bar, issue list, detail panel layout
    ├── IssueList.tsx             # Collapsible issue list with severity badges
    └── DetailPanel.tsx           # Correction controls (severity, notes, dismiss)
```

## License

MIT
