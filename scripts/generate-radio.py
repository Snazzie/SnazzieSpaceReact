#!/usr/bin/env python3
"""Multi-track radio episode generator using OmniVoice TTS.

Each episode JSON has lines with { speaker, text, overlap } (authored).
After generation, timestamps and durations are written back into the JSON.

Usage:
    python scripts/generate-radio.py the-truth-hour   # generate one episode
    python scripts/generate-radio.py --all             # generate all episodes
    python scripts/generate-radio.py --waveforms       # recompute waveforms only
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
from scipy.signal import butter, sosfilt

REPO_ROOT    = Path(__file__).parent.parent
CAST_FILE    = Path(__file__).parent / "cast.json"
SCRIPTS_DIR  = REPO_ROOT / "Website/src/data/radio"
AUDIO_DIR    = REPO_ROOT / "Website/public/audio/radio"
SAMPLE_RATE  = 24_000
WAVEFORM_BARS = 200
DEFAULT_GAP  = 0.15   # seconds between lines when overlap is 0
SPEED        = 1.15

# Phone bandpass: simulate caller telephone audio (300–3400 Hz)
_PHONE_SOS = butter(4, [300 / (SAMPLE_RATE / 2), 3400 / (SAMPLE_RATE / 2)], btype="band", output="sos")


def apply_phone_filter(audio: np.ndarray) -> np.ndarray:
    """Bandpass + slight noise to simulate telephone quality."""
    filtered = sosfilt(_PHONE_SOS, audio).astype(np.float32)
    noise = np.random.default_rng(0).normal(0, 0.002, len(filtered)).astype(np.float32)
    return np.clip(filtered + noise, -1.0, 1.0)


def load_cast() -> dict:
    return json.loads(CAST_FILE.read_text())


def compute_waveform(audio: np.ndarray, n_bars: int = WAVEFORM_BARS) -> list[float]:
    mono = audio.mean(axis=1) if audio.ndim > 1 else audio
    chunk = max(1, len(mono) // n_bars)
    peaks = [float(np.max(np.abs(mono[i * chunk:(i + 1) * chunk]))) for i in range(n_bars)]
    mx = max(peaks) if max(peaks) > 0 else 1.0
    return [round(p / mx, 4) for p in peaks]


def mix_clips(placements: list[tuple[int, np.ndarray]], total_samples: int) -> np.ndarray:
    """Sum clips onto a shared timeline. Overlapping audio is additive (crosstalk)."""
    mix = np.zeros(total_samples, dtype=np.float32)
    for start, clip in placements:
        end = min(start + len(clip), total_samples)
        mix[start:end] += clip[:end - start]
    mx = np.max(np.abs(mix))
    if mx > 0:
        mix = mix / mx * 0.92
    return mix


def generate_episode(slug: str, model) -> None:
    script_path = SCRIPTS_DIR / f"{slug}.json"
    if not script_path.exists():
        print(f"  skip (no script): {slug}")
        return

    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    episode = json.loads(script_path.read_text())
    lines   = episode["lines"]
    cast    = load_cast()

    print(f"  Generating {len(lines)} clips for '{slug}'...")

    # Phase 1: Generate each clip
    clips: list[np.ndarray] = []
    for i, line in enumerate(lines):
        speaker_id = line["speaker"]
        if speaker_id not in cast:
            print(f"  WARNING: unknown speaker '{speaker_id}' at line {i}, skipping")
            clips.append(np.zeros(int(SAMPLE_RATE * 0.5), dtype=np.float32))
            continue
        c = cast[speaker_id]
        text = line["text"].strip()
        if not text or text == "...":
            clips.append(np.zeros(int(SAMPLE_RATE * 0.8), dtype=np.float32))
        else:
            speed = float(c.get("speed", SPEED))
            audio = model.generate(
                text=text,
                ref_audio=str(REPO_ROOT / c["ref_audio"]),
                ref_text=c["ref_text"],
                instruct=c["instruct"],
                speed=speed,
            )
            clip = audio[0].astype(np.float32)
            if c.get("phone_filter", False):
                clip = apply_phone_filter(clip)
            clips.append(clip)
        dur = len(clips[-1]) / SAMPLE_RATE
        print(f"    [{i+1}/{len(lines)}] {speaker_id}: {dur:.1f}s")

    # Phase 2: Build timeline with overlap
    placements: list[tuple[int, np.ndarray]] = []
    timestamps: list[float] = []
    durations:  list[float] = []

    cursor = 0  # end-sample of the previous clip
    for i, (line, clip) in enumerate(zip(lines, clips)):
        overlap = float(line.get("overlap", 0.0))
        if i == 0:
            start = 0
        elif overlap > 0:
            start = max(0, cursor - int(overlap * SAMPLE_RATE))
        elif overlap < 0:
            start = cursor + int(abs(overlap) * SAMPLE_RATE)
        else:
            start = cursor + int(DEFAULT_GAP * SAMPLE_RATE)
        placements.append((start, clip))
        timestamps.append(start / SAMPLE_RATE)
        durations.append(len(clip) / SAMPLE_RATE)
        cursor = start + len(clip)

    total_samples = max(s + len(c) for s, c in placements) + int(SAMPLE_RATE * 0.5)

    # Phase 3: Mix
    mixed = mix_clips(placements, total_samples)

    # Write FLAC
    out_flac = AUDIO_DIR / f"{slug}.flac"
    sf.write(str(out_flac), mixed, SAMPLE_RATE, format="flac")
    print(f"  FLAC written: {out_flac.name} ({len(mixed)/SAMPLE_RATE:.1f}s)")

    # Write waveform JSON
    out_wave = AUDIO_DIR / f"{slug}-waveform.json"
    peaks = compute_waveform(mixed)
    out_wave.write_text(json.dumps(peaks))

    # Write timestamps + durations back into episode JSON
    for i, line in enumerate(lines):
        line["timestamp"] = round(timestamps[i], 3)
        line["duration"]  = round(durations[i], 3)
    script_path.write_text(json.dumps(episode, indent=2, ensure_ascii=False))
    print(f"  Timestamps written back to {script_path.name}")


def regen_waveforms() -> None:
    for flac in sorted(AUDIO_DIR.glob("*.flac")):
        audio, _ = sf.read(str(flac), dtype="float32")
        peaks = compute_waveform(audio)
        out = AUDIO_DIR / f"{flac.stem}-waveform.json"
        out.write_text(json.dumps(peaks))
        print(f"  waveform: {out.name}")


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
    parser.add_argument("slug", nargs="?", help="Episode slug (filename without .json)")
    parser.add_argument("--all", action="store_true", help="Generate all episodes")
    parser.add_argument("--waveforms", action="store_true", help="Recompute waveforms only")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    torch.manual_seed(args.seed)

    if args.waveforms:
        regen_waveforms()
        return

    if not args.slug and not args.all:
        print("Specify a slug or --all")
        sys.exit(1)

    model = load_model()

    slugs = (
        [args.slug] if args.slug
        else [p.stem for p in sorted(SCRIPTS_DIR.glob("*.json"))]
    )
    for slug in slugs:
        generate_episode(slug, model)


if __name__ == "__main__":
    main()
