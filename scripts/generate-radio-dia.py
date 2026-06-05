#!/usr/bin/env python3
"""Dia generator for Snazzie FM episodes (engine: "dia").

Dia hates short inputs (<5s sounds unnatural / rambles), but we want per-line clips so
callers can get a clean phone filter and everything drops into the per-clip multitrack
player. Solution: generate in CONVERSATIONAL CHUNKS (8-16s, real turn-taking, stable),
then SPLIT each chunk into per-line segments at the silence gaps between turns, and
phone-filter only the caller segments. Best of both: natural flow + isolated voices.

Usage:
    python scripts/generate-radio-dia.py the-frank-tapes
"""

import argparse
import hashlib
import json
import re
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")

import numpy as np
import soundfile as sf
import torch
from scipy.signal import butter, sosfilt

REPO_ROOT   = Path(__file__).parent.parent
CAST_FILE   = Path(__file__).parent / "cast.json"
SCRIPTS_DIR = REPO_ROOT / "Website/src/data/radio"
AUDIO_DIR   = REPO_ROOT / "Website/public/audio/radio"
MODEL_CK    = "nari-labs/Dia-1.6B-0626"
DIA_SR      = 44_100
OUT_SR      = 24_000
PRIME_CAP   = 4.5     # seconds of reference per speaker (2-speaker prompt ~9s, Dia sweet spot)
MIN_CHUNK_SECS = 8.0  # group turns into 8-16s chunks so Dia never sees a too-short input
DEFAULT_GAP = 0.18    # gap between speech of adjacent placed clips
MIN_SOLO    = 0.5
CHARS_PER_SEC = 14.0
TOKENS_PER_SEC = 86
PIPELINE_VERSION = "dia-4"

_PHONE_SOS = butter(4, [300 / (OUT_SR / 2), 3400 / (OUT_SR / 2)], btype="band", output="sos")


def load_cast() -> dict:
    return json.loads(CAST_FILE.read_text(encoding="utf-8"))


