import { useCallback, useEffect, useRef, useState } from "react";
import type { CastMember, Episode, TranscriptLine } from "@/data/radio";

interface Props {
  episodes: Episode[];
  cast: Record<string, CastMember>;
}

function fmt(s: number): string {
  if (!isFinite(s)) return "0:00";
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${sec < 10 ? "0" : ""}${sec}`;
}

function getActiveLine(lines: TranscriptLine[], currentTime: number): number {
  let active = -1;
  for (let i = 0; i < lines.length; i++) {
    if ((lines[i].timestamp ?? 0) <= currentTime) active = i;
    else break;
  }
  return active;
}

function drawWaveform(canvas: HTMLCanvasElement, peaks: number[], playPct: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const DPR = window.devicePixelRatio || 1;
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  if (!peaks.length) return;
  const n = peaks.length, gap = Math.round(DPR * 1.5);
  const barW = Math.max(1, (W - gap * (n - 1)) / n);
  const cx = Math.floor(playPct * W);
  for (let i = 0; i < n; i++) {
    const barH = Math.max(DPR * 2, peaks[i] * H * 0.92);
    const x = i * (barW + gap);
    const played = (x + barW) <= cx, head = x <= cx && cx < (x + barW);
    ctx.fillStyle = played
      ? "rgba(255,107,0,0.85)"
      : head
      ? "rgba(255,107,0,1)"
      : `rgba(255,255,255,${0.08 + peaks[i] * 0.12})`;
    const y = (H - barH) / 2;
    ctx.beginPath();
    ctx.roundRect(x, y, barW, barH, Math.min(barW / 2, DPR * 2));
    ctx.fill();
  }
}

export default function RadioStation({ episodes, cast }: Props) {
  const [selectedIdx, setSelectedIdx]   = useState(0);
  const [isPlaying, setIsPlaying]       = useState(false);
  const [currentTime, setCurrentTime]   = useState(0);
  const [duration, setDuration]         = useState(0);
  const [activeLine, setActiveLine]     = useState(-1);
  const [peaks, setPeaks]               = useState<number[]>([]);

  const audioRef      = useRef<HTMLAudioElement>(null);
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const lineRefs      = useRef<(HTMLDivElement | null)[]>([]);
  const rafRef        = useRef<number>(0);

  const episode = episodes[selectedIdx];

  // Load waveform when episode changes
  useEffect(() => {
    setPeaks([]);
    setCurrentTime(0);
    setDuration(0);
    setActiveLine(-1);
    setIsPlaying(false);
    fetch(episode.waveformPath)
      .then((r) => r.ok ? r.json() : [])
      .then(setPeaks)
      .catch(() => setPeaks([]));
  }, [episode.waveformPath]);

  // Redraw canvas whenever peaks or currentTime/duration changes
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const DPR = window.devicePixelRatio || 1;
    canvas.width  = canvas.offsetWidth  * DPR;
    canvas.height = canvas.offsetHeight * DPR;
    drawWaveform(canvas, peaks, duration ? currentTime / duration : 0);
  }, [peaks, currentTime, duration]);

  useEffect(() => { redraw(); }, [redraw]);

  useEffect(() => {
    window.addEventListener("resize", redraw);
    return () => window.removeEventListener("resize", redraw);
  }, [redraw]);

  // RAF loop for smooth time sync + active line tracking
  useEffect(() => {
    function tick() {
      const audio = audioRef.current;
      if (!audio) return;
      const t = audio.currentTime;
      setCurrentTime(t);
      const nextActive = getActiveLine(episode.lines, t);
      setActiveLine((prev) => {
        if (prev !== nextActive) {
          lineRefs.current[nextActive]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
        return nextActive;
      });
      rafRef.current = requestAnimationFrame(tick);
    }
    if (isPlaying) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(rafRef.current);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, episode.lines]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play();
    else audio.pause();
  }

  function seekToLine(line: TranscriptLine) {
    const audio = audioRef.current;
    if (!audio || !line.timestamp) return;
    audio.currentTime = line.timestamp;
    setCurrentTime(line.timestamp);
  }

  function seekByPct(pct: number) {
    const audio = audioRef.current;
    if (!audio?.duration) return;
    audio.currentTime = pct * audio.duration;
  }

  function selectEpisode(idx: number) {
    const audio = audioRef.current;
    if (audio) { audio.pause(); audio.currentTime = 0; }
    setSelectedIdx(idx);
  }

  const episodeCast = [...new Set(episode.lines.map((l) => l.speaker))]
    .map((id) => cast[id])
    .filter((m): m is CastMember => m !== undefined);

  return (
    <div className="flex h-[600px] overflow-hidden rounded-lg border border-white/10 bg-[#0a0a0a] font-sans text-sm">
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

        {/* Cast for current episode */}
        <div className="border-t border-white/5 px-4 py-3">
          <div className="mb-2 text-[9px] font-semibold tracking-[2px] text-white/20">CAST</div>
          <div className="flex flex-col gap-1.5">
            {episodeCast.map((member) => (
              <div key={member.id} className="flex items-center gap-2">
                <div
                  className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-black"
                  style={{ background: member.color }}
                >
                  {member.name[0]}
                </div>
                <div>
                  <span className="text-[10px] text-white/50">{member.name}</span>
                  <span className="ml-1 text-[9px] text-white/20">— {member.role}</span>
                </div>
              </div>
            ))}
          </div>
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
          <div className="flex-1 min-w-0">
            <div className="text-[9px] font-semibold tracking-[2px] text-[#ff6b00]">
              {isPlaying ? "NOW ON AIR" : "SNAZZIE FM"}
            </div>
            <div className="truncate text-[12px] font-semibold text-white">{episode.title}</div>
          </div>
          <div className="text-[10px] text-white/30 tabular-nums">
            {fmt(currentTime)} / {fmt(duration || 0)}
          </div>
        </div>

        {/* Waveform */}
        <div
          className="relative h-10 flex-shrink-0 cursor-pointer bg-[#0d0d0d] border-b border-white/5"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            seekByPct((e.clientX - rect.left) / rect.width);
          }}
        >
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
          {!peaks.length && (
            <div className="absolute inset-0 flex items-center justify-center text-[9px] text-white/20">
              run: bun radio the-truth-hour
            </div>
          )}
        </div>

        {/* Transcript */}
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-1">
          {episode.lines.map((line, i) => {
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
                  {line.text}
                </span>
              </div>
            );
          })}
        </div>

        <audio
          ref={audioRef}
          src={episode.audioPath}
          preload="metadata"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
          onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
        />
      </div>
    </div>
  );
}
