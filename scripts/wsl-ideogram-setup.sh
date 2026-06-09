#!/usr/bin/env bash
# One-time setup for the ideogram4 image pipeline in WSL, mirroring wsl-cosy-setup.sh.
# Renders Snazzie FM social-post photos (see scripts/render-post.py).
#
# PREREQUISITES you must do manually first (cannot be automated):
#   1. Accept gated access to the ideogram4 weights at huggingface.co (free) and create
#      a HF token: https://huggingface.co/settings/tokens   [REQUIRED — weights are gated]
#   2. (OPTIONAL) Get an Ideogram API key for the free magic-prompt expander:
#      https://developer.ideogram.ai  — skip it; plain-text prompts render fine without it.
#
# Then run:  bash scripts/wsl-ideogram-setup.sh <HF_TOKEN> [IDEOGRAM_API_KEY]
set -e

HF_TOKEN="${1:?usage: wsl-ideogram-setup.sh <HF_TOKEN> [IDEOGRAM_API_KEY]}"
IDEOGRAM_API_KEY="${2:-}"   # optional

CONDA=/home/acoop/miniconda3
IDEO_DIR="${IDEOGRAM4_DIR:-/home/acoop/ideogram4}"

echo "=== create conda env 'ideogram' (python 3.11) ==="
source "$CONDA/etc/profile.d/conda.sh"
conda create -y -n ideogram python=3.11 || true
conda activate ideogram
PY="$CONDA/envs/ideogram/bin/python"

echo "=== clone ideogram4 ==="
if [ ! -d "$IDEO_DIR/.git" ]; then
  git clone https://github.com/ideogram-oss/ideogram4 "$IDEO_DIR"
fi
cd "$IDEO_DIR"

echo "=== install ideogram4 ==="
"$PY" -m pip install -U pip
"$PY" -m pip install .

echo "=== HuggingFace login (required — weights are gated) ==="
"$PY" -m pip install -U "huggingface_hub[cli]"
"$CONDA/envs/ideogram/bin/huggingface-cli" login --token "$HF_TOKEN"

PROFILE="$HOME/.bashrc"
# Optional: persist the Ideogram API key (free magic-prompt expander) if provided.
if [ -n "$IDEOGRAM_API_KEY" ] && ! grep -q "IDEOGRAM_API_KEY" "$PROFILE" 2>/dev/null; then
  echo "export IDEOGRAM_API_KEY='$IDEOGRAM_API_KEY'" >> "$PROFILE"
fi
if ! grep -q "IDEOGRAM4_DIR" "$PROFILE" 2>/dev/null; then
  echo "export IDEOGRAM4_DIR='$IDEO_DIR'" >> "$PROFILE"
fi

echo "ALL_OK — open a new shell (or 'source ~/.bashrc'), then:"
echo "  conda activate ideogram"
echo "  python scripts/render-post.py <slug> \"<scene prompt>\""