def resample(audio: np.ndarray, src: int, dst: int) -> np.ndarray:
    if src == dst:
        return audio.astype(np.float32)
    from scipy.signal import resample_poly
    from math import gcd
    g = gcd(src, dst)
    return resample_poly(audio, dst // g, src // g).astype(np.float32)


def speech_bounds(audio: np.ndarray, thresh: float = 0.015) -> tuple[int, int]:
    if len(audio) == 0:
        return 0, 0
    mask = np.abs(audio) > thresh
    if not mask.any():
        return 0, len(audio)
    return int(np.argmax(mask)), int(len(mask) - np.argmax(mask[::-1]))


def apply_phone_filter(audio: np.ndarray) -> np.ndarray:
    filtered = sosfilt(_PHONE_SOS, audio).astype(np.float32)
    peak = float(np.max(np.abs(filtered))) if len(filtered) else 0.0
    if peak > 0:
        filtered = filtered / peak * 0.95
    return filtered


def clean_len(text: str) -> int:
    return max(1, len(re.sub(r"\([^)]*\)", "", text)))


def build_chunks(lines: list[dict], s1: str) -> list[list[int]]:
    """~8-16s chunks that start on [S1]; break at S1 boundaries once big enough."""
    chunks, cur, chars = [], [], 0
    for i, line in enumerate(lines):
        if cur and line["speaker"] == s1 and (chars / CHARS_PER_SEC) >= MIN_CHUNK_SECS:
            chunks.append(cur); cur, chars = [], 0
        cur.append(i); chars += clean_len(line["text"])
    if cur:
        chunks.append(cur)
    return chunks


def split_turns(clip: np.ndarray, sr: int, weights: list[int]) -> list[np.ndarray]:
    """Split a multi-turn chunk into len(weights) segments at the biggest silence gaps
    (turn boundaries). Falls back to length-proportional split if gaps aren't found."""
    n = len(weights)
    if n <= 1:
        return [clip]
    hop, win = int(0.01 * sr), int(0.025 * sr)
    frames = max(1, (len(clip) - win) // hop)
    env = np.array([np.sqrt((clip[k * hop:k * hop + win] ** 2).mean()) for k in range(frames)])
    thr = max(0.02, env.max() * 0.15) if env.size else 0.02
    # contiguous silence runs
    runs, k = [], 0
    silent = env < thr
    while k < len(silent):
        if silent[k]:
            j = k
            while j < len(silent) and silent[j]:
                j += 1
            runs.append((k, j))
            k = j
        else:
            k += 1
    edge = int(0.3 * sr)
    cands = []
    for a, b in runs:
        center = (a + b) // 2 * hop + win // 2
        if edge < center < len(clip) - edge and (b - a) * hop >= int(0.05 * sr):
            cands.append((b - a, center))
    cands.sort(reverse=True)
    bounds = sorted(c for _, c in cands[:n - 1])
    if len(bounds) < n - 1:   # not enough gaps -> proportional split
        total = sum(weights)
        bounds, acc = [], 0
        for w in weights[:-1]:
            acc += w
            bounds.append(int(len(clip) * acc / total))
    segs, prev = [], 0
    for bnd in bounds:
        segs.append(clip[prev:bnd]); prev = bnd
    segs.append(clip[prev:])
    return segs


def build_prime(speakers: list[str], tag: dict, cast: dict):
    parts, audio = [], []
    for spk in speakers:
        c = cast[spk]
        wav, sr = sf.read(str(REPO_ROOT / c["ref_audio"]), dtype="float32")
        if wav.ndim > 1:
            wav = wav.mean(axis=1)
        wav = resample(wav, sr, DIA_SR)
        words = c["ref_text"].strip().split()
        dur = len(wav) / DIA_SR
        if dur > PRIME_CAP:
            wav = wav[: int(PRIME_CAP * DIA_SR)]
            words = words[: max(1, int(len(words) * PRIME_CAP / dur))]
        audio.append(wav)
        parts.append(f"{tag[spk]} {' '.join(words)}")
    return np.concatenate(audio).astype(np.float32), " ".join(parts), len(np.concatenate(audio)) / DIA_SR


def chunk_hash(idxs, lines, tag, seed) -> str:
    body = "|".join(f"{tag[lines[i]['speaker']]}:{lines[i]['text'].strip()}" for i in idxs)
    return hashlib.sha1(f"{PIPELINE_VERSION}|{seed}|{body}".encode("utf-8")).hexdigest()[:16]


def place(lengths, sb_start, sb_end, lines):
    min_solo = int(MIN_SOLO * OUT_SR)
    starts, prev_s, prev_e = [], 0, 0
    for i, line in enumerate(lines):
        if i == 0:
            start, onset = 0, sb_start[i]
        else:
            ov = float(line.get("overlap", 0.0))
            gap = -int(ov * OUT_SR) if ov > 0 else (int(abs(ov) * OUT_SR) if ov < 0 else int(DEFAULT_GAP * OUT_SR))
            onset = max(prev_e + gap, prev_s + min_solo)
            start = max(0, onset - sb_start[i])
            onset = start + sb_start[i]
        starts.append(start)
        prev_s, prev_e = onset, start + sb_end[i]
    return starts


def generate(slug: str, seed: int) -> None:
    from transformers import AutoProcessor, DiaForConditionalGeneration

    script_path = SCRIPTS_DIR / f"{slug}.json"
    episode = json.loads(script_path.read_text(encoding="utf-8"))
    lines   = episode["lines"]
    cast    = load_cast()
    clip_dir = AUDIO_DIR / slug
    clip_dir.mkdir(parents=True, exist_ok=True)
    (clip_dir / "episode.flac").unlink(missing_ok=True)

    speakers = list(dict.fromkeys(l["speaker"] for l in lines))
    if len(speakers) != 2:
        raise SystemExit(f"Dia needs exactly 2 speakers; got {speakers}")
    tag = {speakers[0]: "[S1]", speakers[1]: "[S2]"}

    manifest_path = clip_dir / ".clips.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {}

    chunks = build_chunks(lines, speakers[0])
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"  {slug}: {len(lines)} lines -> {len(chunks)} chunks, device {device}")

    model = processor = prime = None
    tmp = clip_dir / "_dia_tmp.wav"
    lengths = [0] * len(lines)
    sbs = [(0, 0)] * len(lines)
    rendered = 0

    for ci, idxs in enumerate(chunks):
        key = chunk_hash(idxs, lines, tag, seed)
        if all(manifest.get(str(i), {}).get("hash") == key and (clip_dir / f"{i}.flac").exists() for i in idxs):
            for i in idxs:
                m = manifest[str(i)]; lengths[i] = int(m["length"]); sbs[i] = tuple(m["sb"])
            continue
        if model is None:
            print(f"  loading {MODEL_CK}...")
            processor = AutoProcessor.from_pretrained(MODEL_CK)
            model = DiaForConditionalGeneration.from_pretrained(MODEL_CK).to(device)
            prime = build_prime(speakers, tag, cast)
        prime_wav, prime_tx, prime_secs = prime
        body = " ".join(f"{tag[lines[i]['speaker']]} {lines[i]['text'].strip()}" for i in idxs)
        torch.manual_seed(seed)
        if torch.cuda.is_available():
            torch.cuda.manual_seed_all(seed)
        inputs = processor(text=[f"{prime_tx} {body}"], audio=[prime_wav],
                           padding=True, return_tensors="pt").to(device)
        content_secs = sum(clean_len(lines[i]["text"]) for i in idxs) / CHARS_PER_SEC
        max_tok = max(512, min(3072, int((prime_secs + content_secs * 1.6) * TOKENS_PER_SEC) + 256))
        out = model.generate(**inputs, max_new_tokens=max_tok,
                             guidance_scale=4.0, temperature=1.3, top_p=0.95, top_k=50)
        processor.save_audio(processor.batch_decode(out), str(tmp))
        audio, sr = sf.read(str(tmp), dtype="float32")
        if audio.ndim > 1:
            audio = audio.mean(axis=1)
        clip = resample(audio, sr, OUT_SR)
        cut = int(prime_secs * OUT_SR)
        content = clip[cut:] if cut < len(clip) else clip

        segs = split_turns(content, OUT_SR, [clean_len(lines[i]["text"]) for i in idxs])
        for i, seg in zip(idxs, segs):
            # trim leading silence, phone-filter callers, normalize peak
            nz = np.nonzero(np.abs(seg) > 0.02)[0]
            if len(nz):
                seg = seg[max(0, nz[0] - int(0.05 * OUT_SR)):]
            if cast[lines[i]["speaker"]].get("phone_filter"):
                seg = apply_phone_filter(seg)
            peak = float(np.max(np.abs(seg))) if len(seg) else 0.0
            if peak > 0.97:
                seg = seg / peak * 0.95
            seg = seg.astype(np.float32)
            sf.write(str(clip_dir / f"{i}.flac"), seg, OUT_SR, format="flac")
            s, e = speech_bounds(seg)
            manifest[str(i)] = {"hash": key, "length": len(seg), "sb": [s, e]}
            lengths[i] = len(seg); sbs[i] = (s, e)
        rendered += 1
        print(f"    chunk {ci+1}/{len(chunks)}: lines {idxs[0]}-{idxs[-1]} -> {len(segs)} segs, {len(content)/OUT_SR:.1f}s")

    tmp.unlink(missing_ok=True)
    manifest_path.write_text(json.dumps(manifest), encoding="utf-8")

    starts = place(lengths, [s for s, _ in sbs], [e for _, e in sbs], lines)
    episode.pop("track", None)
    for i, line in enumerate(lines):
        line["timestamp"] = round(starts[i] / OUT_SR, 3)
        line["duration"]  = round(lengths[i] / OUT_SR, 3)
        line["audio"]     = f"/audio/radio/{slug}/{i}.flac"
    script_path.write_text(json.dumps(episode, indent=2, ensure_ascii=False), encoding="utf-8")
    total = (max(st + l for st, l in zip(starts, lengths)) / OUT_SR) if lengths else 0
    print(f"  placed {len(lines)} clips, {rendered} chunks (re)rendered, timeline {total:.1f}s")


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("slug")
    p.add_argument("--seed", type=int, default=42)
    args = p.parse_args()
    generate(args.slug, args.seed)


if __name__ == "__main__":
    main()
