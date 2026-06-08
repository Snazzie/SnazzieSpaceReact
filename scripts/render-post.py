#!/usr/bin/env python3
"""Render a Snazzie FM social-post photo with ideogram4 (open weights). Usage:

    python scripts/render-post.py <slug> "<scene prompt>" [--portrait] [--quantization nf4]

Runs in WSL against the ideogram4 clone set up by scripts/wsl-ideogram-setup.sh.
Writes Website/public/images/radio/<slug>.png. A fixed Studio Ghibli style is appended
to every prompt, so post imagePrompts describe only the scene (see src/data/radio-posts.ts).

Requires: HuggingFace gated access to ideogram4 weights + IDEOGRAM_API_KEY in env
(magic-prompt service). Set IDEOGRAM4_DIR if the clone is not at ~/ideogram4.
"""
import argparse
import os
import subprocess
import sys
from pathlib import Path

# Single source of truth for the house art style. Every post image uses this look.
GHIBLI_STYLE = (
    "Studio Ghibli style hand-painted animation cel, soft painterly watercolor "
    "backgrounds, warm nostalgic lighting, gentle film grain, lush detailed scenery, "
    "expressive characters, cozy and whimsical."
)

REPO_ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = REPO_ROOT / "Website" / "public" / "images" / "radio"


def main() -> int:
    ap = argparse.ArgumentParser(description="Render a Snazzie FM social-post photo with ideogram4.")
    ap.add_argument("slug", help="post id / output basename (writes <slug>.png)")
    ap.add_argument("prompt", help="scene-only prompt (Ghibli style is appended automatically)")
    ap.add_argument("--portrait", action="store_true", help="4:5 portrait (default: 1:1 square)")
    ap.add_argument("--quantization", default="nf4", help="ideogram4 quantization (default: nf4)")
    args = ap.parse_args()

    if not os.environ.get("IDEOGRAM_API_KEY"):
        print("warning: IDEOGRAM_API_KEY not set — magic-prompt expansion may fail.", file=sys.stderr)

    ideo_dir = Path(os.environ.get("IDEOGRAM4_DIR", Path.home() / "ideogram4"))
    runner = ideo_dir / "run_inference.py"
    if not runner.exists():
        print(f"error: {runner} not found. Run scripts/wsl-ideogram-setup.sh first "
              f"or set IDEOGRAM4_DIR.", file=sys.stderr)
        return 1

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = OUT_DIR / f"{args.slug}.png"
    full_prompt = f"{args.prompt.strip().rstrip('.')}. {GHIBLI_STYLE}"
    resolution = "1024x1280" if args.portrait else "1024x1024"

    cmd = [
        sys.executable, str(runner),
        "--prompt", full_prompt,
        "--output", str(out_path),
        "--resolution", resolution,
        "--quantization", args.quantization,
    ]
    print(f"rendering {args.slug} ({resolution}) -> {out_path}")
    print(f"prompt: {full_prompt}")
    subprocess.run(cmd, cwd=str(ideo_dir), check=True)
    print(f"wrote {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
