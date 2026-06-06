import { useEffect, useRef } from "react";
import type React from "react";
import type { Episode } from "@/data/radio";

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
  playing, loading, musicIdx, musicPlaying, music, onAir,
  analyserRef, volume, setVolume, clock, airIdx, episodes,
  togglePlay, tuneTo, toggleMusicTrack, nextTrack,
}: Props) {
  // Build the interleaved queue matching the audio engine's actual playback order.
  const upNext: { title: string; isMusic: boolean; idx: number }[] = [];
  if (music.length > 0) {
    if (musicIdx !== null && musicPlaying) {
      // Music interstitial playing; next is episode airIdx+1, then music, then episode...
      for (let i = 0; upNext.length < 4; i++) {
        const epIdx = (airIdx + 1 + i) % episodes.length;
        upNext.push({ title: episodes[epIdx].title, isMusic: false, idx: epIdx });
        const mIdx = (airIdx + 1 + i) % music.length;
        upNext.push({ title: music[mIdx].title, isMusic: true, idx: mIdx });
      }
    } else {
      // Episode playing; next is music[airIdx % music.length], then episode airIdx+1...
      for (let i = 0; upNext.length < 4; i++) {
        const mIdx = (airIdx + i) % music.length;
        upNext.push({ title: music[mIdx].title, isMusic: true, idx: mIdx });
        const epIdx = (airIdx + 1 + i) % episodes.length;
        upNext.push({ title: episodes[epIdx].title, isMusic: false, idx: epIdx });
      }
    }
  } else {
    for (let i = 0; i < 4; i++) {
      const epIdx = (airIdx + 1 + i) % episodes.length;
      upNext.push({ title: episodes[epIdx].title, isMusic: false, idx: epIdx });
    }
  }
  const upNextSlice = upNext.slice(0, 4);

  return (
    <div className="rl-receiver">
      {/* dial — spectrum viz renders as background */}
      <div className="rl-dial">
        <SpectrumViz analyserRef={analyserRef} active={playing || musicPlaying} />
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
              <span className="rl-readout-label">{musicIdx !== null ? "♪" : "NOW"}</span>
              <span className="rl-readout-title">
                {musicIdx !== null
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
            <span className="rl-tunein-icon">{loading ? "⦿" : (playing || musicPlaying) ? "❚❚" : "▶"}</span>
            {loading ? "Tuning…" : (playing || musicPlaying) ? "On Air" : "Tune In"}
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
          {upNextSlice.map((item, i) => (
            <button
              key={i}
              type="button"
              className={`rl-upnext-item${i === 0 ? " rl-upnext-item-first" : ""}${item.isMusic ? " rl-upnext-item-music" : ""}`}
              onClick={() => item.isMusic ? toggleMusicTrack(item.idx) : tuneTo(item.idx)}
            >
              <span className="rl-upnext-icon">{item.isMusic ? "♪" : "▷"}</span>
              {item.title}
            </button>
          ))}
        </span>
      </div>
    </div>
  );
}
