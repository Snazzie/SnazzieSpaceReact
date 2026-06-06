import { useEffect, useRef } from "react";
import type React from "react";
import type { Episode } from "@/data/radio";
import type { AdBreak } from "./useRadioAudio";

function SpectrumViz({ analyserRef, active }: { analyserRef: React.RefObject<AnalyserNode | null>; active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;

    const ro = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth * devicePixelRatio;
      canvas.height = canvas.offsetHeight * devicePixelRatio;
    });
    ro.observe(canvas);
    canvas.width = canvas.offsetWidth * devicePixelRatio;
    canvas.height = canvas.offsetHeight * devicePixelRatio;

    let raf = 0;
    let t = 0;
    let freqData: Uint8Array | null = null;

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const W = canvas.width;
      const H = canvas.height;
      if (!W || !H) return;
      ctx2d.clearRect(0, 0, W, H);

      const analyser = analyserRef.current;
      if (analyser && active) {
        if (!freqData || freqData.length !== analyser.frequencyBinCount) {
          freqData = new Uint8Array(analyser.frequencyBinCount);
        }
        analyser.getByteFrequencyData(freqData);
      } else {
        // idle: gentle sine drift across 256 bins
        t += 0.018;
        if (!freqData || freqData.length !== 256) freqData = new Uint8Array(256);
        for (let i = 0; i < 256; i++) {
          freqData[i] = Math.round((0.04 + 0.025 * Math.sin(t + i * 0.35)) * 255);
        }
      }

      const totalBins = freqData!.length;
      // 40 bars = 40 intervals between the 41 dial ticks, so bars line up with ticks
      const NUM_BARS = 40;
      const slot = W / NUM_BARS;
      const gap = 1;
      const barW = slot - gap;

      // logarithmic frequency mapping: bar i covers fMin*(fMax/fMin)^(i/N) to ^((i+1)/N)
      const nyquist = analyserRef.current ? analyserRef.current.context.sampleRate / 2 : 22050;
      const fMin = 40;
      // cap below nyquist — most speech/music energy is under ~10kHz,
      // so mapping to full nyquist leaves the treble bars permanently empty
      const fMax = Math.min(nyquist, 10000);
      const logRange = Math.log(fMax / fMin);

      for (let i = 0; i < NUM_BARS; i++) {
        const fLow  = fMin * Math.exp(logRange * (i / NUM_BARS));
        const fHigh = fMin * Math.exp(logRange * ((i + 1) / NUM_BARS));
        const binLow  = Math.max(0, Math.floor(fLow  / nyquist * totalBins));
        const binHigh = Math.min(totalBins - 1, Math.ceil(fHigh / nyquist * totalBins));
        let sum = 0;
        const count = Math.max(1, binHigh - binLow);
        for (let b = binLow; b < binHigh; b++) sum += freqData![b];
        const norm = sum / (count * 255);
        const h = Math.max(2, norm * H);
        const x = i * slot + gap / 2;
        const alpha = 0.3 + norm * 0.7;
        ctx2d.fillStyle = `rgba(255,158,44,${alpha})`;
        ctx2d.fillRect(x, H - h, Math.max(1, barW), h);
      }
    };

    draw();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [analyserRef, active]);

  return <canvas ref={canvasRef} className="rl-spectrum" aria-hidden />;
}

interface Props {
  playing: boolean;
  loading: boolean;
  musicIdx: number | null;
  musicPlaying: boolean;
  music: Episode[];
  adIdx: number | null;
  adPlaying: boolean;
  ads: Episode[];
  breakAhead: AdBreak | null;
  activeBlock: AdBreak | null;
  onAir: Episode | undefined;
  levels: number[];
  analyserRef: React.RefObject<AnalyserNode | null>;
  volume: number;
  setVolume: (v: number) => void;
  clock: string;
  airIdx: number;
  episodes: Episode[];
  togglePlay: () => Promise<void>;
  tuneTo: (idx: number) => void;
  toggleMusicTrack: (idx: number) => Promise<void>;
  nextTrack: () => void;
}

