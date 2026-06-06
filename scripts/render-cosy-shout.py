#!/usr/bin/env python3
"""Render an EMOTIONAL Mandarin shout with CosyVoice 2 (has instruction-based emotion,
which OmniVoice lacks). Keeps Chen's voice via his clip as the prompt, adds anger via a
natural-language instruction. Runs inside WSL conda env `cosy`, from the CosyVoice repo:

    conda run -n cosy python /mnt/c/.../scripts/render-cosy-shout.py

Output: scripts/sfx/chen-catch.wav (24k mono) — used as Chen's caller-side catch-shout overlay.
"""
import sys
from pathlib import Path

COSY = Path.home() / "CosyVoice"
sys.path.insert(0, str(COSY))
sys.path.insert(0, str(COSY / "third_party" / "Matcha-TTS"))

import torch
import torchaudio
from cosyvoice.cli.cosyvoice import CosyVoice2

REPO = Path("/mnt/c/Users/acoop/Documents/GitHub/SnazzieSpaceReact")
PROMPT = REPO / "scripts/voices/chen.wav"          # Chen's voice to clone (this build takes a path)
OUT = REPO / "scripts/sfx/chen-catch.wav"
TEXT = "快，快点抓住它！你在干什么呢，你这个白痴！"
# Stronger emotion cue: furious, hysterical, hoarse screaming, very fast, out of control.
INSTRUCT = "愤怒地歇斯底里地大吼大叫，声嘶力竭，语速极快，情绪失控暴怒"
SPEED = 1.1   # slightly quick, not rushed

model = CosyVoice2(str(COSY / "pretrained_models/CosyVoice2-0.5B"),
                   load_jit=False, load_trt=False, fp16=False)

chunks = [r["tts_speech"] for r in
          model.inference_instruct2(TEXT, INSTRUCT, str(PROMPT), stream=False, speed=SPEED)]
audio = torch.cat(chunks, dim=1)
# to 24k mono
if model.sample_rate != 24000:
    audio = torchaudio.functional.resample(audio, model.sample_rate, 24000)
torchaudio.save(str(OUT), audio, 24000)
print(f"wrote {OUT}  {audio.shape[1]/24000:.2f}s  (sr {model.sample_rate})")
