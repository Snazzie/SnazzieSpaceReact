#!/usr/bin/env python3
"""Pull a distinct Mandarin MALE reference clip for Mr. Chen from google/fleurs
(cmn_hans_cn), separate from Todd's voice. Saves 24k mono wav + prints the transcript
to paste into cast.json `ref_text`. Male is picked by low mean F0 (autocorrelation)."""
import io
import numpy as np, soundfile as sf
from datasets import load_dataset, Audio

OUT = "scripts/voices/chen.wav"
SR = 24_000

def mean_f0(x, sr, lo=70, hi=300):
    x = x[: sr * 3].astype(np.float64)
    if len(x) < sr // 2:
        return 0.0
    x -= x.mean()
    win = int(0.04 * sr); hop = int(0.02 * sr); fs = []
    for s in range(0, len(x) - win, hop):
        f = x[s:s + win]
        if np.sqrt((f * f).mean()) < 0.01:
            continue
        c = np.correlate(f, f, "full")[win - 1:]
        a, b = sr // hi, sr // lo
        if b >= len(c):
            continue
        peak = a + int(np.argmax(c[a:b]))
        if peak > 0:
            fs.append(sr / peak)
    return float(np.median(fs)) if fs else 0.0

ds = load_dataset("google/fleurs", "cmn_hans_cn", split="test", streaming=True)
ds = ds.cast_column("audio", Audio(decode=False))   # avoid torchcodec; decode bytes ourselves
# Skip the first few (Todd came from an early clip); scan for a distinct clear male clip.
seen = 0
for ex in ds:
    a = ex["audio"]
    raw = a.get("bytes")
    if raw is None:
        wav, sr = sf.read(a["path"], dtype="float32")
    else:
        wav, sr = sf.read(io.BytesIO(raw), dtype="float32")
    wav = np.asarray(wav, dtype=np.float32)
    if wav.ndim > 1:
        wav = wav.mean(axis=1).astype(np.float32)
    dur = len(wav) / sr
    if not (4.0 <= dur <= 9.0):
        continue
    seen += 1
    if seen <= 6:                       # leave the early clips alone (Todd territory)
        continue
    f0 = mean_f0(wav, sr)
    if not (90 <= f0 <= 160):           # male band
        continue
    if sr != SR:
        from scipy.signal import resample_poly
        from math import gcd
        g = gcd(sr, SR); wav = resample_poly(wav, SR // g, sr // g).astype(np.float32)
    pk = float(np.max(np.abs(wav))) or 1.0
    wav = wav / pk * 0.95
    sf.write(OUT, wav, SR)
    import io as _io
    _io.open("scripts/voices/chen.txt", "w", encoding="utf-8").write(ex["transcription"])
    print(f"wrote {OUT}  dur={dur:.1f}s  f0={f0:.0f}Hz  (ref_text -> scripts/voices/chen.txt)")
    break
else:
    print("no suitable male clip found")
