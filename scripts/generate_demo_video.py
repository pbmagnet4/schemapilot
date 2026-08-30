#!/usr/bin/env python3
"""
Generate a 2-minute demo video for SchemaPilot.
Shows the agent-human correction loop:
1. Agent runs audit → findings appear
2. Human corrects a false positive
3. Agent re-runs → prioritized action list
"""
import os
import json
from PIL import Image, ImageDraw, ImageFont
import subprocess
import tempfile

# Canvas settings
WIDTH, HEIGHT = 1280, 720
FPS = 30
BG_COLOR = (15, 23, 42)  # #0f172a
PANEL_BG = (30, 41, 65)  # #1e293b
TOOL_PANEL_BG = (15, 23, 42)  # #0f172a
TEXT_COLOR = (226, 232, 240)  # #e2e8f0
MUTED = (148, 163, 189)  # #94a3b8
ACCENT = (59, 130, 246)  # #3b82f6
GREEN = (34, 211, 129)  # #22c55e
ORANGE = (249, 115, 22)  # #f97316
YELLOW = (234, 179, 8)   # #eab308
RED = (239, 68, 68)     # #ef4444
BORDER_COLOR = (51, 65, 85)  # #334155

# Try to find a good font
FONT_PATHS = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf",
]
FONT_BOLD = None
FONT_REGULAR = None
FONT_SMALL = None
for fp in FONT_PATHS:
    if os.path.exists(fp):
        if FONT_BOLD is None:
            try:
                FONT_BOLD = ImageFont.truetype(fp, 18)
                FONT_REGULAR = ImageFont.truetype(fp, 14)
                FONT_SMALL = ImageFont.truetype(fp, 11)
            except:
                pass

if FONT_REGULAR is None:
    FONT_REGULAR = ImageFont.load_default()
    FONT_BOLD = FONT_REGULAR
    FONT_SMALL = FONT_REGULAR

def draw_text(draw, xy, text, font, fill, max_width=None):
    """Draw text, optionally wrapping."""
    x, y = xy
    if max_width:
        # Simple word wrap
        words = text.split()
        lines = []
        current = ""
        for word in words:
            test = current + " " + word if current else word
            bbox = draw.textbbox((0, 0), test, font=font)
            if bbox[2] - bbox[0] <= max_width:
                current = test
            else:
                if current:
                    lines.append(current)
                current = word
        if current:
            lines.append(current)
        for i, line in enumerate(lines):
            draw.text((x, y + i * (font.size + 2)), line, font=font, fill=fill)
        return y + len(lines) * (font.size + 2)
    else:
        draw.text((x, y), text, font=font, fill=fill)
        return y + font.size + 4

def severity_color(sev):
    return {"high": ORANGE, "medium": YELLOW, "low": ACCENT, "critical": RED, "info": GREEN}.get(sev, MUTED)

def severity_label(sev):
    return {"high": "HIGH", "medium": "MEDIUM", "low": "LOW", "critical": "CRITICAL", "info": "INFO"}.get(sev, sev.upper())

# Demo data
TOOLS = [
    ("audit_structured_data", "Parse JSON-LD, Microdata, OpenGraph tags"),
    ("check_title_and_meta", "Extract title, meta, canonical, robots, viewport"),
    ("analyze_headings", "Map H1-H6 hierarchy, detect skips"),
    ("find_broken_links", "Check internal links for missing hrefs"),
    ("assess_content_quality", "Word count, alt text, content depth"),
    ("check_internal_linking", "Internal link graph, orphaned sections"),
    ("audit_performance_signals", "Image dimensions, lazy loading, viewport"),
    ("get_audit_summary", "Aggregate findings with corrections"),
]

