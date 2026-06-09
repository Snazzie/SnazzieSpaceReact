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


def load_dotenv(path: Path) -> None:
    """Minimal .env loader: KEY=VALUE lines into os.environ (no overwrite of existing)."""
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        key, val = key.strip(), val.strip().strip('"').strip("'")
        if key and val and key not in os.environ:
            os.environ[key] = val


def main() -> int:
    ap = argparse.ArgumentParser(description="Render a Snazzie FM social-post photo with ideogram4.")
    ap.add_argument("slug", help="post id / output basename (writes <slug>.png)")
    ap.add_argument("prompt", help="scene-only prompt (Ghibli style is appended automatically)")
    ap.add_argument("--portrait", action="store_true", help="4:5 portrait (default: 1:1 square)")
    ap.add_argument("--quantization", default="nf4", help="ideogram4 quantization (default: nf4)")
    args = ap.parse_args()

    # Load secrets from repo-root .env (HF_TOKEN required; IDEOGRAM_API_KEY optional).
    load_dotenv(REPO_ROOT / ".env")
    # huggingface_hub reads HF_TOKEN / HUGGING_FACE_HUB_TOKEN from env for gated weights.
    if os.environ.get("HF_TOKEN") and not os.environ.get("HUGGING_FACE_HUB_TOKEN"):
        os.environ["HUGGING_FACE_HUB_TOKEN"] = os.environ["HF_TOKEN"]
    if not os.environ.get("HF_TOKEN"):
        print("error: HF_TOKEN not set (in env or .env) — ideogram4 weights are gated.",
              file=sys.stderr)
        return 1
    if not os.environ.get("IDEOGRAM_API_KEY"):
        print("note: IDEOGRAM_API_KEY not set — skipping magic-prompt, using plain prompt.",
              file=sys.stderr)

    ideo_dir = Path(os.environ.get("IDEOGRAM4_DIR", Path.home() / "ideogram4"))
    runner = ideo_dir / "run_inference.py"
    if not runner.exists():
        print(f"error: {runner} not found. Run scripts/wsl-ideogram-setup.sh first "
              f"or set IDEOGRAM4_DIR.", file=sys.stderr)
        return 1

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = OUT_DIR / f"{args.slug}.png"
    full_prompt = f"{args.prompt.strip().rstrip('.')}. {GHIBLI_STYLE}"
    width, height = (1024, 1280) if args.portrait else (1024, 1024)

    cmd = [
        sys.executable, str(runner),
        "--prompt", full_prompt,
        "--output", str(out_path),
        "--width", str(width),
        "--height", str(height),
        "--quantization", args.quantization,
        # caption verifier shouldn't abort on our scene prompts
        "--warn-on-caption-issues",
    ]
    # magic-prompt is ON by default and needs an API key; without one, feed the prompt
    # verbatim (--no-magic-prompt). With a key, let it expand to a structured caption.
    cmd.append("--magic-prompt" if os.environ.get("IDEOGRAM_API_KEY") else "--no-magic-prompt")

    print(f"rendering {args.slug} ({width}x{height}) -> {out_path}")
    print(f"prompt: {full_prompt}")
    subprocess.run(cmd, cwd=str(ideo_dir), check=True)
    print(f"wrote {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
