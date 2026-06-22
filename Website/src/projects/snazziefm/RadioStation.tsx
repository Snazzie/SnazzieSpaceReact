import { useEffect, useRef, useState } from "react";
import type * as Tone from "tone";
import type { CastMember, Episode, TranscriptLine } from "./data/radio";

// tone is a large audio bundle; load it lazily on first use so it never blocks
// this island's hydration. Types stay static via `import type * as Tone`.
let tonePromise: Promise<typeof import("tone")> | null = null;
function loadTone(): Promise<typeof import("tone")> {
  return (tonePromise ??= import("tone"));
}


interface Props {
  episodes: Episode[];
  cast: Record<string, CastMember>;
  ads?: Episode[];
}

function fmt(s: number): string {
  if (!isFinite(s)) return "0:00";
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${sec < 10 ? "0" : ""}${sec}`;
}

// Strip authoring-only pause tokens (<p>, <p:0.8>) for display
const stripTokens = (t: string) => t.replace(/<p(?::[0-9.]+)?>/g, "").replace(/\s{2,}/g, " ").trim();

// Persisted master volume, shared with the /radio landing player (useRadioAudio).
const VOLUME_KEY = "snazziefm:volume";
function loadVolume(): number {
  if (typeof window === "undefined") return 1;
  const v = parseFloat(window.localStorage.getItem(VOLUME_KEY) ?? "");
  return isFinite(v) ? Math.min(1, Math.max(0, v)) : 1;
}

// Auto loudness-match: clips render at OmniVoice's raw level and vary clip-to-clip, so
// measure each buffer's integrated RMS and set the player's volume toward one target.
const TARGET_RMS_DB = -20;   // dBFS RMS to normalize toward
const MIN_VOL_DB = -26, MAX_VOL_DB = 12;

/** Player volume in dB that brings a buffer's RMS to TARGET_RMS_DB (clamped). */
function normalizeDb(buf: Tone.ToneAudioBuffer): number {
  const ab = buf.get() as AudioBuffer | undefined;
  if (!ab) return 0;
  let sum = 0, n = 0;
  for (let ch = 0; ch < ab.numberOfChannels; ch++) {
    const d = ab.getChannelData(ch);
    for (let i = 0; i < d.length; i += 4) { sum += d[i] * d[i]; n++; }  // stride 4: cheap
  }
  const rms = n ? Math.sqrt(sum / n) : 0;
  if (rms <= 0) return 0;
  const db = TARGET_RMS_DB - 20 * Math.log10(rms);
  return Math.min(MAX_VOL_DB, Math.max(MIN_VOL_DB, db));
}

function getActiveLine(lines: TranscriptLine[], currentTime: number): number {
  // Latest line that has started (and not fully ended where possible). Scans all
  // lines so heavy overlaps / slight non-monotonic starts stay correct.
  let active = -1;
  let bestStart = -Infinity;
  for (let i = 0; i < lines.length; i++) {
    const start = lines[i].timestamp ?? 0;
    if (start <= currentTime && start >= bestStart) {
      active = i;
      bestStart = start;
    }
  }
  return active;
}

/** Every line currently sounding (clip window contains t) — multiple at once with overlaps. */
function playingLines(lines: TranscriptLine[], t: number): Set<number> {
  const s = new Set<number>();
  for (let i = 0; i < lines.length; i++) {
    const start = lines[i].timestamp ?? 0;
    if (t >= start && t < start + (lines[i].duration ?? 0)) s.add(i);
  }
  return s;
}

/** Multitrack view: one lane per speaker, blocks positioned by timestamp/duration. */
function TrackLanes({
  lines, cast, span, currentTime, playing, onSeek,
}: {
  lines: TranscriptLine[];
  cast: Record<string, CastMember>;
  span: number;
  currentTime: number;
  playing: Set<number>;
  onSeek: (t: number) => void;
}) {
  const areaRef = useRef<HTMLDivElement>(null);
  const speakers = [...new Set(lines.map((l) => l.speaker))];
  const pct = (v: number) => `${(v / (span || 1)) * 100}%`;
  const segsBySpeaker = (sp: string) =>
    lines.map((l, i) => ({ l, i })).filter(({ l }) => l.speaker === sp);

  return (
    <div className="border-b border-white/5 bg-[#0b0b0b] px-2 py-1.5">
      <div className="flex gap-2">
        {/* Label gutter */}
        <div className="flex w-16 flex-shrink-0 flex-col gap-[3px]">
          {speakers.map((sp) => (
            <div
              key={sp}
              className="h-3 truncate text-right text-[8px] font-bold leading-3 tracking-[0.5px]"
              style={{ color: cast[sp]?.color ?? "#888" }}
              title={cast[sp]?.name ?? sp}
            >
              {cast[sp]?.name ?? sp}
            </div>
          ))}
        </div>

        {/* Track area + playhead */}
        <div
          ref={areaRef}
          className="relative flex-1 cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            onSeek(((e.clientX - rect.left) / rect.width) * span);
          }}
        >
          <div className="flex flex-col gap-[3px]">
            {speakers.map((sp) => {
              const color = cast[sp]?.color ?? "#888";
              return (
                <div key={sp} className="relative h-3 rounded-sm bg-white/[0.03]">
                  {segsBySpeaker(sp).map(({ l, i }) => (
                    <div
                      key={i}
                      className="absolute top-0 h-full rounded-sm"
                      style={{
                        left: pct(l.timestamp ?? 0),
                        width: pct(Math.max(l.duration ?? 0, span * 0.004)),
                        background: color,
                        opacity: playing.has(i) ? 1 : 0.45,
                        outline: playing.has(i) ? `1px solid ${color}` : "none",
                      }}
                      title={`${i}: ${l.text.slice(0, 40)} (${(l.timestamp ?? 0).toFixed(1)}s +${(l.duration ?? 0).toFixed(1)}s)`}
                    />
                  ))}
                </div>
              );
            })}
          </div>
          {/* Playhead spans all lanes */}
          <div
            className="pointer-events-none absolute inset-y-0 w-px bg-[#ff6b00]"
            style={{ left: pct(currentTime) }}
          />
        </div>
      </div>
    </div>
  );
}

export default function RadioStation({ episodes, cast, ads = [] }: Props) {
  const [selectedIdx, setSelectedIdx]   = useState(0);
  const [isPlaying, setIsPlaying]       = useState(false);
  const [currentTime, setCurrentTime]   = useState(0);
  const [activeLine, setActiveLine]     = useState(-1);
  const [ready, setReady]               = useState(false);
  const [volume, setVolumeState]        = useState(loadVolume);
  const [tab, setTab]                   = useState<"episodes" | "pro" | "instaad">("episodes");
  const autoPlayRef = useRef(false);

  const toneRef    = useRef<typeof import("tone") | null>(null); // lazily-loaded audio module
  const lineRefs   = useRef<(HTMLDivElement | null)[]>([]);
  const rafRef     = useRef<number>(0);
  const gainRef    = useRef<Tone.Gain | null>(null);       // master volume (slider), last before destination
  const compRef    = useRef<Tone.Compressor | null>(null); // evens loudness across clips/episodes
  const makeupRef  = useRef<Tone.Gain | null>(null);       // recover level lost to compression
  const limiterRef = useRef<Tone.Limiter | null>(null);    // brick-wall the loud spikes
  const playersRef = useRef<(Tone.Player | null)[]>([]);   // one synced clip per line
  const trackPlayerRef = useRef<Tone.Player | null>(null); // whole-episode base track (Dia)
  const playingRef = useRef(false);

  const items = [...episodes, ...ads];
  const episode = items[selectedIdx];
  const [lines, setLines] = useState<TranscriptLine[]>(episode.lines);

  // Keep lines in sync with the selected episode
  useEffect(() => { setLines(episode.lines); }, [episode.slug]);

  // Keep the sidebar tab on whichever list holds the current selection.
  useEffect(() => {
    if (selectedIdx < episodes.length) setTab("episodes");
    else setTab(items[selectedIdx]?.blunder ? "instaad" : "pro");
  }, [selectedIdx, episodes.length]);

  // Deep link: /radio/behindthescenes#<slug> selects that episode on load (from the
  // /radio landing page show cards). Falls back to the first episode.
  useEffect(() => {
    const slug = window.location.hash.replace(/^#/, "");
    if (!slug) return;
    const idx = items.findIndex((e) => e.slug === slug);
    if (idx >= 0) setSelectedIdx(idx);
  }, []);

  // Timeline span = last clip end (pure data, independent of decode state)
  const span = Math.max(
    0.001,
    ...lines.map((l) => (l.timestamp ?? 0) + (l.duration ?? 0)),
  );

  // All scheduling runs on Tone's Transport: a single timeline clock with a
  // built-in look-ahead scheduler. Each clip is a Player .sync()'d to the
  // Transport and .start()'d at its timestamp — Tone handles look-ahead, seek
  // (incl. mid-clip offset), and the suspended-context race for us. This is what
  // makes playback reliable vs. hand-rolled AudioBufferSourceNode scheduling.

  // Master dynamics chain — players feed the compressor; volume gain sits last so the
  // slider attenuates the already-evened signal. Built once, reused across episodes.
  //   players -> Compressor -> makeupGain -> Limiter -> volumeGain -> destination
  // Returns the chain INPUT (compressor) for players to connect to.
  function ensureChain(Tone: typeof import("tone")): Tone.Compressor {
    if (!compRef.current) {
      const gain = new Tone.Gain(volume).toDestination();
      const limiter = new Tone.Limiter(-1).connect(gain);            // brick-wall at -1 dBFS
      const makeup = new Tone.Gain(1.0).connect(limiter);            // unity: RMS-normalized clips need no boost (1.6 clipped)
      const comp = new Tone.Compressor({
        threshold: -24, knee: 30, ratio: 12, attack: 0.003, release: 0.25,
      }).connect(makeup);
      gainRef.current = gain;
      limiterRef.current = limiter;
      makeupRef.current = makeup;
      compRef.current = comp;
    }
    return compRef.current;
  }

  function setVolume(v: number) {
    setVolumeState(v);
    if (gainRef.current) gainRef.current.gain.value = v;
    try { window.localStorage.setItem(VOLUME_KEY, String(v)); } catch { /* storage blocked */ }
  }

  function disposePlayers() {
    try { trackPlayerRef.current?.unsync().dispose(); } catch { /* already gone */ }
    trackPlayerRef.current = null;
    for (const p of playersRef.current) {
      try { p?.unsync().dispose(); } catch { /* already gone */ }
    }
    playersRef.current = [];
  }

  // Load audio when the episode changes, building one synced Player per clip.
  // Dia episodes: one whole-episode `track`. Others: one clip per line.
  useEffect(() => {
    let cancelled = false;
    setReady(false);
    (async () => {
      const Tone = await loadTone();
      if (cancelled) return;
      toneRef.current = Tone;
      const transport = Tone.getTransport();
      transport.stop();
      transport.seconds = 0;
      disposePlayers();
      const input = ensureChain(Tone);
      const load = (url: string) =>
        Tone.ToneAudioBuffer.fromUrl(url).catch(() => null as Tone.ToneAudioBuffer | null);

      const [trackBuf, ...clipBufs] = await Promise.all([
        episode.track ? load(episode.track) : Promise.resolve(null),
        ...episode.lines.map((l) => (l.audio ? load(l.audio) : Promise.resolve(null))),
      ]);
      if (cancelled) { trackBuf?.dispose(); clipBufs.forEach((b) => b?.dispose()); return; }

      if (trackBuf) {
        const p = new Tone.Player(trackBuf).connect(input);
        p.volume.value = normalizeDb(trackBuf);   // loudness-match to target
        trackPlayerRef.current = p.sync().start(0);
      }
      playersRef.current = episode.lines.map((line, i) => {
        const buf = clipBufs[i];
        if (!buf) return null;
        const p = new Tone.Player(buf).connect(input);
        p.volume.value = normalizeDb(buf);         // loudness-match to target
        return p.sync().start(line.timestamp ?? 0);
      });

      setReady(true);
      if (autoPlayRef.current) { autoPlayRef.current = false; play(); }
    })();

    return () => { cancelled = true; };
  }, [episode.slug]);

  async function play() {
    const Tone = toneRef.current;
    if (!Tone) return;
    await Tone.start();                 // resume the AudioContext (needs a gesture)
    const transport = Tone.getTransport();
    if (transport.seconds >= span) transport.seconds = 0;
    transport.start();
    playingRef.current = true;
    setIsPlaying(true);
  }

  function pause() {
    const Tone = toneRef.current;
    if (!Tone) return;
    Tone.getTransport().pause();
    playingRef.current = false;
    setIsPlaying(false);
  }

  function togglePlay() {
    if (!ready) return;
    if (playingRef.current) pause();
    else play();
  }

  function seek(t: number) {
    const Tone = toneRef.current;
    if (!Tone) return;
    const clamped = Math.max(0, Math.min(t, span));
    Tone.getTransport().seconds = clamped;   // synced players reschedule (incl. mid-clip)
    setCurrentTime(clamped);
    setActiveLine(getActiveLine(lines, clamped));
  }

  function seekToLine(line: TranscriptLine) {
    seek(line.timestamp ?? 0);
  }

  function selectEpisode(idx: number, andPlay = false) {
    autoPlayRef.current = andPlay;
    if (idx === selectedIdx) { if (andPlay) togglePlay(); return; }
    const Tone = toneRef.current;
    if (Tone) {
      const transport = Tone.getTransport();
      transport.stop();
      transport.seconds = 0;
    }
    playingRef.current = false;
    setIsPlaying(false);
    setCurrentTime(0);
    setActiveLine(-1);
    setSelectedIdx(idx);
    window.location.hash = items[idx].slug;
  }

  // Spacebar toggles play/pause
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code !== "Space" && e.key !== " ") return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      e.preventDefault();
      togglePlay();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // RAF loop: drive UI clock + active line from the Transport timeline
  useEffect(() => {
    function tick() {
      const Tone = toneRef.current;
      if (!Tone) return;
      const t = Tone.getTransport().seconds;
      if (t >= span) { pause(); Tone.getTransport().seconds = 0; setCurrentTime(0); setActiveLine(-1); return; }
      setCurrentTime(t);
      const nextActive = getActiveLine(lines, t);
      setActiveLine((prev) => {
        if (prev !== nextActive) {
          lineRefs.current[nextActive]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
        return nextActive;
      });
      rafRef.current = requestAnimationFrame(tick);
    }
    if (isPlaying) rafRef.current = requestAnimationFrame(tick);
    else cancelAnimationFrame(rafRef.current);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, lines, span]);

  // Warm the AudioContext on the first user gesture so it's already RUNNING
  // before the first play (autoplay policy starts it suspended).
  useEffect(() => {
    const warm = () => { loadTone().then((T) => T.start()); };
    window.addEventListener("pointerdown", warm, { once: true });
    window.addEventListener("keydown", warm, { once: true });
    return () => {
      window.removeEventListener("pointerdown", warm);
      window.removeEventListener("keydown", warm);
    };
  }, []);

  // Tear down players, master chain + transport on unmount
  useEffect(() => () => {
    toneRef.current?.getTransport().stop();
    disposePlayers();
    for (const node of [compRef, makeupRef, limiterRef, gainRef]) {
      try { node.current?.dispose(); } catch { /* already gone */ }
      node.current = null;
    }
  }, []);

  const episodeCast = [...new Set(lines.map((l) => l.speaker))]
    .map((id) => cast[id])
    .filter((m): m is CastMember => m !== undefined);

  // Every line sounding right now (overlaps + background beds → several at once).
  const playing = isPlaying ? playingLines(lines, currentTime) : new Set<number>();
  const activeSpeakers = new Set<string>();
  playing.forEach((i) => activeSpeakers.add(lines[i].speaker));

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0a] font-sans text-sm">
      {/* Sidebar */}
      <div className="flex w-64 flex-shrink-0 flex-col border-r border-white/5 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-semibold tracking-[3px] text-[#ff6b00]">📻 SNAZZIE FM</div>
            <a href="/snazziefm" className="text-[9px] text-white/30 hover:text-white/60 transition-colors tracking-[1px]">&larr; Back</a>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-white/20 tracking-[1px]">VOL</span>
            <input
              type="range" min={0} max={1} step={0.01} value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              aria-label="Volume"
              className="flex-1 h-[3px] accent-[#ff6b00] cursor-pointer"
            />
          </div>
        </div>

        {/* Tabs: shows / pro (professional) ads / InstaAd (DIY self-recorded) ads */}
        <div className="flex border-b border-white/5">
          {(["episodes", "pro", "instaad"] as const).map((t) => {
            const count = t === "episodes" ? episodes.length
              : t === "pro" ? ads.filter((a) => !a.blunder).length
              : ads.filter((a) => a.blunder).length;
            const label = t === "episodes" ? "Shows" : t === "pro" ? "Pro Ads" : "InstaAd";
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 px-1 py-2.5 text-[9px] font-semibold uppercase tracking-[1.5px] transition-colors border-b-2 ${
                  tab === t
                    ? "text-[#ff6b00] border-[#ff6b00] bg-white/[0.03]"
                    : "text-white/25 border-transparent hover:text-white/50"
                }`}
              >
                {label} {count}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto">
          {(tab === "episodes" ? episodes
            : tab === "pro" ? ads.filter((a) => !a.blunder)
            : ads.filter((a) => a.blunder)
          ).map((item) => {
            const idx = items.indexOf(item);
            const active = idx === selectedIdx;
            const playingThis = active && isPlaying;
            return (
              <div
                key={item.slug}
                className={`flex items-center border-l-2 transition-colors ${
                  active
                    ? "border-[#ff6b00] bg-white/[0.04]"
                    : "border-transparent hover:bg-white/[0.02] hover:border-white/10"
                }`}
              >
                <button
                  onClick={() => selectEpisode(idx, false)}
                  className="flex-1 text-left px-4 py-3 min-w-0"
                >
                  <div className={`text-[11px] font-semibold leading-tight truncate ${active ? "text-white" : "text-white/40"}`}>
                    {item.title}
                  </div>
                  <div className="mt-1 text-[9px] text-white/20 truncate">
                    {[...new Set(item.lines.map((l) => l.speaker))]
                      .map((id) => cast[id]?.name ?? id)
                      .join(", ")}
                  </div>
                </button>
                <button
                  onClick={() => selectEpisode(idx, !playingThis)}
                  className="pr-3 pl-1 py-3 flex-shrink-0 text-[#ff6b00]/60 hover:text-[#ff6b00] transition-colors text-[10px]"
                  title={playingThis ? "Pause" : "Play"}
                >
                  {playingThis ? "❚❚" : "▶"}
                </button>
              </div>
            );
          })}
        </div>

      </div>

      {/* Right: player + transcript */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Now playing bar */}
        <div className="flex items-center gap-3 border-b border-white/5 bg-[#111] px-4 py-3">
          <button
            onClick={togglePlay}
            className="text-lg text-white/70 hover:text-white transition-colors"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? "⏸" : "⏵"}
          </button>
          <div className="min-w-0 flex-shrink-0">
            <div className="text-[9px] font-semibold tracking-[2px] text-[#ff6b00]">
              {isPlaying ? "NOW ON AIR" : "SNAZZIE FM"}
            </div>
            <div className="truncate text-[12px] font-semibold text-white">{episode.title}</div>
          </div>

          <div className="text-[10px] text-white/30 tabular-nums flex-shrink-0">
            {fmt(currentTime)} / {fmt(span)}
          </div>

          {/* Discord-style cast — active speaker lights up */}
          <div className="flex flex-1 flex-wrap items-center gap-2 px-2">
            {episodeCast.map((m) => {
              const talking = activeSpeakers.has(m.id);
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-1.5 transition-all duration-150"
                  style={{ opacity: talking ? 1 : 0.4 }}
                  title={`${m.name} — ${m.role}`}
                >
                  <div
                    className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-black transition-all duration-150"
                    style={{
                      background: m.color,
                      transform: talking ? "scale(1.12)" : "scale(1)",
                      boxShadow: talking ? `0 0 0 2px #111, 0 0 0 4px ${m.color}, 0 0 12px ${m.color}` : "none",
                    }}
                  >
                    {m.name[0]}
                  </div>
                  <div className="hidden flex-col leading-tight sm:flex">
                    <span
                      className="text-[10px] font-medium"
                      style={{ color: talking ? "#fff" : "rgba(255,255,255,0.4)" }}
                    >
                      {m.name}
                    </span>
                    <span className="text-[8px] uppercase tracking-[0.5px] text-white/30">
                      {m.role}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Multitrack debug view */}
        <TrackLanes
            lines={lines}
            cast={cast}
            span={span}
            currentTime={currentTime}
            playing={playing}
            onSeek={seek}
          />

        {/* Transcript — aligned table: time | speaker | text.
            Rendered in PLAY order (by timestamp), not array order: with heavy overlaps /
            background SFX the script order doesn't match playback, so sort by start time.
            Original indices are preserved for refs + active-line highlighting. */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {lines
            .map((line, i) => ({ line, i }))
            .sort((a, b) => (a.line.timestamp ?? 0) - (b.line.timestamp ?? 0))
            .map(({ line, i }) => {
            const member = cast[line.speaker];
            const isActive = playing.has(i);
            return (
              <div
                key={i}
                ref={(el) => { lineRefs.current[i] = el; }}
                onClick={() => seekToLine(line)}
                className={`grid grid-cols-[3rem_5.5rem_1fr] items-baseline gap-3 cursor-pointer rounded px-2 py-1 -mx-2 border-l-2 transition-colors ${
                  isActive
                    ? "bg-[#ff6b00]/10 border-[#ff6b00]"
                    : "border-transparent hover:bg-white/[0.03]"
                }`}
              >
                <span className="text-[9px] text-white/25 tabular-nums">
                  {line.timestamp ? fmt(line.timestamp) : ""}
                </span>
                <span
                  className="truncate text-[9px] font-bold tracking-[0.5px]"
                  style={{ color: member?.color ?? "#888" }}
                  title={member?.name ?? line.speaker}
                >
                  {member?.name ?? line.speaker}
                </span>
                <span className={`text-[10px] leading-snug ${isActive ? "text-white" : "text-white/50"}`}>
                  {stripTokens(line.text)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