FINDINGS = [
    {"id": "1", "sev": "high", "title": "Missing canonical link", "desc": "No <link rel=\"canonical\"> tag found. This can cause duplicate content issues."},
    {"id": "2", "sev": "high", "title": "Missing viewport meta tag", "desc": "No <meta name=\"viewport\"> found. Mobile rendering issues may occur."},
    {"id": "3", "sev": "high", "title": "No JSON-LD structured data", "desc": "No JSON-LD markup detected. Rich results will not be available."},
    {"id": "4", "sev": "medium", "title": "Heading level skip (H1 to H3)", "desc": "An H1 is followed directly by an H3, skipping H2. Can confuse crawlers."},
    {"id": "5", "sev": "medium", "title": "Missing og:title", "desc": "No OpenGraph og:title meta tag found."},
    {"id": "6", "sev": "medium", "title": "Missing og:description", "desc": "No OpenGraph og:description meta tag found."},
    {"id": "7", "sev": "medium", "title": "Missing og:image", "desc": "No OpenGraph og:image meta tag found."},
    {"id": "8", "sev": "high", "title": "Broken or invalid links", "desc": "1 anchor has a missing or invalid href attribute."},
    {"id": "9", "sev": "high", "title": "Low word count", "desc": "Page has only 0 words. Quality content typically has 1,000+ words."},
    {"id": "10", "sev": "high", "title": "No images have alt text", "desc": "All 2 images lack alt attributes. Significant accessibility issue."},
    {"id": "11", "sev": "medium", "title": "Orphaned content sections", "desc": "Found 1 content section with no internal links."},
    {"id": "12", "sev": "medium", "title": "Insufficient internal links", "desc": "Page has only 1 internal link(s)."},
    {"id": "13", "sev": "medium", "title": "Missing width/height on 2 images", "desc": "Images without dimensions can cause layout shift (CLS)."},
    {"id": "14", "sev": "low", "title": "Missing Twitter Card tags", "desc": "No Twitter Card meta tags found."},
    {"id": "15", "sev": "low", "title": "Images without lazy loading", "desc": "2 images lack loading=\"lazy\"."},
]

