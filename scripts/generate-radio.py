#!/usr/bin/env python3
"""Multi-track radio episode generator using OmniVoice TTS.

Each episode JSON has lines with { speaker, text, overlap } (authored).
Each line is rendered to its OWN audio file under <slug>/<i>.flac — there is no
final merged track. The browser schedules the per-line clips on a shared timeline
(see RadioStation.tsx), so changing `overlap` only re-runs the cheap placement
pass; the TTS clips are cached and reused whenever a line's text/voice is unchanged.

Usage:
    python scripts/generate-radio.py the-truth-hour   # render/refresh one episode
    python scripts/generate-radio.py --all             # all episodes
    python scripts/generate-radio.py the-truth-hour --remix  # placement only, never load model
"""

import argparse
import hashlib
import json
import sys
import warnings
from pathlib import Path

warnings.filterwarnings("ignore", message="Couldn't find ffmpeg", category=RuntimeWarning)

import numpy as np
import soundfile as sf
import torch
from scipy.signal import butter, sosfilt

REPO_ROOT    = Path(__file__).parent.parent
CAST_FILE    = Path(__file__).parent / "cast.json"
SCRIPTS_DIR  = REPO_ROOT / "Website/src/data/radio"
AUDIO_DIR    = REPO_ROOT / "Website/public/audio/radio"
SAMPLE_RATE  = 24_000
DEFAULT_GAP  = 0.15   # seconds between lines when overlap is 0
SPEED        = 1.15
MIN_SOLO     = 0.6    # seconds a clip plays solo before the next one may overlap it

# Phone bandpass: simulate caller telephone audio (300–3400 Hz)
_PHONE_SOS = butter(4, [300 / (SAMPLE_RATE / 2), 3400 / (SAMPLE_RATE / 2)], btype="band", output="sos")


def apply_phone_filter(audio: np.ndarray) -> np.ndarray:
    """Bandpass (300–3400 Hz) to simulate telephone quality. No added static."""
    return np.clip(sosfilt(_PHONE_SOS, audio).astype(np.float32), -1.0, 1.0)


def speech_bounds(audio: np.ndarray, thresh: float = 0.015) -> tuple[int, int]:
    """Measure (first, last) speech sample WITHOUT cutting. Used for placement only —
    clips are stored full, and their silent edges overlap harmlessly when placed."""
    if len(audio) == 0:
        return 0, 0
    mask = np.abs(audio) > thresh
    if not mask.any():
        return 0, len(audio)
    first = int(np.argmax(mask))
    last = int(len(mask) - np.argmax(mask[::-1]))
    return first, last


def load_cast() -> dict:
    return json.loads(CAST_FILE.read_text(encoding="utf-8"))


# Bump when the audio pipeline (filter/render) changes, to invalidate cached clips
PIPELINE_VERSION = "4"  # v4: tempo via ffmpeg atempo (WSOLA) instead of librosa phase vocoder


def sfx_hash(path: str, line: dict) -> str:
    """Content key for an SFX clip — re-rendered only when the file or its opts change."""
    try:
        file_key = hashlib.sha1((REPO_ROOT / path).read_bytes()).hexdigest()[:16]
    except OSError:
        file_key = "missing"
    payload = "|".join([
        PIPELINE_VERSION, "sfx", path, file_key,
        str(bool(line.get("phone_filter", False))),
        str(bool(line.get("distant", False))),
        f"{float(line.get('gain', 1.0))}",
        f"{float(line.get('trim', 0.0))}",
    ])
    return hashlib.sha1(payload.encode("utf-8")).hexdigest()[:16]


def render_sfx(path: str, line: dict) -> np.ndarray:
    """Load a real sound-effect file (already 24k mono) and apply phone/gain/distant."""
    clip, sr = sf.read(str(REPO_ROOT / path), dtype="float32")
    if clip.ndim > 1:
        clip = clip.mean(axis=1).astype(np.float32)
    if sr != SAMPLE_RATE:
        n = int(len(clip) * SAMPLE_RATE / sr)
        clip = np.interp(np.linspace(0, len(clip), n, endpoint=False),
                         np.arange(len(clip)), clip).astype(np.float32)
    trim = float(line.get("trim", 0.0))            # keep only the first `trim` seconds (0 = whole file)
    if trim > 0:
        clip = clip[: int(trim * SAMPLE_RATE)]
    if line.get("phone_filter", False):
        clip = apply_phone_filter(clip)
    if line.get("distant", False):
        clip = sosfilt(_DISTANT_SOS, clip).astype(np.float32)
    gain = float(line.get("gain", 1.0))
    if gain != 1.0:
        clip = (clip * gain).astype(np.float32)
    return clip


