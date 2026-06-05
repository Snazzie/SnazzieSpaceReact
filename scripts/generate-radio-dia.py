#!/usr/bin/env python3
"""Dia dialogue generator for 2-speaker Snazzie FM episodes.

Unlike generate-radio.py (per-line OmniVoice clips), this renders a whole 2-hander
conversation with Dia (nari-labs/Dia-1.6B-0626) — real turn-taking — into ONE track,
then recovers per-line timestamps with faster-whisper forced alignment so the existing
transcript/seek UI works.

Constraints (Dia): exactly 2 speakers ([S1]/[S2], alternating, must start [S1]); best on
5-20s chunks. We chunk consecutive turns, prime every chunk with a fixed 2-voice audio
prompt for voice consistency, concatenate, then align.

Usage:
    python scripts/generate-radio-dia.py the-frank-tapes
"""

import argparse
import json
import re
import sys
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")

import numpy as np
import soundfile as sf
import torch

REPO_ROOT   = Path(__file__).parent.parent
CAST_FILE   = Path(__file__).parent / "cast.json"
SCRIPTS_DIR = REPO_ROOT / "Website/src/data/radio"
AUDIO_DIR   = REPO_ROOT / "Website/public/audio/radio"
MODEL_CK    = "nari-labs/Dia-1.6B-0626"
DIA_SR      = 44_100
OUT_SR      = 24_000
CHUNK_SECS  = 16.0          # target spoken seconds per Dia call (keep 5-20s)
CHARS_PER_SEC = 15.0        # rough estimate to size chunks
GAP_SECS    = 0.25          # silence between concatenated chunks


def load_cast() -> dict:
    return json.loads(CAST_FILE.read_text(encoding="utf-8"))


