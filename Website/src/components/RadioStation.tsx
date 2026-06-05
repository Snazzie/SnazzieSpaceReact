import { useEffect, useRef, useState } from "react";
import type { CastMember, Episode, TranscriptLine } from "@/data/radio";

const IS_DEV = import.meta.env.DEV;

interface Props {
  episodes: Episode[];
  cast: Record<string, CastMember>;
}

function fmt(s: number): string {
  if (!isFinite(s)) return "0:00";
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${sec < 10 ? "0" : ""}${sec}`;
}

// Strip authoring-only pause tokens (<p>, <p:0.8>) for display
const stripTokens = (t: string) => t.replace(/<p(?::[0-9.]+)?>/g, "").replace(/\s{2,}/g, " ").trim();

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

/** Multitrack debug view: one lane per speaker, blocks positioned by timestamp/duration.
 *  In dev, blocks are draggable (onMove) to retime clips on the shared timeline. */
function TrackLanes({
  lines, cast, span, currentTime, activeLine, onSeek, onMove,
}: {
  lines: TranscriptLine[];
  cast: Record<string, CastMember>;
  span: number;
  currentTime: number;
  activeLine: number;
  onSeek: (t: number) => void;
  onMove?: (i: number, newStart: number, commit: boolean) => void;
}) {
  const DRAG_THRESHOLD = 4; // px the pointer must travel before it counts as a drag (not a click)
  const areaRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ i: number; grabDx: number; startX: number; clipStart: number; moved: boolean } | null>(null);
  const speakers = [...new Set(lines.map((l) => l.speaker))];
  const pct = (v: number) => `${(v / (span || 1)) * 100}%`;
  const segsBySpeaker = (sp: string) =>
    lines.map((l, i) => ({ l, i })).filter(({ l }) => l.speaker === sp);

  function startFromClientX(clientX: number): number {
    const rect = areaRef.current!.getBoundingClientRect();
    return ((clientX - rect.left) / rect.width) * span;
  }

  function onBlockDown(e: React.PointerEvent, i: number, clipStart: number) {
    if (!onMove) return;
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { i, grabDx: startFromClientX(e.clientX) - clipStart, startX: e.clientX, clipStart, moved: false };
  }
  function onBlockMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    if (!d.moved && Math.abs(e.clientX - d.startX) < DRAG_THRESHOLD) return;  // ignore micro-movement
    d.moved = true;
    onMove?.(d.i, Math.max(0, startFromClientX(e.clientX) - d.grabDx), false);
  }
  function onBlockUp(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    dragRef.current = null;
    if (d.moved) onMove?.(d.i, Math.max(0, startFromClientX(e.clientX) - d.grabDx), true);
    else onSeek(d.clipStart);  // treat as a click → seek to this clip
  }

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
                      onPointerDown={(e) => onBlockDown(e, i, l.timestamp ?? 0)}
                      onPointerMove={onBlockMove}
                      onPointerUp={onBlockUp}
                      className={`absolute top-0 h-full rounded-sm ${onMove ? "cursor-grab active:cursor-grabbing" : ""}`}
                      style={{
                        left: pct(l.timestamp ?? 0),
                        width: pct(Math.max(l.duration ?? 0, span * 0.004)),
                        background: color,
                        opacity: i === activeLine ? 1 : 0.45,
                        outline: i === activeLine ? `1px solid ${color}` : "none",
                      }}
                      title={`${i}: ${l.text.slice(0, 40)} (${(l.timestamp ?? 0).toFixed(1)}s +${(l.duration ?? 0).toFixed(1)}s, ov ${l.overlap ?? 0})`}
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

export default function RadioStation({ episodes, cast }: Props) {
  const [selectedIdx, setSelectedIdx]   = useState(0);
  const [isPlaying, setIsPlaying]       = useState(false);
  const [currentTime, setCurrentTime]   = useState(0);
  const [activeLine, setActiveLine]     = useState(-1);
  const [showTracks, setShowTracks]     = useState(true);
  const [ready, setReady]               = useState(false);
  const [dirty, setDirty]               = useState(false);
  const [saving, setSaving]             = useState(false);

  const lineRefs   = useRef<(HTMLDivElement | null)[]>([]);
  const rafRef     = useRef<number>(0);
  const ctxRef     = useRef<AudioContext | null>(null);
  const buffersRef = useRef<(AudioBuffer | null)[]>([]);
  const trackBufRef = useRef<AudioBuffer | null>(null);  // single whole-episode buffer (Dia)
  const sourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const startCtxRef = useRef(0);  // ctx.currentTime when playback (re)started
  const offsetRef   = useRef(0);  // timeline position at that start
  const playingRef  = useRef(false);

  const episode = episodes[selectedIdx];
  const [lines, setLines] = useState<TranscriptLine[]>(episode.lines);

  // Keep editable lines in sync with the selected episode
  useEffect(() => { setLines(episode.lines); setDirty(false); }, [episode.slug]);

  // Timeline span = last clip end (pure data, independent of decode state)
  const span = Math.max(
    0.001,
    ...lines.map((l) => (l.timestamp ?? 0) + (l.duration ?? 0)),
  );

  // Dev-only: drag a clip to a new start time; recompute overlap vs previous clip.
  // Edits live in state only — the dev presses SAVE to persist them to the JSON file.
  function moveClip(i: number, newStart: number, commit: boolean) {
    const start = Math.max(0, Math.round(newStart * 1000) / 1000);
    const next = lines.map((l) => ({ ...l }));
    next[i].timestamp = i === 0 ? 0 : start;
    if (i > 0) {
      const prev = next[i - 1];
      next[i].overlap = Math.round(((prev.timestamp ?? 0) + (prev.duration ?? 0) - next[i].timestamp) * 1000) / 1000;
    }
    setLines(next);
    if (commit) setDirty(true);
  }

  function saveEdits() {
    setSaving(true);
    fetch("/api/radio-save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: episode.slug, lines }),
    })
      .then((r) => { if (!r.ok) throw new Error(); setDirty(false); })
      .catch(() => { /* dev-only; ignore */ })
      .finally(() => setSaving(false));
  }

  function ensureCtx(): AudioContext {
    if (!ctxRef.current) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      ctxRef.current = new AC();
    }
    return ctxRef.current;
  }

  function timelineNow(): number {
    if (!playingRef.current || !ctxRef.current) return offsetRef.current;
    return offsetRef.current + (ctxRef.current.currentTime - startCtxRef.current);
  }

  function stopSources() {
    for (const s of sourcesRef.current) {
      try { s.onended = null; s.stop(); s.disconnect(); } catch { /* already stopped */ }
    }
    sourcesRef.current = [];
  }

  // Load + decode audio when the episode changes.
  // Dia episodes: one whole-episode `track`. Others: one clip per line.
  useEffect(() => {
    let cancelled = false;
    setReady(false);
    buffersRef.current = [];
    trackBufRef.current = null;
    const ctx = ensureCtx();
    const decode = (url: string) =>
      fetch(url).then((r) => r.arrayBuffer()).then((a) => ctx.decodeAudioData(a)).catch(() => null);

    if (episode.track) {
      decode(episode.track).then((buf) => {
        if (cancelled) return;
        trackBufRef.current = buf;
        setReady(true);
      });
    } else {
      Promise.all(episode.lines.map((l) => (l.audio ? decode(l.audio) : Promise.resolve(null)))).then((bufs) => {
        if (cancelled) return;
        buffersRef.current = bufs;
        setReady(true);
      });
    }
    return () => { cancelled = true; };
  }, [episode.slug]);

  function startPlayback(from: number) {
    const ctx = ensureCtx();
    ctx.resume();
    stopSources();
    offsetRef.current = from;
    startCtxRef.current = ctx.currentTime;

    // Single-track (Dia): one source, seek via buffer offset
    if (episode.track) {
      const buf = trackBufRef.current;
      if (buf && from < buf.duration) {
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(startCtxRef.current, from);
        sourcesRef.current.push(src);
      }
      playingRef.current = true;
      setIsPlaying(true);
      return;
    }

    lines.forEach((line, i) => {
      const buf = buffersRef.current[i];
      if (!buf) return;
      const clipStart = line.timestamp ?? 0;
      const clipEnd   = clipStart + buf.duration;
      if (clipEnd <= from) return;  // already finished
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      if (clipStart >= from) {
        src.start(startCtxRef.current + (clipStart - from));
      } else {
        src.start(startCtxRef.current, from - clipStart);  // mid-clip
      }
      sourcesRef.current.push(src);
    });
    playingRef.current = true;
    setIsPlaying(true);
  }

  function pausePlayback() {
    offsetRef.current = timelineNow();
    stopSources();
    playingRef.current = false;
    setIsPlaying(false);
  }

  function togglePlay() {
    if (!ready) return;
    if (playingRef.current) pausePlayback();
    else startPlayback(offsetRef.current >= span ? 0 : offsetRef.current);
  }

  function seek(t: number) {
    const clamped = Math.max(0, Math.min(t, span));
    if (playingRef.current) startPlayback(clamped);
    else { offsetRef.current = clamped; setCurrentTime(clamped); setActiveLine(getActiveLine(lines, clamped)); }
  }

  function seekToLine(line: TranscriptLine) {
    seek(line.timestamp ?? 0);
  }

  function selectEpisode(idx: number) {
    if (idx === selectedIdx) return;
    stopSources();
    playingRef.current = false;
    offsetRef.current = 0;
    setIsPlaying(false);
    setCurrentTime(0);
    setActiveLine(-1);
    setSelectedIdx(idx);
  }

  // Reset clock when switching episodes
  useEffect(() => {
    offsetRef.current = 0;
    setCurrentTime(0);
    setActiveLine(-1);
  }, [episode.slug]);

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

  // RAF loop: drive UI clock + active line from the Web Audio timeline
  useEffect(() => {
    function tick() {
      const t = timelineNow();
      if (t >= span) { pausePlayback(); offsetRef.current = 0; setCurrentTime(0); setActiveLine(-1); return; }
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

  // Tear down the audio context on unmount
  useEffect(() => () => { stopSources(); ctxRef.current?.close(); }, []);

  const episodeCast = [...new Set(lines.map((l) => l.speaker))]
    .map((id) => cast[id])
    .filter((m): m is CastMember => m !== undefined);

  const activeSpeaker = isPlaying && activeLine >= 0 ? lines[activeLine]?.speaker : null;

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0a] font-sans text-sm">
      {/* Sidebar */}
      <div className="flex w-52 flex-shrink-0 flex-col border-r border-white/5 overflow-y-auto">
        <div className="px-4 py-3 border-b border-white/5">
          <div className="text-[10px] font-semibold tracking-[3px] text-[#ff6b00]">📻 SNAZZIE FM</div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-4 pt-3 pb-1 text-[9px] font-semibold tracking-[2px] text-white/20">EPISODES</div>
          {episodes.map((ep, i) => {
            const active = i === selectedIdx;
            return (
              <button
                key={ep.slug}
                onClick={() => selectEpisode(i)}
                className={`w-full text-left px-4 py-3 border-l-2 transition-colors ${
                  active
                    ? "border-[#ff6b00] bg-white/[0.04]"
                    : "border-transparent hover:bg-white/[0.02] hover:border-white/10"
                }`}
              >
                <div className={`text-[11px] font-semibold leading-tight ${active ? "text-white" : "text-white/40"}`}>
                  {ep.title}
                </div>
                <div className="mt-1 text-[9px] text-white/20">
                  {[...new Set(ep.lines.map((l) => l.speaker))]
                    .map((id) => cast[id]?.name ?? id)
                    .join(", ")}
                </div>
              </button>
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

          {/* Discord-style cast — active speaker lights up */}
          <div className="flex flex-1 flex-wrap items-center gap-2 px-2">
            {episodeCast.map((m) => {
              const talking = m.id === activeSpeaker;
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
                  <span
                    className="hidden text-[10px] font-medium sm:inline"
                    style={{ color: talking ? "#fff" : "rgba(255,255,255,0.4)" }}
                  >
                    {m.name}
                  </span>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => setShowTracks((v) => !v)}
            className={`rounded px-2 py-1 text-[9px] font-semibold tracking-[1px] transition-colors ${
              showTracks ? "bg-[#ff6b00]/20 text-[#ff6b00]" : "text-white/30 hover:text-white/60"
            }`}
            title="Toggle per-speaker debug tracks"
          >
            TRACKS
          </button>
          {IS_DEV && (
            <button
              onClick={saveEdits}
              disabled={!dirty || saving}
              className={`rounded px-2 py-1 text-[9px] font-semibold tracking-[1px] transition-colors ${
                dirty && !saving
                  ? "bg-[#55efc4]/20 text-[#55efc4] hover:bg-[#55efc4]/30"
                  : "text-white/15 cursor-default"
              }`}
              title="Save timeline edits to the episode JSON"
            >
              {saving ? "SAVING…" : dirty ? "SAVE*" : "SAVED"}
            </button>
          )}
          <div className="text-[10px] text-white/30 tabular-nums">
            {fmt(currentTime)} / {fmt(span)}
          </div>
        </div>

        {/* Multitrack debug view */}
        {showTracks && (
          <TrackLanes
            lines={lines}
            cast={cast}
            span={span}
            currentTime={currentTime}
            activeLine={activeLine}
            onSeek={seek}
            onMove={IS_DEV ? moveClip : undefined}
          />
        )}

        {/* Transcript */}
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-1">
          {lines.map((line, i) => {
            const member = cast[line.speaker];
            const isActive = i === activeLine;
            return (
              <div
                key={i}
                ref={(el) => { lineRefs.current[i] = el; }}
                onClick={() => seekToLine(line)}
                className={`flex items-baseline gap-2 cursor-pointer rounded px-2 py-1 -mx-2 transition-colors ${
                  isActive
                    ? "bg-[#ff6b00]/10 border-l-2 border-[#ff6b00] pl-1.5"
                    : "hover:bg-white/[0.03]"
                }`}
              >
                <span
                  className="min-w-[52px] flex-shrink-0 text-[9px] font-bold tracking-[0.5px]"
                  style={{ color: member?.color ?? "#888" }}
                >
                  {member?.name ?? line.speaker}
                </span>
                <span className="flex-shrink-0 text-[9px] text-white/25 tabular-nums">
                  {line.timestamp ? fmt(line.timestamp) : ""}
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
