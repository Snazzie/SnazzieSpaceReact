#!/usr/bin/env python3
"""Dia2 generator for Snazzie FM episodes (engine: "dia2").

Dia2 (nari-labs/Dia2-2B) is a streaming dialogue model: up to ~2 min per pass with real
turn-taking, per-speaker prefix conditioning, and WORD TIMESTAMPS in the output. We
generate the whole episode (split into <=~100s passes at [S1] boundaries), then use the
word timestamps to split each pass into exact per-line clips — so callers get a clean
phone filter and clips drop into the per-clip multitrack player. No silence-guessing.

Must run inside the dia2 uv env, e.g.:
    uv run --project ../dia2 --with soundfile --with scipy \
        python scripts/generate-radio-dia2.py the-frank-tapes
"""

import argparse
import json
import re
from pathlib import Path

import numpy as np
import soundfile as sf
import torch
from scipy.signal import butter, sosfilt

REPO_ROOT   = Path(__file__).parent.parent
CAST_FILE   = Path(__file__).parent / "cast.json"
SCRIPTS_DIR = REPO_ROOT / "Website/src/data/radio"
AUDIO_DIR   = REPO_ROOT / "Website/public/audio/radio"
REPO_2B     = "nari-labs/Dia2-2B"
OUT_SR      = 24_000
PASS_SECS   = 100.0    # keep each Dia2 pass under its ~2 min limit
CHARS_PER_SEC = 14.0
DEFAULT_GAP = 0.18
MIN_SOLO    = 0.5

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


def speech_bounds(a: np.ndarray, thresh: float = 0.015) -> tuple[int, int]:
    if len(a) == 0:
        return 0, 0
    m = np.abs(a) > thresh
    if not m.any():
        return 0, len(a)
    return int(np.argmax(m)), int(len(m) - np.argmax(m[::-1]))


def phone(a: np.ndarray) -> np.ndarray:
    f = sosfilt(_PHONE_SOS, a).astype(np.float32)
    pk = float(np.max(np.abs(f))) if len(f) else 0.0
    return (f / pk * 0.95) if pk > 0 else f


def tok(text: str) -> list[str]:
    return re.findall(r"[a-z0-9']+", re.sub(r"\([^)]*\)", "", text.lower()))


def build_passes(lines: list[dict], s1: str) -> list[list[int]]:
    """Split the episode into <=PASS_SECS passes, each starting on [S1]."""
    passes, cur, chars = [], [], 0
    for i, line in enumerate(lines):
        est = len(re.sub(r"\([^)]*\)", "", line["text"]))
        if cur and line["speaker"] == s1 and (chars + est) / CHARS_PER_SEC > PASS_SECS:
            passes.append(cur); cur, chars = [], 0
        cur.append(i); chars += est
    if cur:
        passes.append(cur)
    return passes


def place(lengths, sb0, sb1, lines):
    ms = int(MIN_SOLO * OUT_SR)
    starts, ps, pe = [], 0, 0
    for i, line in enumerate(lines):
        if i == 0:
            start, onset = 0, sb0[i]
        else:
            ov = float(line.get("overlap", 0.0))
            gap = -int(ov * OUT_SR) if ov > 0 else (int(abs(ov) * OUT_SR) if ov < 0 else int(DEFAULT_GAP * OUT_SR))
            onset = max(pe + gap, ps + ms)
            start = max(0, onset - sb0[i])
            onset = start + sb0[i]
        starts.append(start); ps, pe = onset, start + sb1[i]
    return starts