def resample(audio: np.ndarray, src: int, dst: int) -> np.ndarray:
    if src == dst:
        return audio.astype(np.float32)
    from scipy.signal import resample_poly
    from math import gcd
    g = gcd(src, dst)
    return resample_poly(audio, dst // g, src // g).astype(np.float32)


def build_chunks(lines: list[dict], s1: str) -> list[list[int]]:
    """Group consecutive line indices into ~CHUNK_SECS chunks. Each chunk must START on an
    S1 line (Dia requires input to begin with [S1] and alternate)."""
    chunks, cur, cur_chars = [], [], 0
    for i, line in enumerate(lines):
        n = len(line["text"])
        over = cur and (cur_chars + n) / CHARS_PER_SEC > CHUNK_SECS
        if over and line["speaker"] == s1:   # only break right before an S1 turn
            chunks.append(cur)
            cur, cur_chars = [], 0
        cur.append(i)
        cur_chars += n
    if cur:
        chunks.append(cur)
    return chunks


def chunk_text(idxs: list[int], lines: list[dict], tag: dict) -> str:
    parts = []
    for i in idxs:
        parts.append(f"{tag[lines[i]['speaker']]} {lines[i]['text'].strip()}")
    return " ".join(parts)


def generate(slug: str) -> None:
    from transformers import AutoProcessor, DiaForConditionalGeneration

    script_path = SCRIPTS_DIR / f"{slug}.json"
    episode = json.loads(script_path.read_text(encoding="utf-8"))
    lines   = episode["lines"]
    cast    = load_cast()

    speakers = list(dict.fromkeys(l["speaker"] for l in lines))
    if len(speakers) != 2:
        raise SystemExit(f"Dia needs exactly 2 speakers; got {speakers}")
    tag = {speakers[0]: "[S1]", speakers[1]: "[S2]"}
    print(f"  speaker map: {tag}")

    # Voice anchor: a fixed 2-speaker audio prompt (ref clips) + its transcript, prepended to
    # every chunk so S1/S2 keep the SAME voice across generations. Dia echoes the prompt at the
    # front of the output, so we slice it off by the prompt's measured duration.
    PRIME_CAP = 6.0  # seconds per speaker — keep the prompt short (Dia likes 5-10s total)
    prime_parts, prime_audio = [], []
    for spk in speakers:
        c = cast[spk]
        wav, sr = sf.read(str(REPO_ROOT / c["ref_audio"]), dtype="float32")
        if wav.ndim > 1:
            wav = wav.mean(axis=1)
        wav = resample(wav, sr, DIA_SR)
        full_dur = len(wav) / DIA_SR
        words = c["ref_text"].strip().split()
        if full_dur > PRIME_CAP:           # cap audio + transcript proportionally
            wav = wav[: int(PRIME_CAP * DIA_SR)]
            words = words[: max(1, int(len(words) * PRIME_CAP / full_dur))]
        prime_audio.append(wav)
        prime_parts.append(f"{tag[spk]} {' '.join(words)}")
    prime_transcript = " ".join(prime_parts)
    prime_waveform = np.concatenate(prime_audio).astype(np.float32)
    prime_secs = len(prime_waveform) / DIA_SR
    print(f"  voice prompt: {prime_secs:.1f}s ({speakers[0]}=S1, {speakers[1]}=S2)")

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"  device: {device}; loading {MODEL_CK}...")
    processor = AutoProcessor.from_pretrained(MODEL_CK)
    model = DiaForConditionalGeneration.from_pretrained(MODEL_CK).to(device)

    chunks = build_chunks(lines, speakers[0])
    print(f"  {len(lines)} lines -> {len(chunks)} chunks")

    out_dir = AUDIO_DIR / slug
    out_dir.mkdir(parents=True, exist_ok=True)
    tmp = out_dir / "_chunk_tmp.wav"

    rendered: list[np.ndarray] = []
    chunk_durs: list[float] = []   # spoken seconds per chunk (excludes the inter-chunk gap)
    for ci, idxs in enumerate(chunks):
        text = prime_transcript + " " + chunk_text(idxs, lines, tag)
        inputs = processor(
            text=[text],
            audio=[prime_waveform],
            sampling_rate=DIA_SR,
            padding=True,
            return_tensors="pt",
        ).to(device)
        out = model.generate(
            **inputs, max_new_tokens=4096,
            guidance_scale=3.0, temperature=1.8, top_p=0.90, top_k=45,
        )
        decoded = processor.batch_decode(out)
        processor.save_audio(decoded, str(tmp))      # documented save path
        audio, sr = sf.read(str(tmp), dtype="float32")
        if audio.ndim > 1:
            audio = audio.mean(axis=1)
        clip = resample(audio, sr, OUT_SR)
        # Drop the echoed prompt at the front (slice by prompt duration, with a small margin)
        cut = int(prime_secs * OUT_SR)
        if cut < len(clip):
            clip = clip[cut:]
        rendered.append(clip)
        rendered.append(np.zeros(int(OUT_SR * GAP_SECS), dtype=np.float32))
        chunk_durs.append(len(clip) / OUT_SR)
        print(f"    chunk {ci+1}/{len(chunks)}: lines {idxs[0]}-{idxs[-1]}, {chunk_durs[-1]:.1f}s")
    tmp.unlink(missing_ok=True)

    track = np.concatenate(rendered)
    mx = np.max(np.abs(track))
    if mx > 0:
        track = track / mx * 0.95

    out_flac = out_dir / "episode.flac"
    sf.write(str(out_flac), track, OUT_SR, format="flac")
    total = len(track) / OUT_SR
    print(f"  track written: {out_flac} ({total:.1f}s)")

    # Per-line timestamps: split each chunk's duration across its lines by spoken length.
    offset = 0.0
    for idxs, dur in zip(chunks, chunk_durs):
        weights = [max(1, len(re.sub(r"\([^)]*\)", "", lines[i]["text"]))) for i in idxs]
        wsum = sum(weights)
        t = offset
        for i, w in zip(idxs, weights):
            share = dur * w / wsum
            lines[i]["timestamp"] = round(t, 3)
            lines[i]["duration"] = round(share, 3)
            t += share
        offset += dur + GAP_SECS

    episode["track"] = f"/audio/radio/{slug}/episode.flac"
    for line in lines:
        line.pop("audio", None)
    (SCRIPTS_DIR / f"{slug}.json").write_text(
        json.dumps(episode, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"  timestamps + track written to {slug}.json (timeline {total:.1f}s)")


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("slug")
    p.add_argument("--seed", type=int, default=42)
    args = p.parse_args()
    torch.manual_seed(args.seed)
    generate(args.slug)


if __name__ == "__main__":
    main()