export default function RadioReceiver({
  playing, loading, musicIdx, musicPlaying, music, adIdx, adPlaying, ads, breakAhead, activeBlock, onAir,
  analyserRef, volume, setVolume, clock, airIdx, episodes,
  togglePlay, tuneTo, toggleMusicTrack, nextTrack,
}: Props) {
  // Build the upcoming queue in the engine's real playback order: the immediate break's
  // remaining music + ad spots (from the live block, or the one planned for after this show),
  // then the rest of the episode cycle. Ads are display-only (no jump-to-mid-break).
  type QueueItem = { title: string; kind: "episode" | "music" | "ad"; idx: number };
  const upNext: QueueItem[] = [];

  // 1) the break that's airing now (during an ad block / music) or planned next (during a show)
  const brk = activeBlock ?? breakAhead;
  if (brk) {
    // show the leading music only when it's still upcoming (not while it's the one airing now)
    const musicIsNow = brk === activeBlock && musicPlaying;
    if (brk.music !== null && brk.pos < 0 && !musicIsNow && music[brk.music]) {
      upNext.push({ title: music[brk.music].title, kind: "music", idx: brk.music });
    }
    for (let i = brk.pos + 1; i < brk.ads.length; i++) {
      const a = brk.ads[i];
      if (ads[a]) upNext.push({ title: ads[a].title, kind: "ad", idx: a });
    }
  }

  // 2) the episode cycle after this show
  for (let i = 0; i < episodes.length; i++) {
    const epIdx = (airIdx + 1 + i) % episodes.length;
    upNext.push({ title: episodes[epIdx].title, kind: "episode", idx: epIdx });
  }
  const upNextSlice = upNext;

  return (
    <div className="rl-receiver">
      {/* dial — spectrum viz renders as background */}
      <div className="rl-dial">
        <SpectrumViz analyserRef={analyserRef} active={playing || musicPlaying || adPlaying} />
        <div className="rl-dial-ticks">
          {Array.from({ length: 41 }).map((_, i) => (
            <span key={i} className={i % 5 === 0 ? "rl-tick rl-tick-major" : "rl-tick"} />
          ))}
        </div>
        <div className="rl-dial-needle" />
        <div className="rl-dial-numbers">
          <span>AM</span><span>TALK</span><span>NEWS</span><span>FM</span><span>LIVE</span><span>OFF</span>
        </div>
      </div>

      {/* readout */}
      <div className="rl-readout">
        <div className="rl-readout-inner">
          <div className="rl-readout-text">
            <div className="rl-readout-row">
              <span className="rl-readout-label">
                {adPlaying ? "AD BREAK" : musicIdx !== null ? "♪" : "NOW"}
              </span>
              <span className="rl-readout-title">
                {adPlaying && adIdx !== null
                  ? (ads[adIdx]?.title ?? "Advertisement")
                  : musicIdx !== null
                  ? (music[musicIdx]?.title ?? "Music")
                  : (onAir?.title ?? "Snazzie FM")}
              </span>
            </div>
            <div className="rl-readout-clock">{clock} &middot; STEREO &middot; SNAZZIE FM</div>
          </div>
        </div>
      </div>

      <div className="rl-controls-row">
        <div className="rl-tunein-row">
          <button className="rl-tunein" type="button" onClick={togglePlay} disabled={loading}>
            <span className="rl-tunein-icon">{loading ? "⦿" : (playing || musicPlaying || adPlaying) ? "❚❚" : "▶"}</span>
            {loading ? "Tuning…" : (playing || musicPlaying || adPlaying) ? "On Air" : "Tune In"}
          </button>
          <button
            className="rl-next"
            type="button"
            onClick={nextTrack}
            disabled={loading}
            title="Next"
          >
            &#9654;&#9654;
          </button>
        </div>
        <div className="rl-volume-col">
          <input
            className="rl-volume-slider"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            aria-label="Volume"
          />
        </div>
      </div>

      <div className="rl-upnext">
        <span className="rl-upnext-label">UP NEXT</span>
        <span className="rl-upnext-list">
          {upNextSlice.map((item, i) => {
            const cls = `rl-upnext-item${i === 0 ? " rl-upnext-item-first" : ""}`
              + (item.kind === "music" ? " rl-upnext-item-music" : "")
              + (item.kind === "ad" ? " rl-upnext-item-ad" : "");
            const icon = item.kind === "music" ? "♪" : item.kind === "ad" ? "⚠" : "▷";
            // ads are display-only (you can't jump into the middle of a commercial break)
            if (item.kind === "ad") {
              return (
                <span key={i} className={cls}>
                  <span className="rl-upnext-icon">{icon}</span>
                  {item.title}
                </span>
              );
            }
            return (
              <button
                key={i}
                type="button"
                className={cls}
                onKeyDown={(e) => { if (e.key === " ") e.preventDefault(); }}
                onClick={(e) => {
                  e.currentTarget.blur();
                  item.kind === "music" ? toggleMusicTrack(item.idx) : tuneTo(item.idx);
                }}
              >
                <span className="rl-upnext-icon">{icon}</span>
                {item.title}
              </button>
            );
          })}
        </span>
      </div>
    </div>
  );
}
