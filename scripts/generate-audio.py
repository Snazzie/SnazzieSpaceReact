#!/usr/bin/env python3
"""Generate audio narration + waveform JSON for articles using OmniVoice TTS.

Requires bun run build first — the Astro build writes <slug>.txt files to
Website/public/audio/ containing the pre-processed TTS script.

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
import sys
import warnings
from pathlib import Path

warnings.filterwarnings("ignore", message="Couldn't find ffmpeg", category=RuntimeWarning)

import numpy as np
import soundfile as sf
import torch

ARTICLES_DIR = Path(__file__).parent.parent / "Website/src/content/articles"
AUDIO_DIR = Path(__file__).parent.parent / "Website/public/audio"
VOICES_DIR = Path(__file__).parent / "voices"
SAMPLE_RATE = 24000
WAVEFORM_BARS = 200
SPEECH_SPEED = 1.15
SPEECH_INSTRUCT = "male, young adult, american accent"
SEED = 42

REF_AUDIO = str(VOICES_DIR / "seedtts_ref.wav")
REF_TEXT = (
    "Some call me nature. Others call me Mother Nature. "
    "I've been here for over four point and five billion years, "
    "twenty-two thousand five hundred times longer than you."
)


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


_WHISPER_MODEL = None

def _get_whisper():
    global _WHISPER_MODEL
    if _WHISPER_MODEL is None:
        from faster_whisper import WhisperModel
        device = detect_device()
        _WHISPER_MODEL = WhisperModel("tiny.en", device=device, compute_type="float16" if device != "cpu" else "int8")
    return _WHISPER_MODEL


def _text_words(text: str) -> list[str]:
    import re
    return re.findall(r"[a-z']+", text.lower())


def validate_audio(audio: "np.ndarray", expected_text: str, slug: str) -> None:
    """Transcribe rendered audio with Whisper and warn on missing words."""
    import io
    expected = _text_words(expected_text)
    if not expected:
        return
    buf = io.BytesIO()
    sf.write(buf, audio[0], SAMPLE_RATE, format="wav")
    buf.seek(0)
    segs, _ = _get_whisper().transcribe(buf, language="en")
    transcript = " ".join(s.text for s in segs)
    got = set(_text_words(transcript))
    missing = [w for w in expected if w not in got]
    if missing:
        pct = len(missing) / len(expected) * 100
        print(f"  WARNING {slug}: {len(missing)}/{len(expected)} words missing ({pct:.0f}%) — {missing[:10]}{'...' if len(missing) > 10 else ''}")
    else:
        print(f"  validate: ok ({len(expected)} words)")


def generate(slug: str, model, validate: bool = False) -> None:
    txt = AUDIO_DIR / f"{slug}.txt"
    if not txt.exists():
        print(f"  skip (no .txt — run bun build first): {slug}")
        return

    out = AUDIO_DIR / f"{slug}.flac"
    text = txt.read_text(encoding="utf-8")
    print(f"  {slug}: {len(text)} chars -> {out.name}")

    audio = model.generate(text=text, ref_audio=REF_AUDIO, ref_text=REF_TEXT, instruct=SPEECH_INSTRUCT, speed=SPEECH_SPEED)
    sf.write(str(out), audio[0], SAMPLE_RATE, format="flac")
    if validate:
        validate_audio(audio, text, slug)
    generate_waveform(slug)
    print(f"  done: {slug}")


SAMPLES_DIR = AUDIO_DIR / "samples"


def generate_sample(name: str, text: str, model) -> None:
    SAMPLES_DIR.mkdir(parents=True, exist_ok=True)
    out = SAMPLES_DIR / f"{name}.flac"
    print(f"  {name}: {text!r} -> {out.name}")
    audio = model.generate(text=text, ref_audio=REF_AUDIO, ref_text=REF_TEXT, instruct=SPEECH_INSTRUCT, speed=SPEECH_SPEED)
    sf.write(str(out), audio[0], SAMPLE_RATE, format="flac")
    print(f"  done")


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
    global SEED
    parser = argparse.ArgumentParser()
    parser.add_argument("slug", nargs="?", help="Article slug (filename without .mdx)")
    parser.add_argument("--all", action="store_true", help="Regenerate all audio+waveforms")
    parser.add_argument("--waveforms", action="store_true", help="Regenerate waveforms only (no TTS)")
    parser.add_argument("--sample", nargs=2, metavar=("NAME", "TEXT"),
                        help="Generate a single sample clip: --sample <name> <text>")
    parser.add_argument("--seed", type=int, default=SEED, help=f"RNG seed for reproducible output (default: {SEED})")
    parser.add_argument("--validate", action="store_true", help="Transcribe each rendered clip with Whisper and warn if words are missing.")
    args = parser.parse_args()
    SEED = args.seed
    torch.manual_seed(SEED)

    if args.sample:
        name, text = args.sample
        model = load_model()
        generate_sample(name, text, model)
        return

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
        slugs = [p.stem for p in sorted(AUDIO_DIR.glob("*.txt"))]
    else:
        all_slugs = [p.stem for p in sorted(AUDIO_DIR.glob("*.txt"))]
        slugs = [s for s in all_slugs if not (AUDIO_DIR / f"{s}.flac").exists()]
        if not slugs:
            print("All articles already have audio. Use --all to regenerate.")
            sys.exit(0)

    print(f"Generating audio for {len(slugs)} article(s)...")
    for slug in slugs:
        generate(slug, model, validate=args.validate)


if __name__ == "__main__":
    main()
