#!/usr/bin/env python3
"""Pull 4 distinct male announcer voices (one per new ad), varied in pitch.

Streams LibriSpeech test-clean, gathers UNUSED male speakers (95-160 Hz median F0,
verified by pitch so no females slip in), picks 4 spread across the range for variety,
and writes each to scripts/voices/<key>.wav + a cast.json entry. The disclaimer voice
(ad-disclaimer) is shared and NOT touched here.

Run:  python scripts/pick-announcer-voices.py
"""
import io, json, warnings
from pathlib import Path
warnings.filterwarnings("ignore")
import numpy as np
import soundfile as sf

CAST_FILE  = Path(__file__).parent / "cast.json"
VOICES_DIR = Path(__file__).parent / "voices"
TARGET_SR  = 24_000
MIN_CLIP_SECS = 5.0
WANT_POOL = 16

# every speaker already in use — announcers must be distinct from all of them.
USED = {1089, 1188, 1284, 2300, 61, 672, 237, 1320, 121, 7127,
        2961, 4077, 3570, 260, 1580, 2830, 7729, 8463, 5639}

# new announcer cast keys (one per ad) -> (display name, color)
ANN = [
    ("ad-ann-rage",    "Rage Pitchman",    "#ff3b30"),
    ("ad-ann-surgery", "Surgery Pitchman", "#34c759"),
    ("ad-ann-cash",    "Cash Pitchman",    "#30b0c7"),
    ("ad-ann-cat",     "Cat Pitchman",     "#ff9500"),
]


def median_f0(arr, sr):
    frame, hop = int(0.04 * sr), int(0.02 * sr)
    lo, hi = sr // 320, sr // 70
    f0s = []
    for s in range(0, len(arr) - frame, hop):
        x = arr[s:s + frame].astype(np.float64); x -= x.mean()
        if np.sqrt((x * x).mean()) < 0.01:
            continue
        ac = np.correlate(x, x, mode="full")[len(x) - 1:]
        if ac[0] <= 0:
            continue
        seg = ac[lo:hi]
        if len(seg) == 0:
            continue
        lag = lo + int(np.argmax(seg))
        if ac[lag] / ac[0] < 0.3:
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

    males = {}  # spk -> (arr, sr, text, f0)
    for sample in ds:
        spk = int(sample["speaker_id"])
        if spk in USED or spk in males:
            continue
        raw = sample["audio"]
        rb = raw.get("bytes") or open(raw["path"], "rb").read()
        arr, sr = sf.read(io.BytesIO(rb), dtype="float32")
        arr = arr.astype(np.float32)
        text = sample.get("text", "").strip()
        if len(arr) / sr < MIN_CLIP_SECS or not text:
            continue
        f0 = median_f0(arr, sr)
        if not (95 <= f0 <= 160):   # male band
            continue
        males[spk] = (arr, sr, text, f0)
        print(f"  male candidate {spk}: {len(arr)/sr:.1f}s, F0 {f0:.0f} Hz")
        if len(males) >= WANT_POOL:
            break

    if len(males) < len(ANN):
        raise SystemExit(f"Only {len(males)} male candidates; need {len(ANN)}.")

    # spread across the pitch range for variety: sort by F0, take evenly-spaced picks.
    order = sorted(males, key=lambda s: males[s][3])
    idxs = [round(i * (len(order) - 1) / (len(ANN) - 1)) for i in range(len(ANN))]
    picks = [order[i] for i in idxs]

    for (key, name, color), spk in zip(ANN, picks):
        arr, sr, text, f0 = males[spk]
        sf.write(str(VOICES_DIR / f"{key}.wav"), resample(arr, sr, TARGET_SR), TARGET_SR)
        (VOICES_DIR / f"{key}.txt").write_text(text, encoding="utf-8")
        cast[key] = {
            "name": name, "color": color, "role": "Guest Expert",
            "instruct": "male, middle-aged, american accent",
            "speed": 1.15, "phone_filter": False,
            "ref_audio": f"scripts/voices/{key}.wav", "ref_text": text, "gender": "M",
        }
        print(f"  {key} <- speaker {spk} (F0 {f0:.0f} Hz)")

    CAST_FILE.write_text(json.dumps(cast, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\ncast.json updated with {len(ANN)} announcer voices: {[p for p in picks]}")


if __name__ == "__main__":
    main()
