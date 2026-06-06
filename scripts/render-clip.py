#!/usr/bin/env python3
"""One-off OmniVoice clip renderer. Usage:
    python scripts/render-clip.py <speaker> <out.wav> "text to speak"
Used to mint helper clips outside the episode pipeline — e.g. a Chinese-accented ENGLISH
reference for Chen so Dia2 clones an accented-but-English voice (a Mandarin ref makes Dia2
render the whole pass in Chinese, accenting the other speaker too)."""
import sys
from pathlib import Path
import numpy as np
import soundfile as sf
import importlib.util

spec = importlib.util.spec_from_file_location("genradio", Path(__file__).parent / "generate-radio.py")
g = importlib.util.module_from_spec(spec)
spec.loader.exec_module(g)

speaker, out, text = sys.argv[1], sys.argv[2], sys.argv[3]
cast = g.load_cast()[speaker]
model = g.load_model()
clip = g._tts(text, cast, model)          # raw voice (no phone filter); Dia2 filters the prefix
sf.write(out, clip.astype(np.float32), g.SAMPLE_RATE)
print(f"wrote {out} ({len(clip)/g.SAMPLE_RATE:.2f}s)")
