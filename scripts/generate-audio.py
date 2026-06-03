#!/usr/bin/env python3
"""Generate audio narration + waveform JSON for articles using OmniVoice TTS.

Usage:
    python scripts/generate-audio.py                        # all articles missing audio
    python scripts/generate-audio.py dynamic-vs-ssr         # specific slug
    python scripts/generate-audio.py --all                  # regenerate all audio+waveforms
    python scripts/generate-audio.py --waveforms            # regenerate waveforms only

Output:
    Website/public/audio/<slug>.flac
    Website/public/audio/<slug>-waveform.json   (200 normalised peak values 0..1)
"""

import argparse
import json
import re
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
import torch

ARTICLES_DIR = Path(__file__).parent.parent / "Website/src/content/articles"
AUDIO_DIR = Path(__file__).parent.parent / "Website/public/audio"
VOICES_DIR = Path(__file__).parent / "voices"
SAMPLE_RATE = 24000
WAVEFORM_BARS = 200

REF_AUDIO = str(VOICES_DIR / "seedtts_ref.wav")
REF_TEXT = (
    "Some call me nature. Others call me Mother Nature. "
    "I've been here for over four point and five billion years, "
    "twenty-two thousand five hundred times longer than you."
)


def strip_mdx(text: str) -> str:
    text = re.sub(r"^---.*?---\s*", "", text, flags=re.DOTALL)
    text = re.sub(r"^(import|export)\s+.*$", "", text, flags=re.MULTILINE)
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    text = re.sub(r"^#{1,6}\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"\*{1,3}([^*]+)\*{1,3}", r"\1", text)
    text = re.sub(r"`[^`]+`", "", text)
    text = re.sub(r"```.*?```", "", text, flags=re.DOTALL)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def compute_waveform(flac_path: Path, n_bars: int = WAVEFORM_BARS) -> list[float]:
    data, _sr = sf.read(str(flac_path), dtype="float32")
    if data.ndim > 1:
        data = data.mean(axis=1)
    chunk = len(data) // n_bars
    peaks = []
    for i in range(n_bars):
        segment = data[i * chunk : (i + 1) * chunk]
        peaks.append(float(np.max(np.abs(segment))))
    max_peak = max(peaks) if max(peaks) > 0 else 1.0
    return [round(p / max_peak, 4) for p in peaks]


def generate_waveform(slug: str) -> None:
    flac = AUDIO_DIR / f"{slug}.flac"
    if not flac.exists():
        print(f"  waveform skip (no flac): {slug}")
        return
    out = AUDIO_DIR / f"{slug}-waveform.json"
    peaks = compute_waveform(flac)
    out.write_text(json.dumps(peaks))
    print(f"  waveform: {out.name}")


def generate(slug: str, model) -> None:
    mdx = ARTICLES_DIR / f"{slug}.mdx"
    if not mdx.exists():
        print(f"  not found: {mdx}")
        return

    out = AUDIO_DIR / f"{slug}.flac"
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)

    text = strip_mdx(mdx.read_text())
    print(f"  {slug}: {len(text)} chars -> {out.name}")

    audio = model.generate(text=text, ref_audio=REF_AUDIO, ref_text=REF_TEXT)
    sf.write(str(out), audio[0], SAMPLE_RATE, format="flac")
    generate_waveform(slug)
    print(f"  done: {slug}")


def detect_device() -> str:
    if torch.cuda.is_available():
        return "cuda"
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return "mps"
    return "cpu"


def load_model():
    from omnivoice import OmniVoice
    device = detect_device()
    dtype = torch.float16 if device != "cpu" else torch.float32
    print(f"  device: {device}")
    return OmniVoice.from_pretrained("k2-fsa/OmniVoice", device_map=device, dtype=dtype)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("slug", nargs="?", help="Article slug (filename without .mdx)")
    parser.add_argument("--all", action="store_true", help="Regenerate all audio+waveforms")
    parser.add_argument("--waveforms", action="store_true", help="Regenerate waveforms only (no TTS)")
    args = parser.parse_args()

    if args.waveforms:
        slugs = [p.stem for p in sorted(AUDIO_DIR.glob("*.flac"))]
        print(f"Generating waveforms for {len(slugs)} file(s)...")
        for slug in slugs:
            generate_waveform(slug)
        return

    model = load_model()

    if args.slug:
        slugs = [args.slug]
    elif args.all:
        slugs = [p.stem for p in sorted(ARTICLES_DIR.glob("*.mdx"))]
    else:
        all_slugs = [p.stem for p in sorted(ARTICLES_DIR.glob("*.mdx"))]
        slugs = [s for s in all_slugs if not (AUDIO_DIR / f"{s}.flac").exists()]
        if not slugs:
            print("All articles already have audio. Use --all to regenerate.")
            sys.exit(0)

    print(f"Generating audio for {len(slugs)} article(s)...")
    for slug in slugs:
        generate(slug, model)


if __name__ == "__main__":
    main()
