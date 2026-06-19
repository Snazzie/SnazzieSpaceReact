# Snazzie FM — host portrait prompt-sheet

Drop finished images here as **square PNGs**, named by cast id. They auto-appear on
`/radio` (the landing page looks for `/images/radio/<id>.png`, falls back to a CSS
monogram if the file is missing).

Required files:

| File | Character | Role |
|------|-----------|------|
| `ronnie.png` | Ronnie Delacroix | Host |
| `barry.png` | Barry Fitch | Co-Host |
| `rhonda.png` | Rhonda K. | Guest Expert |
| `todd.png` | Todd | Intern |
| `caller-frank.png` | Frank | Caller |

**Specs:** 1:1 square, ≥512×512 (1024 ideal), head-and-shoulders, face roughly centered
(cards crop to a square with `object-fit:cover`). PNG. The page already tints + adds
scanlines, so neutral/warm lighting works best.

## Shared style prompt (prepend to each)

> Vintage 1970s AM/FM radio station publicity headshot, warm amber and sepia tones,
> grainy film photo, soft studio lighting, head and shoulders, looking at camera,
> slightly faded analog color, retro broadcast aesthetic, plain dark warm backdrop.

## Per-character prompts

**ronnie.png — Ronnie Delacroix, Host**
> Smooth, charismatic middle-aged American male radio host, late 40s, slicked-back hair,
> warm confident smile, wearing a tan corduroy blazer, big vintage broadcast microphone
> in front of him, the look of a man who believes everything he says.

**barry.png — Barry Fitch, Co-Host**
> Nervous middle-aged American male co-host, early 50s, thinning hair, glasses, slightly
> sweaty forehead, anxious skeptical expression, rumpled shirt and loosened tie, leaning
> back from the mic like he heard something he didn't like.

**rhonda.png — Rhonda K., Guest Expert**
> Poised middle-aged British woman, "guest expert", 50s, sharp tailored blazer, reading
> glasses on a chain, knowing slightly smug expression, the air of unverifiable credentials.

**todd.png — Todd, Intern**
> Young adult East Asian male intern, early 20s, headphones around neck, fast-talking
> energetic expression mid-sentence, hoodie under a station polo, clutching a clipboard,
> slightly out of focus like he's moving too fast for the camera.

**caller-frank.png — Frank, Caller**
> Intense elderly American man, 70s, deep-set paranoid eyes, weathered face, flannel shirt,
> photographed like a grainy old ID badge or surveillance still, dim single-bulb lighting,
> the look of a man with evidence.

---
Tip: generate at 1024×1024, export PNG, keep filenames exactly as the table above.
