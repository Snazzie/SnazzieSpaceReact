#!/usr/bin/env python3
"""Generate `ref_text` for voice reference clips by ASR (faster-whisper).

PREFER the download source's transcript when available — LibriSpeech voices already get an
exact `ref_text` from the dataset via pick-announcer-voices.py / download-ad-voices.py, which
beats ASR (no recognition errors). Use THIS only for a hand-sourced `scripts/voices/<key>.wav`
that has no transcript, or to backfill a voice whose `ref_text` is missing.

Writes the transcript to cast.json `ref_text` and `scripts/voices/<key>.txt`.

Run:
  python scripts/gen-reftext.py                 # fill only voices MISSING ref_text
  python scripts/gen-reftext.py ad-ann-deep     # one voice (by cast key)
  python scripts/gen-reftext.py --force         # re-transcribe ALL (overwrites)
"""
import io, json, sys
from pathlib import Path

CAST_FILE  = Path(__file__).parent / "cast.json"
VOICES_DIR = Path(__file__).parent / "voices"


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    force = "--force" in sys.argv
    cast = json.loads(CAST_FILE.read_text(encoding="utf-8"))

    keys = args or list(cast.keys())
    todo = []
    for k in keys:
        c = cast.get(k)
        if not c or "ref_audio" not in c:
            continue
        wav = Path(__file__).parent.parent / c["ref_audio"]
        if not wav.exists():
            print(f"  skip {k}: {wav} missing")
            continue
        if c.get("ref_text") and not force and not args:
            continue  # already has one; bulk mode only fills gaps
        todo.append((k, c, wav))

    if not todo:
        print("Nothing to do (all voices have ref_text; use --force or name a key).")
        return

    from faster_whisper import WhisperModel
    import torch
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = WhisperModel("base.en", device=device, compute_type="float16" if device == "cuda" else "int8")

    for k, c, wav in todo:
        segs, _ = model.transcribe(str(wav))
        text = " ".join(s.text.strip() for s in segs).strip()
        if not text:
            print(f"  {k}: ASR produced nothing, skipped")
            continue
        c["ref_text"] = text
        (VOICES_DIR / f"{k}.txt").write_text(text, encoding="utf-8")
        print(f"  {k}: {text[:70]}{'...' if len(text) > 70 else ''}")

    CAST_FILE.write_text(json.dumps(cast, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\ncast.json updated for {len(todo)} voice(s).")


if __name__ == "__main__":
    main()
