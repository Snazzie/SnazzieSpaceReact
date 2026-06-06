#!/usr/bin/env python3
"""One-off: render Chen's Mandarin aside-to-chef as a standalone clip (OmniVoice handles
Chinese; Dia2 cannot host it without contaminating the whole pass's language). Output is a
24k mono wav used as a caller-side SFX overlay in the Dia2 episode."""
import sys
from pathlib import Path
import numpy as np
import soundfile as sf

sys.path.insert(0, str(Path(__file__).parent))
import importlib.util
spec = importlib.util.spec_from_file_location("genradio", Path(__file__).parent / "generate-radio.py")
g = importlib.util.module_from_spec(spec)
spec.loader.exec_module(g)

TEXT = "哎呀，快点！把它弄出去！"
OUT = Path(__file__).parent / "sfx" / "chen-aside.wav"

cast = g.load_cast()["caller-chen"]
model = g.load_model()
clip = g._tts(TEXT, cast, model)          # raw voice, no phone filter (the sfx line applies it)
sf.write(str(OUT), clip.astype(np.float32), g.SAMPLE_RATE)
print(f"wrote {OUT} ({len(clip)/g.SAMPLE_RATE:.2f}s)")
