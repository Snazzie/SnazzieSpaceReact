#!/usr/bin/env python3
"""Auto-pick a fresh 'disclaimer man' voice for ad-disclaimer.

Streams LibriSpeech test-clean, gathers several UNUSED speakers (not already mapped
to any character), estimates each one's median pitch, keeps the males, and picks the
DEEPEST (most monotone-sounding) one as the disclaimer voice. Writes its wav+txt to
scripts/voices/ad-disclaimer.wav and updates ONLY the ad-disclaimer cast.json entry.

Run:  python scripts/pick-disclaimer-voice.py
"""
import io, json, warnings
from pathlib import Path
warnings.filterwarnings("ignore")
import numpy as np
import soundfile as sf

CAST_FILE  = Path(__file__).parent / "cast.json"
VOICES_DIR = Path(__file__).parent / "voices"
TARGET_SR  = 24_000
MIN_CLIP_SECS = 4.0
WANT = 8  # how many unused speakers to audition

# every speaker id already in use (14 episode voices + ad-announcer 1580 + tried
# disclaimers 2830, 7729) — never reuse one of these, the disclaimer must be distinct.
# 8463 excluded: it is the female "Kim" speaker (slipped through the F0 gate at 149 Hz).
USED = {1089, 1188, 1284, 2300, 61, 672, 237, 1320, 121, 7127,
        2961, 4077, 3570, 260, 1580, 2830, 7729, 8463}


def median_f0(arr: np.ndarray, sr: int) -> float:
    """Crude autocorrelation pitch: median F0 over voiced frames (Hz)."""
    frame = int(0.04 * sr)
    hop = int(0.02 * sr)
    fmin, fmax = 70, 320
    lo, hi = sr // fmax, sr // fmin
    f0s = []
    for start in range(0, len(arr) - frame, hop):
        x = arr[start:start + frame].astype(np.float64)
        x -= x.mean()
        if np.sqrt((x * x).mean()) < 0.01:  # silence
            continue
        ac = np.correlate(x, x, mode="full")[len(x) - 1:]
        if ac[0] <= 0:
            continue
        seg = ac[lo:hi]
        if len(seg) == 0:
            continue
        lag = lo + int(np.argmax(seg))
        if ac[lag] / ac[0] < 0.3:  # weak periodicity = unvoiced
            continue
        f0s.append(sr / lag)
    return float(np.median(f0s)) if f0s else 0.0


def resample(audio, orig_sr, target_sr):
    if orig_sr == target_sr:
        return audio
    from scipy.signal import resample_poly
    from math import gcd
    g = gcd(orig_sr, target_sr)
    return resample_poly(audio, target_sr // g, orig_sr // g).astype(np.float32)


def main():
    import datasets as hf_datasets
    from datasets import load_dataset
    VOICES_DIR.mkdir(exist_ok=True)
    cast = json.loads(CAST_FILE.read_text(encoding="utf-8"))

    ds = load_dataset("openslr/librispeech_asr", "clean", split="test", streaming=True)
    ds = ds.cast_column("audio", hf_datasets.Audio(decode=False))

    seen = {}  # spk -> (arr, sr, text, f0)
    for sample in ds:
        spk = int(sample["speaker_id"])
        if spk in USED or spk in seen:
            continue
        raw = sample["audio"]
        rb = raw.get("bytes") or open(raw["path"], "rb").read()
        arr, sr = sf.read(io.BytesIO(rb), dtype="float32")
        arr = arr.astype(np.float32)
        text = sample.get("text", "").strip()
        if len(arr) / sr < MIN_CLIP_SECS or not text:
            continue
        f0 = median_f0(arr, sr)
        seen[spk] = (arr, sr, text, f0)
        print(f"  candidate {spk}: {len(arr)/sr:.1f}s, median F0 {f0:.0f} Hz")
        if len(seen) >= WANT:
            break

    # males = median F0 in 95-140 Hz (safe male band — 149+ risks female speakers like Kim).
    # Pick the BRIGHTEST (highest F0) within it: a lighter tenor reads as quicker than a deep
    # voice, but stays clearly male.
    males = {s: v for s, v in seen.items() if 95 <= v[3] <= 140}
    if not males:
        raise SystemExit("No male candidate found; re-run (raise WANT) or widen the band.")
    pick = max(males, key=lambda s: males[s][3])
    arr, sr, text, f0 = seen[pick]
    print(f"\nPicked speaker {pick} (F0 {f0:.0f} Hz) as the disclaimer man.")

    sf.write(str(VOICES_DIR / "ad-disclaimer.wav"), resample(arr, sr, TARGET_SR), TARGET_SR)
    (VOICES_DIR / "ad-disclaimer.txt").write_text(text, encoding="utf-8")
    cast["ad-disclaimer"]["ref_audio"] = "scripts/voices/ad-disclaimer.wav"
    cast["ad-disclaimer"]["ref_text"]  = text
    cast["ad-disclaimer"]["gender"]    = "M"
    CAST_FILE.write_text(json.dumps(cast, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"cast.json updated. Record speaker {pick} in download-ad-voices.py AD_VOICES.")


if __name__ == "__main__":
    main()