def generate(slug: str) -> None:
    from dia2 import Dia2, GenerationConfig, SamplingConfig

    episode = json.loads((SCRIPTS_DIR / f"{slug}.json").read_text(encoding="utf-8"))
    lines = episode["lines"]
    cast = load_cast()
    speakers = list(dict.fromkeys(l["speaker"] for l in lines))
    if len(speakers) != 2:
        raise SystemExit(f"Dia2 needs exactly 2 speakers; got {speakers}")
    tag = {speakers[0]: "[S1]", speakers[1]: "[S2]"}

    clip_dir = AUDIO_DIR / slug
    clip_dir.mkdir(parents=True, exist_ok=True)
    # remove only legacy per-clip files; keep episode.flac live until the new one is ready
    for old in clip_dir.glob("[0-9]*.flac"):
        old.unlink()

    # Episodes can mark a normally-phone speaker as in-studio (no phone) for this episode.
    no_phone = set(episode.get("no_phone", []))

    # Build prefix wavs. For phone_filter speakers, bandpass the PREFIX so Dia2 clones a
    # phone-toned voice — the effect is baked into generation, not applied to split audio
    # afterward (which leaked across line boundaries).
    def make_prefix(spk: str, dst: Path) -> str:
        c = cast[spk]
        wav, sr = sf.read(str(REPO_ROOT / c["ref_audio"]), dtype="float32")
        if wav.ndim > 1:
            wav = wav.mean(axis=1)
        # prefix_stretch > 1 slows + lowers the prefix → Dia2 clones a calmer, more monotone,
        # "stoned" cadence for that speaker (e.g. Ronnie).
        st = float(c.get("prefix_stretch", 1.0))
        if abs(st - 1.0) > 1e-3:
            from scipy.signal import resample_poly
            wav = resample_poly(wav, int(round(st * 100)), 100).astype(np.float32)
        if c.get("phone_filter") and spk not in no_phone:   # per-episode studio override
            sos = butter(4, [300 / (sr / 2), 3400 / (sr / 2)], btype="band", output="sos")
            wav = sosfilt(sos, wav).astype(np.float32)
            pk = float(np.max(np.abs(wav))) or 1.0
            wav = wav / pk * 0.95
        sf.write(str(dst), wav, sr)
        return str(dst)

    prefix1 = make_prefix(speakers[0], clip_dir / "_prefix1.wav")
    prefix2 = make_prefix(speakers[1], clip_dir / "_prefix2.wav")

    print(f"  loading {REPO_2B}...")
    dia = Dia2.from_repo(REPO_2B, device="cuda" if torch.cuda.is_available() else "cpu", dtype="bfloat16")
    cfg = GenerationConfig(
        cfg_scale=3.0,
        audio=SamplingConfig(temperature=0.8, top_k=50),
        use_cuda_graph=True,
    )

    passes = build_passes(lines, speakers[0])
    print(f"  {len(lines)} lines -> {len(passes)} pass(es)")

    PASS_GAP = 0.35
    parts: list[np.ndarray] = []
    line_start = [0.0] * len(lines)   # absolute start seconds (from word timestamps)
    cursor = 0.0

    for pi, idxs in enumerate(passes):
        script = " ".join(f"{tag[lines[i]['speaker']]} {lines[i]['text'].strip()}" for i in idxs)
        res = dia.generate(script, config=cfg, prefix_speaker_1=prefix1,
                           prefix_speaker_2=prefix2, include_prefix=False, verbose=False)
        wav = res.waveform.detach().cpu().numpy().astype(np.float32)
        if wav.ndim > 1:
            wav = wav.mean(axis=0) if wav.shape[0] < wav.shape[-1] else wav.mean(axis=1)
        wav = resample(wav, res.sample_rate, OUT_SR)
        pk = float(np.max(np.abs(wav))) or 1.0
        wav = wav / pk * 0.95
        stamps = res.timestamps          # [(word, start_sec), ...] aligned to the script
        total = len(wav) / OUT_SR

        # Metadata only: per-line start = its first word's timestamp (no audio splitting)
        wi = 0
        for i in idxs:
            st = stamps[wi][1] if wi < len(stamps) else total
            line_start[i] = round(cursor + min(st, total), 3)
            wi = min(len(stamps), wi + max(1, len(tok(lines[i]["text"]))))
        parts.append(wav)
        parts.append(np.zeros(int(PASS_GAP * OUT_SR), dtype=np.float32))
        cursor += total + PASS_GAP
        print(f"    pass {pi+1}/{len(passes)}: lines {idxs[0]}-{idxs[-1]}, {total:.1f}s, {len(stamps)} words")

    # cleanup temp prefix wavs (don't ship them)
    (clip_dir / "_prefix1.wav").unlink(missing_ok=True)
    (clip_dir / "_prefix2.wav").unlink(missing_ok=True)

    track = np.concatenate(parts) if parts else np.zeros(1, dtype=np.float32)
    track = np.tanh(track * 1.05).astype(np.float32)
    pk = float(np.max(np.abs(track))) or 1.0
    track = (track / pk * 0.95).astype(np.float32)
    import os
    tmpf = clip_dir / "episode.flac.tmp"
    sf.write(str(tmpf), track, OUT_SR, format="flac")
    os.replace(str(tmpf), str(clip_dir / "episode.flac"))   # atomic swap — no no-sound window

    episode["track"] = f"/audio/radio/{slug}/episode.flac"
    for i, line in enumerate(lines):
        nxt = line_start[i + 1] if i + 1 < len(lines) else cursor
        line["timestamp"] = line_start[i]
        line["duration"]  = round(max(0.3, nxt - line_start[i]), 3)
        line.pop("audio", None)
    (SCRIPTS_DIR / f"{slug}.json").write_text(json.dumps(episode, indent=2, ensure_ascii=False), encoding="utf-8")
    tl = len(track) / OUT_SR
    print(f"  placed {len(lines)} clips, timeline {tl:.1f}s")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("slug")
    args = p.parse_args()
    generate(args.slug)