def clip_hash(text: str, c: dict) -> str:
    """Content key for a clip — TTS is re-run only when this changes."""
    speed = float(c.get("speed", SPEED))
    parts = [
        PIPELINE_VERSION,
        text, c["ref_audio"], c["ref_text"], c["instruct"],
        f"{speed}", str(bool(c.get("phone_filter", False))),
        f"{float(c.get('gain', 1.0))}", str(bool(c.get("distant", False))),
    ]
    # Only fold these in when set, so default clips keep their existing hash.
    tempo = float(c.get("tempo", 1.0))
    if tempo != 1.0:
        parts.append(f"tempo={tempo}")
    if "num_step" in c:
        parts.append(f"num_step={int(c['num_step'])}")
    if "guidance_scale" in c:
        parts.append(f"guidance_scale={float(c['guidance_scale'])}")
    if "position_temperature" in c:
        parts.append(f"position_temperature={float(c['position_temperature'])}")
    if "class_temperature" in c:
        parts.append(f"class_temperature={float(c['class_temperature'])}")
    if "seed" in c:
        parts.append(f"seed={int(c['seed'])}")
    return hashlib.sha1("|".join(parts).encode("utf-8")).hexdigest()[:16]


# Low-pass for "distant"/off-mic voices (muffled, like across the room)
_DISTANT_SOS = butter(4, 2600 / (SAMPLE_RATE / 2), btype="low", output="sos")


import re

# In-line pause token: "<p>" = 0.5s, "<p:0.8>" = 0.8s of silence inside a line
PAUSE_RE = re.compile(r"<p(?::([0-9.]+))?>")
DEFAULT_PAUSE = 0.5


_GEN_KNOBS = ("num_step", "guidance_scale", "position_temperature", "class_temperature")


def _gen_config(c: dict):
    """Optional per-voice OmniVoice inference knobs. `num_step` = denoising iterations
    (default 32; higher = better quality, slower). `guidance_scale` = CFG (default 2.0).
    `position_temperature` (default 5.0) / `class_temperature` (default 0.0) = sampling
    temperature; lower = more deterministic/stable. Returns None when none set."""
    if not any(k in c for k in _GEN_KNOBS):
        return None
    from omnivoice.models.omnivoice import OmniVoiceGenerationConfig
    return OmniVoiceGenerationConfig(
        num_step=int(c.get("num_step", 32)),
        guidance_scale=float(c.get("guidance_scale", 2.0)),
        position_temperature=float(c.get("position_temperature", 5.0)),
        class_temperature=float(c.get("class_temperature", 0.0)),
    )


def _tts(text: str, c: dict, model) -> np.ndarray:
    # Per-voice seed override = reroll this clip's "take" independently of the global seed.
    # Different seed -> different realization of the same voice/text; some come out cleaner.
    if "seed" in c:
        torch.manual_seed(int(c["seed"]))
    audio = model.generate(
        text=text,
        ref_audio=str(REPO_ROOT / c["ref_audio"]),
        ref_text=c["ref_text"],
        instruct=c["instruct"],
        speed=float(c.get("speed", SPEED)),
        generation_config=_gen_config(c),
    )
    return audio[0].astype(np.float32)  # full clip — no trimming; placement aligns by speech


def apply_tempo(clip: np.ndarray, tempo: float) -> np.ndarray:
    """Pitch-preserving time-compression via ffmpeg `atempo` (WSOLA — clean on speech).
    atempo accepts 0.5-2.0 per filter, so chain factors for anything outside that range."""
    import subprocess, tempfile, os
    factors: list[float] = []
    t = tempo
    while t > 2.0:
        factors.append(2.0); t /= 2.0
    while t < 0.5:
        factors.append(0.5); t /= 0.5
    factors.append(t)
    af = ",".join(f"atempo={f:.6f}" for f in factors)
    with tempfile.TemporaryDirectory() as d:
        inp, outp = os.path.join(d, "in.wav"), os.path.join(d, "out.wav")
        sf.write(inp, clip, SAMPLE_RATE)
        subprocess.run(
            ["ffmpeg", "-y", "-i", inp, "-filter:a", af, outp],
            check=True, capture_output=True,
        )
        out, _ = sf.read(outp, dtype="float32")
    return out.astype(np.float32)


