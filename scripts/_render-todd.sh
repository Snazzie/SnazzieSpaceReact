#!/usr/bin/env bash
# Throwaway one-off runner (not committed) — renders the todd-on-the-line post image.
set -e
cd /mnt/c/Users/acoop/Documents/GitHub/SnazzieSpaceReact
set -a; . ./.env; set +a
source /home/acoop/miniconda3/etc/profile.d/conda.sh
conda activate ideogram

hf auth login --token "$HF_TOKEN" >/dev/null 2>&1 || true
echo "whoami: $(hf auth whoami 2>&1)"

PROMPT="A young intern with a headset and a foam coffee cup sits alone in an impossibly long waiting room that bends and spirals into the distance against physics, endless empty plastic chairs, a glowing NOW SERVING 41,001 board overhead, dust motes in warm afternoon light, soft painterly clouds through tall windows, cozy and slightly melancholic."

python scripts/render-post.py todd-on-the-line "$PROMPT"
echo "RENDER_EXIT=$?"
