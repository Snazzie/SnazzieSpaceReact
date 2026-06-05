#!/usr/bin/env python3
"""Download VCTK voice reference samples for each cast member.

Uses CSTR-Edinburgh/vctk from HuggingFace (streaming, downloads only needed speakers).
Saves wav + transcript to scripts/voices/<character>.wav and scripts/voices/<character>.txt
Then updates cast.json ref_audio and ref_text fields.

Usage:
    python scripts/download-voices.py
"""

import io
import json
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")

import numpy as np
import soundfile as sf

REPO_ROOT  = Path(__file__).parent.parent
CAST_FILE  = Path(__file__).parent / "cast.json"
VOICES_DIR = Path(__file__).parent / "voices"

# Character -> (LibriSpeech test-clean speaker_id, gender). Genders are AUTHORITATIVE,
# taken from LibriSpeech SPEAKERS.TXT (subset test-clean) — the ref voice's real gender
# must match the character's name/instruct, since OmniVoice clones the ref regardless of
# the instruct text. All 14 speakers are distinct.
CHARACTER_VOICES = {
    "ronnie":          (1089, "M"),
    "barry":           (1188, "M"),
    "rhonda":          (1284, "F"),
    "todd":            (2300, "M"),
    "caller-steve":    (  61, "M"),
    "caller-gary":     ( 672, "M"),
    "caller-linda":    ( 237, "F"),
    "caller-chad":     (1320, "M"),
    "caller-mildred":  ( 121, "F"),
    "caller-darnell":  (7127, "M"),
    "caller-patricia": (2961, "F"),
    "caller-winston":  (4077, "M"),
    "caller-kim":      (3570, "F"),
    "caller-frank":    ( 260, "M"),
}
CHARACTER_SPEAKERS = {c: sid for c, (sid, _) in CHARACTER_VOICES.items()}

# Minimum clip length to use as reference (seconds)
MIN_CLIP_SECS = 4.0
# Target sample rate for saved refs
TARGET_SR = 24_000


def resample(audio: np.ndarray, orig_sr: int, target_sr: int) -> np.ndarray:
    if orig_sr == target_sr:
        return audio
    from scipy.signal import resample_poly
    from math import gcd
    g = gcd(orig_sr, target_sr)
    return resample_poly(audio, target_sr // g, orig_sr // g).astype(np.float32)


def main() -> None:
    import datasets as hf_datasets
    from datasets import load_dataset

    VOICES_DIR.mkdir(exist_ok=True)

    cast = json.loads(CAST_FILE.read_text(encoding="utf-8"))
    needed_speakers = set(CHARACTER_SPEAKERS.values())

    print(f"Streaming LibriSpeech test-clean for {len(needed_speakers)} speakers...")

    # speaker -> (audio_array, sr, text)
    collected: dict[int, tuple[np.ndarray, int, str]] = {}

    ds = load_dataset(
        "openslr/librispeech_asr",
        "clean",
        split="test",
        streaming=True,
    )
    # Disable torchcodec decoding — decode raw bytes with soundfile instead
    ds = ds.cast_column("audio", hf_datasets.Audio(decode=False))

    for sample in ds:
        spk = int(sample["speaker_id"])
        if spk not in needed_speakers:
            continue
        if spk in collected:
            continue

        audio_raw = sample["audio"]  # {"path": str, "bytes": bytes}
        raw_bytes = audio_raw.get("bytes") or open(audio_raw["path"], "rb").read()
        arr, sr = sf.read(io.BytesIO(raw_bytes), dtype="float32")
        arr = arr.astype(np.float32)
        text = sample.get("text", "").strip()

        dur = len(arr) / sr
        if dur < MIN_CLIP_SECS or not text:
            continue

        collected[spk] = (arr, sr, text)
        print(f"  {spk}: {dur:.1f}s — \"{text[:60]}\"")

        if len(collected) == len(needed_speakers):
            break

    print(f"\nSaving {len(collected)} voice samples...")

    for char, spk_id in CHARACTER_SPEAKERS.items():
        if int(spk_id) not in collected:
            print(f"  WARN: no sample found for {char} ({spk_id}), keeping existing")
            continue

        arr, sr, text = collected[int(spk_id)]
        arr_resampled = resample(arr, sr, TARGET_SR)

        out_wav = VOICES_DIR / f"{char}.wav"
        sf.write(str(out_wav), arr_resampled, TARGET_SR)

        out_txt = VOICES_DIR / f"{char}.txt"
        out_txt.write_text(text, encoding="utf-8")

        # Update cast.json (record gender metadata so name/voice always agree)
        if char in cast:
            cast[char]["ref_audio"] = f"scripts/voices/{char}.wav"
            cast[char]["ref_text"]  = text
            cast[char]["gender"]    = CHARACTER_VOICES[char][1]

        print(f"  {char} ({spk_id}, {CHARACTER_VOICES[char][1]}): {out_wav.name}")

    CAST_FILE.write_text(json.dumps(cast, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\ncast.json updated. Run: python scripts/generate-radio.py the-truth-hour")


if __name__ == "__main__":
    main()