def render_clip(text: str, c: dict, model) -> np.ndarray:
    # Split on pause tokens; render each spoken segment, join with real silence
    parts = PAUSE_RE.split(text)  # [seg, gap1, seg, gap2, ...] gap = captured secs (or None)
    segments: list[np.ndarray] = []
    for idx, part in enumerate(parts):
        if idx % 2 == 1:                       # a pause slot
            secs = float(part) if part else DEFAULT_PAUSE
            segments.append(np.zeros(int(secs * SAMPLE_RATE), dtype=np.float32))
        else:
            spoken = part.strip()
            if spoken:
                segments.append(_tts(spoken, c, model))
    clip = np.concatenate(segments) if segments else np.zeros(int(SAMPLE_RATE * 0.3), dtype=np.float32)
    if c.get("phone_filter", False):
        clip = apply_phone_filter(clip)
    if c.get("distant", False):          # off-mic / background: muffle (low-pass)
        clip = sosfilt(_DISTANT_SOS, clip).astype(np.float32)
    gain = float(c.get("gain", 1.0))     # quieter = further back in the mix
    if gain != 1.0:
        clip = (clip * gain).astype(np.float32)
    # Pitch-preserving speed-up applied AFTER generation. Use this (not a huge `speed`) to
    # make a clip genuinely faster: OmniVoice's `speed` token stops speeding up and starts
    # dropping words past ~2.0, whereas tempo time-stretches the full rendered clip so every
    # word survives. tempo > 1 = faster/shorter. Uses ffmpeg `atempo` (WSOLA) — far cleaner
    # on speech than a phase vocoder.
    tempo = float(c.get("tempo", 1.0))
    if tempo != 1.0:
        clip = apply_tempo(clip, tempo)
    return clip


def place(lengths: list[int], sb_start: list[int], sb_end: list[int], lines: list[dict]) -> list[int]:
    """Place full clips so SPEECH flows naturally; silent edges overlap harmlessly.

    `overlap` is measured between the speech of adjacent clips (not raw clip ends):
      overlap > 0 : next speech begins `overlap`s before the previous speech ends (talk-over),
                    clamped so the previous clip keeps MIN_SOLO of solo speech
      overlap < 0 : `|overlap|`s gap between previous speech end and next speech start
      overlap == 0: DEFAULT_GAP between speech
    Returns clip start-samples (full clip, including its lead silence).
    """
    min_solo = int(MIN_SOLO * SAMPLE_RATE)
    same_gap = int(0.12 * SAMPLE_RATE)   # min gap between one speaker's own consecutive clips
    starts: list[int] = []
    prev_speech_start = 0   # absolute samples
    prev_speech_end = 0
    speaker_end: dict[str, int] = {}     # last speech-end sample per speaker
    for i, line in enumerate(lines):
        # Background beds run UNDER the dialogue: anchored to the current cursor
        # (shifted by `overlap`, positive = starts earlier) but they do NOT advance
        # the speech cursor, so following dialogue plays over them in parallel.
        if line.get("background"):
            offset = int(float(line.get("overlap", 0.0)) * SAMPLE_RATE)
            start = max(0, prev_speech_end - sb_start[i] - offset)
            starts.append(start)
            continue
        if i == 0:
            start = 0
            onset = sb_start[i]
        else:
            overlap = float(line.get("overlap", 0.0))
            if overlap > 0:
                gap = -int(overlap * SAMPLE_RATE)
            elif overlap < 0:
                gap = int(abs(overlap) * SAMPLE_RATE)
            else:
                gap = int(DEFAULT_GAP * SAMPLE_RATE)
            onset = prev_speech_end + gap
            onset = max(onset, prev_speech_start + min_solo)  # keep prev solo speech
            # A speaker can't talk over themselves: never start before this speaker's own
            # previous clip has finished (cross-speaker overlap is still allowed). Heavy
            # overlaps + interleaved background SFX can otherwise collide two same-speaker
            # clips (e.g. Chen's "is the radio" and "is BIG radio").
            spk = line.get("speaker")
            se = speaker_end.get(spk)
            if se is not None and onset < se + same_gap:
                onset = se + same_gap
            start = max(0, onset - sb_start[i])
            onset = start + sb_start[i]
        starts.append(start)
        prev_speech_start = onset
        prev_speech_end = start + sb_end[i]
        speaker_end[line.get("speaker")] = start + sb_end[i]
    return starts


