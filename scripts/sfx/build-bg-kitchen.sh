#!/usr/bin/env bash
# Rebuild the ~16s "kitchen chaos" bed for The Cat Special from real CC0 clips.
# Layers looped metal pots-and-pans clatter (loud) under scattered cat screams.
# All sources CC0 (see CREDITS.txt). Re-run after changing the layering.
set -euo pipefail
cd "$(dirname "$0")"

ffmpeg -y \
  -i metal-clatter.wav \
  -i cat-scream-2.wav \
  -i cat-scream-1.wav \
  -i cat-scream-3.wav \
  -i cat-impatient.wav \
  -filter_complex "
    [0:a]aloop=loop=-1:size=2e9,atrim=0:16,volume=1.0[m0];
    [m0]adelay=0|0[mA];
    [0:a]adelay=4000|4000,volume=0.9[mB];
    [0:a]adelay=9000|9000,volume=0.95[mC];
    [0:a]adelay=13000|13000,volume=0.9[mD];
    [1:a]adelay=2000|2000,volume=1.1[s2];
    [2:a]adelay=6500|6500,volume=1.0[s1];
    [3:a]adelay=11000|11000,volume=1.1[s3];
    [4:a]adelay=13800|13800,volume=0.8[imp];
    [mA][mB][mC][mD][s2][s1][s3][imp]amix=inputs=8:normalize=0:duration=longest,
    alimiter=limit=0.95,atrim=0:16,aresample=24000,aformat=channel_layouts=mono
  " bg-kitchen.wav

echo "rebuilt bg-kitchen.wav:"
ffprobe -v error -show_entries format=duration -of csv=p=0 bg-kitchen.wav
