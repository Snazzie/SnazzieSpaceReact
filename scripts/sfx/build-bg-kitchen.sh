#!/usr/bin/env bash
# Build the kitchen-chaos SFX beds for The Cat Special from real CC0 clips.
# All sources CC0 (see CREDITS.txt). Re-run after changing the layering.
#
#   bg-kitchen.wav      16s  — the loud "eruption" moment (drawer of pots + cats)
#   bg-kitchen-amb.wav  36s  — quiet continuous ambience that runs UNDER the dialogue
#                              (placed as a `background` line; muffled caller's-end noise)
set -euo pipefail
cd "$(dirname "$0")"

# --- 16s eruption: loud, dense, the big crash moment ---------------------------
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

# --- 36s ambience: continuous, never silent, sits low under the dialogue --------
# Two offset metal loops keep the clatter dense/seamless; cats scattered throughout.
ffmpeg -y \
  -i metal-clatter.wav \
  -i cat-scream-1.wav \
  -i cat-scream-2.wav \
  -i cat-scream-3.wav \
  -i cat-impatient.wav \
  -i cat-pleading.wav \
  -filter_complex "
    [0:a]aloop=loop=-1:size=2e9,atrim=0:36,volume=0.7[ma];
    [0:a]aloop=loop=-1:size=2e9,atrim=0:36,adelay=1700|1700,volume=0.5[mb];
    [4:a]adelay=1500|1500,volume=0.7[c1];
    [3:a]adelay=5000|5000,volume=0.8[c2];
    [5:a]adelay=9000|9000,volume=0.6[c3];
    [2:a]adelay=13500|13500,volume=0.8[c4];
    [1:a]adelay=18000|18000,volume=0.85[c5];
    [3:a]adelay=22500|22500,volume=0.8[c6];
    [4:a]adelay=26000|26000,volume=0.7[c7];
    [2:a]adelay=30000|30000,volume=0.85[c8];
    [1:a]adelay=33500|33500,volume=0.8[c9];
    [ma][mb][c1][c2][c3][c4][c5][c6][c7][c8][c9]amix=inputs=11:normalize=0:duration=longest,
    alimiter=limit=0.9,atrim=0:36,aresample=24000,aformat=channel_layouts=mono
  " bg-kitchen-amb.wav

echo "rebuilt:"
for f in bg-kitchen.wav bg-kitchen-amb.wav; do
  printf "  %s  %ss\n" "$f" "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")"
done