def generate_episode(slug: str, model_loader, remix: bool) -> None:
    script_path = SCRIPTS_DIR / f"{slug}.json"
    if not script_path.exists():
        print(f"  skip (no script): {slug}")
        return

    episode  = json.loads(script_path.read_text(encoding="utf-8"))
    if episode.get("engine", "").startswith("dia"):
        print(f"  skip (engine={episode['engine']}, use the Dia generator): {slug}")
        return
    lines    = episode["lines"]
    cast     = load_cast()
    clip_dir = AUDIO_DIR / slug
    clip_dir.mkdir(parents=True, exist_ok=True)

    manifest_path = clip_dir / ".clips.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {}

    print(f"  {slug}: {len(lines)} clips ({'remix' if remix else 'render'})")

    model = None  # lazy — only loaded if a clip actually needs (re)rendering
    lengths: list[int] = []
    sb_start: list[int] = []
    sb_end: list[int] = []
    rendered = 0

    def record(i: int, clip: np.ndarray, key: str | None):
        s, e = speech_bounds(clip)
        lengths.append(len(clip)); sb_start.append(s); sb_end.append(e)
        if key is not None:
            manifest[str(i)] = {"hash": key, "length": len(clip), "sb": [s, e]}

    for i, line in enumerate(lines):
        speaker_id = line["speaker"]
        out_file   = clip_dir / f"{i}.flac"
        text       = line["text"].strip()

        # Real sound-effect line (e.g. a genuine cat meow) — no TTS, no cast voice.
        if line.get("sfx"):
            key    = sfx_hash(line["sfx"], line)
            cached = manifest.get(str(i))
            if cached and cached.get("hash") == key and out_file.exists() and "sb" in cached:
                lengths.append(int(cached["length"])); sb_start.append(cached["sb"][0]); sb_end.append(cached["sb"][1])
                continue
            if remix:
                raise SystemExit(f"--remix but sfx clip {i} ({line['sfx']}) is missing/stale; run without --remix first")
            clip = render_sfx(line["sfx"], line)
            sf.write(str(out_file), clip, SAMPLE_RATE, format="flac")
            record(i, clip, key)
            rendered += 1
            print(f"    [{i+1}/{len(lines)}] sfx {line['sfx']}: {len(clip)/SAMPLE_RATE:.1f}s (rendered)")
            continue

        c          = cast.get(speaker_id)

        if c is None:
            print(f"  WARNING: unknown speaker '{speaker_id}' at line {i}")
            silence = np.zeros(int(SAMPLE_RATE * 0.5), dtype=np.float32)
            sf.write(str(out_file), silence, SAMPLE_RATE, format="flac")
            record(i, silence, None)
            continue

        key    = clip_hash(text, c)
        cached = manifest.get(str(i))
        if cached and cached.get("hash") == key and out_file.exists():
            if "sb" in cached:
                lengths.append(int(cached["length"])); sb_start.append(cached["sb"][0]); sb_end.append(cached["sb"][1])
            else:  # older manifest without bounds — measure from file once
                clip, _ = sf.read(str(out_file), dtype="float32")
                record(i, clip.astype(np.float32), key)
            continue

        if remix:
            raise SystemExit(f"--remix but clip {i} ({speaker_id}) is missing/stale; run without --remix first")

        if model is None:
            model = model_loader()
        clip = render_clip(text, c, model) if text and text != "..." else np.zeros(int(SAMPLE_RATE * 0.8), dtype=np.float32)
        sf.write(str(out_file), clip, SAMPLE_RATE, format="flac")
        record(i, clip, key)
        rendered += 1
        print(f"    [{i+1}/{len(lines)}] {speaker_id}: {len(clip)/SAMPLE_RATE:.1f}s (rendered)")

    manifest_path.write_text(json.dumps(manifest), encoding="utf-8")

    # Placement pass — cheap, always runs. Aligns by speech, full clips overlap on silence.
    starts = place(lengths, sb_start, sb_end, lines)
    for i, line in enumerate(lines):
        line["timestamp"] = round(starts[i] / SAMPLE_RATE, 3)
        line["duration"]  = round(lengths[i] / SAMPLE_RATE, 3)
        line["audio"]     = f"/audio/radio/{slug}/{i}.flac"

    script_path.write_text(json.dumps(episode, indent=2, ensure_ascii=False), encoding="utf-8")
    total = (max(s + l for s, l in zip(starts, lengths)) / SAMPLE_RATE) if lengths else 0
    print(f"  placed {len(lines)} clips, {rendered} (re)rendered, timeline {total:.1f}s")


def detect_device() -> str:
    if torch.cuda.is_available():
        return "cuda"
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return "mps"
    return "cpu"


def load_model():
    from omnivoice import OmniVoice
    device = detect_device()
    dtype = torch.float16 if device != "cpu" else torch.float32
    print(f"  device: {device}")
    return OmniVoice.from_pretrained("k2-fsa/OmniVoice", device_map=device, dtype=dtype)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("slug", nargs="?", help="Episode slug (filename without .json)")
    parser.add_argument("--all", action="store_true", help="Process all episodes")
    parser.add_argument("--remix", action="store_true", help="Placement only; never load the model (all clips must be cached)")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    torch.manual_seed(args.seed)

    if not args.slug and not args.all:
        print("Specify a slug or --all")
        sys.exit(1)

    slugs = (
        [args.slug] if args.slug
        else [p.stem for p in sorted(SCRIPTS_DIR.glob("*.json"))]
    )
    for slug in slugs:
        generate_episode(slug, load_model, args.remix)


if __name__ == "__main__":
    main()
