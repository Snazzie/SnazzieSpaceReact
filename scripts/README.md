# Audio Generation

Generates FLAC narration + waveform JSON for each article using [OmniVoice](https://github.com/k2-fsa/OmniVoice).

## Requirements

- Python 3.10+
- `uv` (recommended) or `pip`

## Setup

### 1. Create a virtual environment

```bash
uv venv audio-env
source audio-env/bin/activate   # macOS/Linux
audio-env\Scripts\activate       # Windows
```

### 2. Install dependencies

```bash
uv pip install omnivoice soundfile numpy torch
```

> On macOS Apple Silicon, PyTorch uses MPS automatically.
> On Windows/Linux with an NVIDIA GPU, CUDA is used automatically.
> CPU fallback works but is slow (not recommended for full articles).

### 3. First run downloads the model

On the first run, OmniVoice (~2GB) downloads from Hugging Face to `~/.cache/huggingface/`.
Subsequent runs use the cache.

## Usage

Run from the repo root:

```bash
# Generate audio for any articles missing it
python scripts/generate-audio.py

# Generate audio for a specific article (slug = filename without .mdx)
python scripts/generate-audio.py dynamic-vs-ssr

# Regenerate all articles
python scripts/generate-audio.py --all

# Regenerate waveform JSONs only (no TTS, very fast)
python scripts/generate-audio.py --waveforms
```

Or via bun from the `Website/` directory:

```bash
cd Website
bun audio             # missing articles only
bun audio:all         # regenerate everything
bun audio:waveforms   # waveforms only
```

> Note: the `bun audio` commands require the virtual environment to already be active.

## Output

| File | Description |
|------|-------------|
| `Website/public/audio/<slug>.flac` | Lossless audio narration (gitignored, ~7MB each) |
| `Website/public/audio/<slug>-waveform.json` | 200 normalised peak values for the waveform scrubber |

FLAC files are gitignored — regenerate them locally after cloning.
Waveform JSONs are committed so the player renders correctly without re-running TTS.

## Voice

The reference voice is `scripts/voices/nature.wav` — a sample from the
[OmniVoice demo](https://zhu-han.github.io/omnivoice/) (Seed-TTS English prompt).
OmniVoice clones the speaking style of this clip for all generated audio.

To use a different voice, replace `nature.wav` with any clear ~5–15 second speech clip
and update `REF_TEXT` in `generate-audio.py` to match its transcript exactly.