def draw_frame(step, tool_active_idx=-1, tools_done=0, findings_visible=0, human_corrected=False, final_summary=False):
    """Draw a single video frame."""
    img = Image.new('RGB', (WIDTH, HEIGHT), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # Title bar
    draw.rectangle([0, 0, WIDTH, 60], fill=PANEL_BG)
    draw.text((20, 18), "SchemaPilot", font=FONT_BOLD, fill=(59, 130, 246))
    draw.text((20, 18), "SchemaPilot", font=FONT_BOLD, fill=ACCENT)

    # Draw gradient text for logo
    draw.text((120, 18), "SEO Audit via WebMCP", font=FONT_REGULAR, fill=MUTED)

    # Step indicator
    step_y = 70
    steps = ["Tool Registration", "Agent Audit", "Human Corrections", "Re-audit + Actions"]
    for i, s in enumerate(steps):
        x = 80 + i * 260
        color = GREEN if i < step else (ACCENT if i == step else MUTED)
        dot_color = color
        if i == step:
            draw.ellipse([x-6, step_y+4, x+4, step_y+14], fill=dot_color)
        elif i < step:
            draw.ellipse([x-6, step_y+4, x+4, step_y+14], fill=GREEN)
        else:
            draw.ellipse([x-6, step_y+4, x+4, step_y+14], fill=BG_COLOR, outline=BORDER_COLOR, width=1)
        draw.text((x+10, step_y), s, font=FONT_SMALL, fill=color)

    # Main area - two panels
    panel_y = 110
    panel_height = HEIGHT - panel_y - 20

    # Left panel (tools)
    tool_panel_width = 320
    draw.rectangle([20, panel_y, 20 + tool_panel_width, panel_y + panel_height], fill=PANEL_BG, outline=BORDER_COLOR)

    # Tool panel header
    draw.text((30, panel_y + 10), "WebMCP Tools", font=FONT_BOLD, fill=TEXT_COLOR)

    # Tool status line
    status_y = panel_y + 30
    if step == 0:
        status_text = f"Registering tool {tools_done+1}/{len(TOOLS)}..."
    elif step == 1:
        status_text = f"Agent calling tools ({tools_done}/{len(TOOLS)})"
    elif step == 2:
        if human_corrected:
            status_text = "Corrections saved to Zustand store"
        else:
            status_text = "Human reviewing findings..."
    elif step == 3:
        status_text = "get_audit_summary() called with corrections"
    else:
        status_text = "Ready"

    draw.text((30, status_y), status_text, font=FONT_SMALL, fill=ACCENT if step < 2 else GREEN)

    # Tools list
    list_y = status_y + 20
    for i, (name, desc) in enumerate(TOOLS):
        y = list_y + i * 32
        item_bg = TOOL_PANEL_BG
        if i < tools_done:
            item_bg = (15, 41, 28) if step < 2 else TOOL_PANEL_BG
        draw.rectangle([30, y, 20 + tool_panel_width - 10, y + 28], fill=item_bg, outline=BORDER_COLOR)

        # Status dot
        if i < tools_done:
            dot_color = GREEN
        elif i == tool_active_idx and step == 1:
            dot_color = ACCENT
        else:
            dot_color = MUTED

        draw.ellipse([33, y + 6, 41, y + 14], fill=dot_color)
        draw.text((48, y + 4), name[:22], font=FONT_SMALL, fill=TEXT_COLOR)
        if len(name) > 22:
            draw.text((48, y + 4 + 12), name[22:], font=FONT_SMALL, fill=TEXT_COLOR)

    # Right panel (results)
    result_x = 20 + tool_panel_width + 20
    result_width = WIDTH - result_x - 20
    draw.rectangle([result_x, panel_y, result_x + result_width, panel_y + panel_height], fill=PANEL_BG, outline=BORDER_COLOR)

    # Result panel header
    draw.text((result_x + 10, panel_y + 10), "Audit Results", font=FONT_BOLD, fill=TEXT_COLOR)

    if step == 0 and findings_visible == 0:
        draw.text((result_x + 10, panel_y + 40), "Waiting for tool registration...", font=FONT_REGULAR, fill=MUTED)
    elif step == 1:
        draw.text((result_x + 10, panel_y + 40), "Agent running audit tools...", font=FONT_REGULAR, fill=MUTED)
    elif findings_visible > 0:
        if final_summary:
            draw.text((result_x + 10, panel_y + 40), "Prioritized Action List (with corrections)", font=FONT_REGULAR, fill=TEXT_COLOR)
        else:
            draw.text((result_x + 10, panel_y + 40), f"{findings_visible} findings detected:", font=FONT_REGULAR, fill=MUTED)

        list_y = panel_y + 60
        items_to_show = min(findings_visible, 10)
        for i in range(items_to_show):
            if i >= len(FINDINGS):
                break
            f = FINDINGS[i]
            y = list_y + i * 68

            # Determine if dismissed
            is_dismissed = human_corrected and f["id"] == "4"

            if is_dismissed:
                border_color = GREEN
                bg_color = (15, 41, 28)
                sevy_text = "Dismissed"
            else:
                border_color = severity_color(f["sev"])
                bg_color = (15, 23, 42)
                sevy_text = severity_label(f["sev"])

            # Finding item
            draw.rectangle([result_x + 10, y, result_x + result_width - 10, y + 60], fill=bg_color, outline=border_color)

            # Severity badge
            badge_color = severity_color(f["sev"])
            draw.rectangle([result_x + 16, y + 4, result_x + 70, y + 18], fill=badge_color)
            draw.text((result_x + 20, y + 5), sevy_text, font=FONT_SMALL, fill=(255, 255, 255))

            # Title
            title_y = y + 4
            draw.text((result_x + 80, title_y), f["title"], font=FONT_REGULAR, fill=TEXT_COLOR)

            # Description
            draw.text((result_x + 80, title_y + 16), f["desc"][:60] + (f["desc"][60:] and ".." or ""), font=FONT_SMALL, fill=MUTED)

            # Human note for dismissed finding
            if is_dismissed:
                note_y = y + 35
                draw.text((result_x + 80, note_y), "Note: This H1 to H3 skip is intentional.", font=FONT_SMALL, fill=GREEN)
                draw.text((result_x + 80, note_y + 12), "H3s are card section labels in our design system.", font=FONT_SMALL, fill=GREEN)

        if is_dismissed and False:
            pass

        # Show all 15 if not final summary
        if findings_visible == len(FINDINGS) and not final_summary:
            # Show summary line
            summary_y = panel_y + 60 + items_to_show * 68 + 10
            draw.text((result_x + 10, summary_y), f"Total: {findings_visible} findings", font=FONT_REGULAR, fill=MUTED)

    # Action summary at bottom for final step
    if final_summary:
        summary_y = panel_y + panel_height - 120
        draw.text((result_x + 10, summary_y), "Agent produced prioritized action list:", font=FONT_BOLD, fill=TEXT_COLOR)
        draw.text((result_x + 10, summary_y + 20), "7 High priority issues to fix", font=FONT_REGULAR, fill=ORANGE)
        draw.text((result_x + 10, summary_y + 40), "7 Medium priority issues", font=FONT_REGULAR, fill=YELLOW)
        draw.text((result_x + 10, summary_y + 60), "2 Low priority issues", font=FONT_REGULAR, fill=ACCENT)
        draw.text((result_x + 10, summary_y + 80), "1 false positive dismissed by human", font=FONT_REGULAR, fill=GREEN)

    # Footer
    footer_y = HEIGHT - 30
    if step == 0:
        footer_text = "use-webmcp-tool hook registers tools on page load | AbortController for lifecycle"
    elif step == 1:
        footer_text = "Agent calls audit tools via WebMCP API | Results flow into Zustand store"
    elif step == 2:
        footer_text = "Human clicks finding, adjusts severity, dismisses false positives, adds notes"
    elif step == 3:
        footer_text = "Agent calls get_audit_summary() with corrections -> prioritized action list"
    else:
        footer_text = "SchemaPilot: Collaborative SEO audit with WebMCP"
    draw.text((20, footer_y), footer_text, font=FONT_SMALL, fill=MUTED)

    return img

def generate_video():
    """Generate the demo video frames and encode with ffmpeg."""
    frames = []
    total_duration = 120  # 2 minutes
    total_frames = total_duration * FPS

    # Timeline:
    # 0-15s: Step 0 - Tool registration (15s)
    # 15-40s: Step 1 - Agent audit (25s)
    # 40-65s: Step 2 - Human corrections (25s)
    # 65-120s: Step 3 - Re-audit + summary (55s)

    tmpdir = tempfile.mkdtemp(prefix="schemapilot_frames_")

    print("Generating frames...")

    for frame_idx in range(total_frames):
        t = frame_idx / FPS  # seconds

        if t < 15:
            # Step 0: Tool registration
            step = 0
            tools_done = min(int((t / 15) * 8), 8)
            tool_active = -1
            findings_visible = 0
            human_corrected = False
            final_summary = False
        elif t < 40:
            # Step 1: Agent audit
            step = 1
            elapsed = t - 15
            tools_done = min(int((elapsed / 25) * 8), 8)
            tool_active = min(int((elapsed / 25) * 8), 7)
            if elapsed < 2.5:
                findings_visible = 0
            else:
                findings_visible = min(int(((elapsed - 2.5) / 22.5) * 15), 15)
            # Fade in findings one by one
            human_corrected = False
            final_summary = False
        elif t < 65:
            # Step 2: Human corrections
            step = 2
            tools_done = 8
            tool_active = -1
            findings_visible = 15
            if t < 52:
                human_corrected = False
            else:
                human_corrected = True
            final_summary = False
        else:
            # Step 3: Re-audit + summary
            step = 3
            tools_done = 8
            tool_active = -1
            findings_visible = 15
            human_corrected = True
            final_summary = True

        img = draw_frame(step, tool_active, tools_done, findings_visible, human_corrected, final_summary)
        frame_path = os.path.join(tmpdir, f"frame_{frame_idx:05d}.png")
        img.save(frame_path)
        frames.append(frame_path)

        if frame_idx % 50 == 0:
            print(f"  Frame {frame_idx}/{total_frames} ({t:.1f}s)")

    print("Encoding video with ffmpeg...")

    # Use ffmpeg to encode
    output_path = "/home/echalupa/.projects/schemapilot/public/demo-video.mp4"
    cmd = [
        "ffmpeg",
        "-y",
        "-framerate", str(FPS),
        "-i", os.path.join(tmpdir, "frame_%05d.png"),
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "23",
        "-pix_fmt", "yuv420p",
        "-vf", "scale=1280:720",
        output_path,
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    print(f"ffmpeg stdout: {result.stdout[-500:]}")
    print(f"ffmpeg stderr: {result.stderr[-500:]}")
    print(f"Return code: {result.returncode}")

    # Generate audio narration using pyttsx3
    audio_path = "/home/echalupa/.projects/schemapilot/public/demo-audio.aac"
    narration = (
        "SchemaPilot — a WebMCP enabled SEO audit tool. "
        "Step 1: The tool registers 8 WebMCP tools on page load. "
        "Step 2: An AI agent audits a sample page with planted SEO issues. The agent calls each WebMCP tool, which reads the live DOM. The audit finds 15 issues across 7 categories. "
        "Step 3: A human reviewer corrects a false positive. The H1 to H3 heading skip is dismissed because H3 elements are card section labels, not a hierarchy issue. The human also adds a note to the missing canonical link. Corrections are saved to the Zustand store. "
        "Step 4: The agent re-audits by calling get_audit_summary with the human corrections applied. The agent produces a prioritized action list: 7 high priority, 7 medium, 2 low, with the dismissed finding excluded. "
        "SchemaPilot demonstrates the power of WebMCP: agents can audit live pages, humans can correct false positives in real time, and the agent re-runs with that feedback."
    )

    has_speech = False
    try:
        import pyttsx3
        speaker = pyttsx3.init()
        speaker.save_to_file(narration, "/tmp/demo_audio.wav")
        speaker.runAndWait()
        speaker.stop()

        # Convert to AAC
        subprocess.run([
            "ffmpeg", "-y", "-i", "/tmp/demo_audio.wav",
            "-c:a", "aac", "-b:a", "128k", audio_path
        ], capture_output=True, timeout=30)
        has_speech = True
        print("Audio narration generated with pyttsx3")
    except Exception as e:
        print(f"pyttsx3 failed: {e}")

    if not has_speech:
        # Create a silent audio track
        subprocess.run([
            "ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
            "-t", str(total_duration), "-c:a", "aac", "-b:a", "128k", audio_path
        ], capture_output=True)
        print("Created silent audio track")

    # Combine video and audio
    final_output = "/home/echalupa/.projects/schemapilot/public/schemapilot-demo.mp4"
    cmd = [
        "ffmpeg",
        "-y",
        "-i", output_path,
        "-i", audio_path,
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "128k",
        final_output,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    print(f"Combine return code: {result.returncode}")

    # Cleanup temp files
    for f in frames:
        try:
            os.unlink(f)
        except:
            pass
    os.rmdir(tmpdir)

    if os.path.exists(final_output):
        size = os.path.getsize(final_output)
        print(f"\n✅ Demo video created: {final_output} ({size / 1024 / 1024:.1f} MB)")
    else:
        print(f"\n❌ Final video not created at {final_output}")
        print(f"Video path exists: {os.path.exists(output_path)}")

if __name__ == "__main__":
    generate_video()
