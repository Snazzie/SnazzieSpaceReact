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
  adIdx: number | null;
  adPlaying: boolean;
  levels: number[];
  position: number;  // seconds elapsed in current audio
  duration: number;  // seconds total of current audio
  analyserRef: React.RefObject<AnalyserNode | null>;
  volume: number;
  setVolume: (v: number) => void;
  togglePlay: () => Promise<void>;
  tuneTo: (idx: number) => void;
  toggleMusicTrack: (idx: number) => Promise<void>;
  nextTrack: () => void;
}

export function useRadioAudio(episodes: Episode[], music: Episode[], ads: Episode[] = []): RadioAudioState {
  const [airIdx, setAirIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [musicIdx, setMusicIdx] = useState<number | null>(null);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [musicLoading, setMusicLoading] = useState(false);
  const [adIdx, setAdIdx] = useState<number | null>(null);
  const [adPlaying, setAdPlaying] = useState(false);
  const adPlayingRef = useRef(false);
  useEffect(() => { adPlayingRef.current = adPlaying; }, [adPlaying]);
  const [levels, setLevels] = useState<number[]>(() => Array(NUM_BARS).fill(0.06));
  const [volume, setVolumeState] = useState(1);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const startTimeRef = useRef(0);   // ctx time the current audio started at
  const durationRef = useRef(0);    // total length of the current audio

  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const sourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const genRef = useRef(0);
  const startedRef = useRef(false);
  // mirror of airIdx so rapid skips read a fresh value (state is stale within a tick)
  const airIdxRef = useRef(0);
  useEffect(() => { airIdxRef.current = airIdx; }, [airIdx]);

  useEffect(() => {
    let raf = 0;
    let t = 0;
    const freqData = new Uint8Array(32);
    const tick = () => {
      const analyser = analyserRef.current;
      const active = playing || musicPlaying || adPlaying;
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
      const ctx = ctxRef.current;
      if (ctx && durationRef.current > 0) {
        const pos = Math.min(durationRef.current, Math.max(0, ctx.currentTime - startTimeRef.current));
        setPosition(pos);
        setDuration(durationRef.current);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, musicPlaying, adPlaying]);

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
      // compressor to even out loudness across episodes/tracks
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -24;
      comp.knee.value = 30;
      comp.ratio.value = 12;
      comp.attack.value = 0.003;
      comp.release.value = 0.25;
      const makeup = ctx.createGain();
      makeup.gain.value = 1.6; // recover level lost to compression
      analyser.connect(comp);
      comp.connect(makeup);
      makeup.connect(gain);
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

  // music queued after an episode: its linked track, else a random one
  function musicIdxForEpisode(epIdx: number): number {
    const slug = episodes[epIdx]?.music;
    const linked = slug ? music.findIndex((m) => m.slug === slug) : -1;
    return linked >= 0 ? linked : Math.floor(Math.random() * music.length);
  }

  // a random ad to air after a music break
  function pickAd(): number {
    return Math.floor(Math.random() * ads.length);
  }

  // play a single-track ad, then advance to the next episode
  async function startAd(adIndex: number, nextEpIdx: number, gen: number) {
    const ad = ads[adIndex];
    if (!ad?.track) { setAirIdx(nextEpIdx); startEpisode(nextEpIdx); return; }
    const { ctx, analyser } = getCtx();
    await ctx.resume();
    if (gen !== genRef.current) return;
    setAdIdx(adIndex);
    setAdPlaying(true);
    try {
      const buf = await decode(ctx, ad.track);
      if (gen !== genRef.current) { setAdPlaying(false); setAdIdx(null); return; }
      const s = ctx.createBufferSource();
      s.buffer = buf;
      s.connect(analyser);
      const at = ctx.currentTime + 0.1;
      s.start(at);
      startTimeRef.current = at;
      durationRef.current = buf.duration;
      sourcesRef.current.push(s);
      s.onended = () => {
        if (gen !== genRef.current) return;
        setAdPlaying(false);
        setAdIdx(null);
        setAirIdx(nextEpIdx);
        startEpisode(nextEpIdx);
      };
    } catch {
      setAdPlaying(false);
      setAdIdx(null);
      setAirIdx(nextEpIdx);
      startEpisode(nextEpIdx);
    }
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
    if (gen !== genRef.current) return;
    setMusicIdx(musicTrackIdx);
    setMusicPlaying(true);
    try {
      const buf = await decode(ctx, track.track);
      if (gen !== genRef.current) return;
      const s = ctx.createBufferSource();
      s.buffer = buf;
      s.connect(analyser);
      const at = ctx.currentTime + 0.1;
      s.start(at);
      startTimeRef.current = at;
      durationRef.current = buf.duration;
      sourcesRef.current.push(s);
      s.onended = () => {
        if (gen !== genRef.current) return;
        setMusicPlaying(false);
        setMusicIdx(null);
        if (ads.length > 0) {
          startAd(pickAd(), nextEpIdx, gen);
        } else {
          setAirIdx(nextEpIdx);
          startEpisode(nextEpIdx);
        }
      };
    } catch {
      setMusicPlaying(false);
      setAirIdx(nextEpIdx);
      startEpisode(nextEpIdx);
    }
  }

  async function startEpisode(idx: number, gen: number = ++genRef.current) {
    const { ctx, analyser } = getCtx();
    await ctx.resume();
    if (gen !== genRef.current) return;
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
      if (gen === genRef.current) setLoading(false);
      return;
    }
    if (gen !== genRef.current) return;
    setLoading(false);
    startTimeRef.current = t0;
    durationRef.current = lastEnd;
    if (last) (last as AudioBufferSourceNode).onended = () => {
      if (gen !== genRef.current) return;
      const next = (idx + 1) % episodes.length;
      if (music.length > 0) {
        startInterstitial(musicIdxForEpisode(idx), next, gen);
      } else if (ads.length > 0) {
        startAd(pickAd(), next, gen);
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
    if (playing) { await ctx.suspend(); setPlaying(false); setMusicPlaying(false); setAdPlaying(false); }
    else { await ctx.resume(); setPlaying(true); }
  }

  function tuneTo(idx: number) {
    startedRef.current = true;
    setAdPlaying(false);
    setAdIdx(null);
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
    setAdPlaying(false);
    setAdIdx(null);
    try {
      const buf = await decode(ctx, track.track);
      if (gen !== genRef.current) return;
      const s = ctx.createBufferSource();
      s.buffer = buf;
      s.connect(analyser);
      const at = ctx.currentTime + 0.1;
      s.start(at);
      startTimeRef.current = at;
      durationRef.current = buf.duration;
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
    const base = airIdxRef.current;
    const next = (base + 1) % episodes.length;
    if (adPlayingRef.current) {
      setAdPlaying(false);
      setAdIdx(null);
      airIdxRef.current = next;
      setAirIdx(next);
      setPlaying(true);
      startEpisode(next, gen);
      return;
    }
    if (musicPlaying && musicIdx !== null) {
      // Skip music interstitial → go straight to next episode
      setMusicPlaying(false);
      setMusicIdx(null);
      airIdxRef.current = next;
      setAirIdx(next);
      setPlaying(true);
      startEpisode(next, gen);
    } else if (music.length > 0) {
      // Skip current episode → play music interstitial then next episode
      setPlaying(true);
      startInterstitial(musicIdxForEpisode(base), next, gen);
    } else {
      // No music → skip to next episode
      airIdxRef.current = next;
      setAirIdx(next);
      setPlaying(true);
      startEpisode(next, gen);
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
    adIdx,
    adPlaying,
    levels,
    position,
    duration,
    analyserRef,
    volume,
    setVolume,
    togglePlay,
    tuneTo,
    toggleMusicTrack,
    nextTrack,
  };
}
