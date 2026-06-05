import { useEffect, useRef, useState } from "react";
import type React from "react";
import type { Episode } from "@/data/radio";

const NUM_BARS = 14;

export interface RadioAudioState {
  airIdx: number;
  playing: boolean;
  loading: boolean;
  musicIdx: number | null;
  musicPlaying: boolean;
  musicLoading: boolean;
  levels: number[];
  analyserRef: React.RefObject<AnalyserNode | null>;
  volume: number;
  setVolume: (v: number) => void;
  togglePlay: () => Promise<void>;
  tuneTo: (idx: number) => void;
  toggleMusicTrack: (idx: number) => Promise<void>;
  nextTrack: () => void;
}

export function useRadioAudio(episodes: Episode[], music: Episode[]): RadioAudioState {
  const [airIdx, setAirIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [musicIdx, setMusicIdx] = useState<number | null>(null);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [musicLoading, setMusicLoading] = useState(false);
  const [levels, setLevels] = useState<number[]>(() => Array(NUM_BARS).fill(0.06));
  const [volume, setVolumeState] = useState(1);

  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const sourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const genRef = useRef(0);
  const startedRef = useRef(false);

  useEffect(() => {
    let raf = 0;
    let t = 0;
    const freqData = new Uint8Array(32);
    const tick = () => {
      const analyser = analyserRef.current;
      const active = playing || musicPlaying;
      if (analyser && active) {
        analyser.getByteFrequencyData(freqData);
        const step = Math.floor(freqData.length / NUM_BARS);
        setLevels(Array.from({ length: NUM_BARS }, (_, i) =>
          Math.max(0.04, freqData[i * step] / 255)));
      } else {
        t += 0.04;
        setLevels(Array.from({ length: NUM_BARS }, (_, i) =>
          Math.max(0.03, 0.05 + 0.03 * Math.sin(t + i * 0.9))));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, musicPlaying]);

  useEffect(() => () => { genRef.current++; stopSources(); ctxRef.current?.close(); }, []);

  function getCtx() {
    if (!ctxRef.current) {
      const ctx = new AudioContext();
      const gain = ctx.createGain();
      gain.gain.value = volume;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.75;
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;
      analyser.connect(gain);
      gain.connect(ctx.destination);
      ctxRef.current = ctx;
      analyserRef.current = analyser;
      gainRef.current = gain;
    }
    return { ctx: ctxRef.current, analyser: analyserRef.current! };
  }

  function setVolume(v: number) {
    setVolumeState(v);
    if (gainRef.current) gainRef.current.gain.value = v;
  }

  function stopSources() {
    for (const s of sourcesRef.current) { try { s.onended = null; s.stop(); } catch { /* already stopped */ } }
    sourcesRef.current = [];
  }

  async function decode(ctx: AudioContext, url: string) {
    const res = await fetch(url);
    return ctx.decodeAudioData(await res.arrayBuffer());
  }

  async function startInterstitial(musicTrackIdx: number, nextEpIdx: number, gen: number) {
    const track = music[musicTrackIdx];
    if (!track?.track) { setAirIdx(nextEpIdx); startEpisode(nextEpIdx); return; }
    const { ctx, analyser } = getCtx();
    await ctx.resume();
    setMusicIdx(musicTrackIdx);
    setMusicPlaying(true);
    try {
      const buf = await decode(ctx, track.track);
      if (gen !== genRef.current) return;
      const s = ctx.createBufferSource();
      s.buffer = buf;
      s.connect(analyser);
      s.start(ctx.currentTime + 0.1);
      sourcesRef.current.push(s);
      s.onended = () => {
        if (gen !== genRef.current) return;
        setMusicPlaying(false);
        setMusicIdx(null);
        setAirIdx(nextEpIdx);
        startEpisode(nextEpIdx);
      };
    } catch {
      setMusicPlaying(false);
      setAirIdx(nextEpIdx);
      startEpisode(nextEpIdx);
    }
  }

  async function startEpisode(idx: number) {
    const { ctx, analyser } = getCtx();
    await ctx.resume();
    const gen = ++genRef.current;
    stopSources();
    setLoading(true);
    setMusicPlaying(false);
    const ep = episodes[idx];
    const t0 = ctx.currentTime + 0.15;
    let last: AudioBufferSourceNode | null = null;
    let lastEnd = 0;

    const schedule = (buf: AudioBuffer, at: number) => {
      const s = ctx.createBufferSource();
      s.buffer = buf;
      s.connect(analyser);
      s.start(t0 + at);
      sourcesRef.current.push(s);
      if (at + buf.duration >= lastEnd) { lastEnd = at + buf.duration; last = s; }
    };

    try {
      if (ep.track) {
        schedule(await decode(ctx, ep.track), 0);
      } else {
        const lines = ep.lines.filter((l) => l.audio);
        const bufs = await Promise.all(lines.map((l) => decode(ctx, l.audio!)));
        if (gen !== genRef.current) return;
        lines.forEach((l, i) => bufs[i] && schedule(bufs[i], l.timestamp ?? 0));
      }
    } catch {
      setLoading(false);
      return;
    }
    if (gen !== genRef.current) return;
    setLoading(false);
    if (last) (last as AudioBufferSourceNode).onended = () => {
      if (gen !== genRef.current) return;
      const next = (idx + 1) % episodes.length;
      if (music.length > 0) {
        startInterstitial(idx % music.length, next, gen);
      } else {
        setAirIdx(next);
        startEpisode(next);
      }
    };
  }

  async function togglePlay() {
    if (!startedRef.current) {
      startedRef.current = true;
      setPlaying(true);
      await startEpisode(airIdx);
      return;
    }
    const { ctx } = getCtx();
    if (playing) { await ctx.suspend(); setPlaying(false); setMusicPlaying(false); }
    else { await ctx.resume(); setPlaying(true); }
  }

  function tuneTo(idx: number) {
    startedRef.current = true;
    setAirIdx(idx);
    setPlaying(true);
    startEpisode(idx);
  }

  async function playMusicTrack(idx: number) {
    const track = music[idx];
    if (!track?.track) return;
    const { ctx, analyser } = getCtx();
    await ctx.resume();
    const gen = ++genRef.current;
    stopSources();
    setMusicLoading(true);
    setMusicIdx(idx);
    setMusicPlaying(true);
    setPlaying(false);
    try {
      const buf = await decode(ctx, track.track);
      if (gen !== genRef.current) return;
      const s = ctx.createBufferSource();
      s.buffer = buf;
      s.connect(analyser);
      s.start(ctx.currentTime + 0.1);
      sourcesRef.current.push(s);
      s.onended = () => { if (gen === genRef.current) { setMusicPlaying(false); setMusicIdx(null); } };
    } catch {
      setMusicLoading(false);
      setMusicPlaying(false);
      return;
    }
    if (gen !== genRef.current) return;
    setMusicLoading(false);
  }

  function nextTrack() {
    startedRef.current = true;
    const gen = ++genRef.current;
    stopSources();
    if (musicPlaying && musicIdx !== null) {
      // Skip music interstitial → go straight to next episode
      setMusicPlaying(false);
      setMusicIdx(null);
      const next = (airIdx + 1) % episodes.length;
      setAirIdx(next);
      setPlaying(true);
      startEpisode(next);
    } else if (music.length > 0) {
      // Skip current episode → play music interstitial then next episode
      setPlaying(true);
      startInterstitial(airIdx % music.length, (airIdx + 1) % episodes.length, gen);
    } else {
      // No music → skip to next episode
      const next = (airIdx + 1) % episodes.length;
      setAirIdx(next);
      setPlaying(true);
      startEpisode(next);
    }
  }

  async function toggleMusicTrack(idx: number) {
    const ctx = ctxRef.current;
    if (musicIdx === idx && musicPlaying) {
      if (ctx) { await ctx.suspend(); setMusicPlaying(false); }
      return;
    }
    if (musicIdx === idx && !musicPlaying && ctx) {
      await ctx.resume();
      setMusicPlaying(true);
      return;
    }
    await playMusicTrack(idx);
  }

  return {
    airIdx,
    playing,
    loading,
    musicIdx,
    musicPlaying,
    musicLoading,
    levels,
    analyserRef,
    volume,
    setVolume,
    togglePlay,
    tuneTo,
    toggleMusicTrack,
    nextTrack,
  };
}
