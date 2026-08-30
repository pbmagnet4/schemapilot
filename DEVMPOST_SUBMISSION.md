# SchemaPilot — WebMCP Challenge Submission

## Project URL
- **GitHub:** https://github.com/pbmagnet4/schemapilot
- **Demo Video:** 2-minute MP4 included in repo `public/schemapilot-demo.mp4`
- **WebMCP Tools:** 8 tools registered via `use-webmcp-tool`

## Why SchemaPilot is a Strong Fit for WebMCP

WebMCP fundamentally changes the SEO audit workflow. Existing tools (Ahrefs Site Audit, Screaming Frog, SEMrush) produce static reports. An LLM reads the report but **cannot iterate on it in the same context**. SchemaPilot leverages WebMCP's key advantage: **live DOM access via structured tools**.

SchemaPilot registers 8 WebMCP tools that read the live page DOM in real time. An AI agent calls these tools (just like function calls) to audit any webpage, while a human simultaneously corrects false positives through direct UI interaction. The agent then re-calls `get_audit_summary()` with the human's corrections baked in, producing a prioritized action list that reflects both machine analysis and human expertise.

## How This Creates a Better User Experience

**Traditional SEO audit flow:**
1. Run tool → get static report
2. LLM reads report
3. LLM produces recommendations
4. Human reviews recommendations (but can't tell the LLM "this was wrong")

**SchemaPilot flow:**
1. Agent calls `check_title_and_meta()`, `analyze_headings()`, `audit_structured_data()`, etc.
2. Human sees findings in real-time, clicks any item
3. Human dismisses false positives, adjusts severity, adds notes (e.g., "H1→H3 skip is intentional — card layout")
4. Human asks agent to re-audit → agent calls `get_audit_summary()`
5. Agent produces **corrected** prioritized action list

The key difference: **the agent's correction loop is live and bidirectional**. The human doesn't just read the agent's output — they shape it, and the agent incorporates that feedback in a single conversation.

## What People and Agents Can Do Together

### Collaborative SEO Audit
- **Agent:** Scans the entire page for 7 SEO categories (title/meta, headings, structured data, links, content quality, internal linking, performance)
- **Human:** Clicks any finding to dismiss false positives, adjust severity, or add implementation notes
- **Agent:** Re-runs with `get_audit_summary()` and produces a prioritized action list that reflects the human's corrections

### Real-time Correction Feedback
- Findings have `status: pending | corrected | dismissed`
- Corrections are stored in a Zustand store as a map keyed by finding ID
- When dismissed: the finding is excluded from the prioritized action list entirely
- When severity is adjusted: the finding's priority changes in the sorted output
- Human notes appear alongside findings in the final summary

### WebMCP Implementation
- Uses the `use-webmcp-tool` React hook (from GoogleChromeLabs) to register all 8 tools with AbortController lifecycle management
- All 7 audit tools have `readOnlyHint: true` (they only read the page DOM, never mutate)
- All 7 audit tools have `untrustedContentHint: true` (they return page content that could be manipulated)
- `get_audit_summary` has `readOnlyHint: true` but no `untrustedContentHint` (it returns structured text, not raw page content)
- Tool names are under 30 chars; all descriptions are under 500 chars
- The `get_audit_summary` tool accepts an optional `corrections` JSON string argument for agent-provided corrections

## Demo Video Walkthrough

The 2-minute demo (no audio — silent video) shows:

1. **0:00-0:15 — Tool Registration:** All 8 WebMCP tools register via `useWebMCP` hook
2. **0:15-0:40 — Agent Audit:** Agent calls all 7 audit tools (simulated), 15 findings appear (7 High, 8 Medium, 2 Low)
3. **0:40-0:65 — Human Corrections:** Human dismisses the H1→H3 heading skip as a false positive ("H3s are card section labels in our design system"), adds a note to the missing canonical link
4. **0:65-2:00 — Re-audit + Prioritized Actions:** Agent calls `get_audit_summary()`, produces prioritized action list with 16 active items (1 dismissed removed), sorted by severity with human notes visible

## Technical Details

### Tech Stack
- **Vite + React + TypeScript** — fast dev server, type safety
- **Tailwind CSS v4** — styling
- **use-webmcp-tool** (v0.2.0, MIT) — React hook for WebMCP tool registration
- **Zustand** (v5.14) — state management for findings + corrections
- **jsdom** (dev) — for testing audit functions in Node.js
- DOM APIs for all auditing (no backend needed)

### 8 WebMCP Tools

| # | Tool Name | Description |
|---|-----------|-------------|
| 1 | `audit_structured_data` | Parse JSON-LD, Microdata, OpenGraph, Twitter Card tags |
| 2 | `check_title_and_meta` | Extract title, meta desc, canonical, robots, viewport |
| 3 | `analyze_headings` | Map H1-H6 hierarchy, detect skips, missing/multiple H1 |
| 4 | `find_broken_links` | Check internal links for missing hrefs, empty text |
| 5 | `assess_content_quality` | Word count, image alt coverage, content depth |
| 6 | `check_internal_linking` | Internal link graph, orphaned sections |
| 7 | `audit_performance_signals` | Image dimensions, lazy loading, viewport meta |
| 8 | `get_audit_summary` | Aggregate findings + corrections → prioritized actions |

### File Structure
```
src/
├── types.ts                    # Finding, Correction, Severity types
├── WebMCPIntegration.tsx       # 8 WebMCP tool registrations
├── App.tsx                     # Root component
├── components/
│   ├── AuditApp.tsx            # Layout (top bar + 60/40 panels)
│   ├── IssueList.tsx           # Collapsible findings with badges
│   └── DetailPanel.tsx         # Correction controls
└── lib/
    ├── auditTitleAndMeta.ts    # Audit function 1
    ├── auditHeadings.ts        # Audit function 2
    ├── auditStructuredData.ts  # Audit function 3
    ├── auditLinks.ts           # Audit function 4
    ├── auditContentQuality.ts  # Audit function 5
    ├── checkInternalLinking.ts # Audit function 6
    ├── auditPerformanceSignals.ts # Audit function 7
    ├── auditSummary.ts         # Corrections + priority summary
    ├── runFullAudit.ts         # Runs all 7 audits
    └── store.ts                # Zustand store for state
```

## Testing

Run the terminal demo to see the audit + correction loop:
```bash
npx tsx scripts/demo.ts
```

This uses jsdom to load a sample HTML page with planted SEO issues, runs all 7 audit functions, applies human corrections (dismiss heading skip, downgrade severity), and generates the prioritized action list via `generateAuditSummary()`.
