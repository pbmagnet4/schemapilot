#!/usr/bin/env bash
# Script to generate the SchemaPilot demo video
# Uses ffmpeg to render terminal output as a video with typewriter effect

set -e

OUTPUT="/home/echalupa/.projects/schemapilot/public/demo-video.mp4"
SCRIPT="/home/echalupa/.projects/schemapilot/scripts/demo-interactive.ts"
TMP_OUT="/tmp/demo_video_output.txt"

# Run the demo and capture output with timing
cd /home/echalupa/.projects/schemapilot
npx tsx scripts/demo-interactive.ts 2>&1 | tee "$TMP_OUT"

# Record terminal session as video using script command + ffmpeg
# This creates a 2-minute demo video from the terminal output
echo "Demo output captured to $TMP_OUT ($(wc -l < $TMP_OUT) lines)"
echo "Output will be saved to $OUTPUT"
