#!/usr/bin/env python3
"""Re-pull the curated advert reference voices from the registry.

Reads the curated roster in scripts/ad-voices.json (the pinned speaker per ad voice),
streams LibriSpeech test-clean, writes each voice's wav+txt to scripts/voices/, and
updates ONLY those cast.json entries. Does NOT overwrite any non-ad voice (safe after
Todd/Kim were hand-diverged). To curate the roster, edit ad-voices.json (use
pick-announcer-voices.py / pick-disclaimer-voice.py to discover a speaker first).

Usage:  python scripts/download-ad-voices.py
"""
import io, json, warnings
from pathlib import Path
warnings.filterwarnings("ignore")
import numpy as np
import soundfile as sf

CAST_FILE     = Path(__file__).parent / "cast.json"
REGISTRY_FILE = Path(__file__).parent / "ad-voices.json"
VOICES_DIR    = Path(__file__).parent / "voices"
TARGET_SR  = 24_000
MIN_CLIP_SECS = 4.0

# char_name -> (test-clean speaker_id, gender), loaded from the curated registry.
_registry = json.loads(REGISTRY_FILE.read_text(encoding="utf-8"))["voices"]
AD_VOICES = {k: (int(v["speaker"]), v["gender"]) for k, v in _registry.items()}

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
    needed = {sid for sid, _ in AD_VOICES.values()}
    ds = load_dataset("openslr/librispeech_asr", "clean", split="test", streaming=True)
    ds = ds.cast_column("audio", hf_datasets.Audio(decode=False))
    collected = {}
    for sample in ds:
        spk = int(sample["speaker_id"])
        if spk not in needed or spk in collected:
            continue
        raw = sample["audio"]
        rb = raw.get("bytes") or open(raw["path"], "rb").read()
        arr, sr = sf.read(io.BytesIO(rb), dtype="float32")
        arr = arr.astype(np.float32)
        text = sample.get("text", "").strip()
        if len(arr) / sr < MIN_CLIP_SECS or not text:
            continue
        collected[spk] = (arr, sr, text)
        print(f"  {spk}: {len(arr)/sr:.1f}s - \"{text[:60]}\"")
        if len(collected) == len(needed):
            break
    # Validate all speakers were collected before writing anything
    missing = []
    for char, (sid, gender) in AD_VOICES.items():
        if sid not in collected:
            missing.append((char, sid))

    if missing:
        print("ERROR: Missing speaker(s) from LibriSpeech test-clean:")
        for char, sid in missing:
            print(f"  - {char} (speaker id {sid})")
        print("\nNo files written. Pick an unused test-clean speaker id in AD_VOICES")
        print("(update scripts/download-ad-voices.py and re-run).")
        raise SystemExit(1)

    # All speakers present; proceed to write files and update cast.json
    for char, (sid, gender) in AD_VOICES.items():
        arr, sr, text = collected[sid]
        sf.write(str(VOICES_DIR / f"{char}.wav"), resample(arr, sr, TARGET_SR), TARGET_SR)
        (VOICES_DIR / f"{char}.txt").write_text(text, encoding="utf-8")
        if char in cast:
            cast[char]["ref_audio"] = f"scripts/voices/{char}.wav"
            cast[char]["ref_text"]  = text
            cast[char]["gender"]    = gender
        print(f"  {char} ({sid}, {gender}) saved")
    CAST_FILE.write_text(json.dumps(cast, indent=2, ensure_ascii=False), encoding="utf-8")
    print("cast.json updated for ad voices.")

if __name__ == "__main__":
    main()
