import { useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import type { Episode } from "@/data/radio";

const NUM_BARS = 14;
// A block of ads airs between every show; a music break only every MUSIC_EVERY-th transition.
const MUSIC_EVERY = 3;
// Ads per between-show commercial break — a mix of Pro spots and InstaAds, in that order.
const AD_BLOCK = 6;
// Auto loudness-match every source to one target so speech, ads and (much hotter)
// music all play at the same perceived level. We measure each decoded buffer's
// integrated RMS and set a per-source gain toward TARGET_RMS_DB. Music measures
// hotter than TTS, so it gets pulled down automatically — no hand-tuned constant.
const TARGET_RMS_DB = -20;   // dBFS RMS to normalize toward (typical speech level)
const MAX_GAIN = 4;          // +12 dB ceiling so near-silent buffers don't explode
const MIN_GAIN = 0.05;       // -26 dB floor

// Persisted master volume, shared with the station player (RadioStation.tsx).
const VOLUME_KEY = "snazziefm:volume";
function loadVolume(): number {
  if (typeof window === "undefined") return 1;
  const v = parseFloat(window.localStorage.getItem(VOLUME_KEY) ?? "");
  return isFinite(v) ? Math.min(1, Math.max(0, v)) : 1;
}

// Per-buffer integrated RMS, cached (measured once per decoded buffer).
const RMS_CACHE = new WeakMap<AudioBuffer, number>();

/** Linear gain that brings a buffer's RMS to TARGET_RMS_DB (clamped). */
function bufferGain(buf: AudioBuffer): number {
  let rms = RMS_CACHE.get(buf);
  if (rms === undefined) {
    let sum = 0, n = 0;
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < d.length; i += 4) { sum += d[i] * d[i]; n++; }  // stride 4: cheap on long tracks
    }
    rms = n ? Math.sqrt(sum / n) : 0;
    RMS_CACHE.set(buf, rms);
  }
  if (rms <= 0) return 1;
  const g = Math.pow(10, (TARGET_RMS_DB - 20 * Math.log10(rms)) / 20);
  return Math.min(MAX_GAIN, Math.max(MIN_GAIN, g));
}

/** Wire a source through its loudness-normalizing gain into the shared chain input. */
function connectNorm(ctx: AudioContext, s: AudioBufferSourceNode, buf: AudioBuffer, input: AudioNode): void {
  const g = ctx.createGain();
  g.gain.value = bufferGain(buf);
  s.connect(g);
  g.connect(input);
}

// The upcoming between-show break, surfaced for the "up next" list: a leading music track
// (or null) and the ordered ad-block indices. `pos` is the index of the ad currently airing
// within the block (-1 while the leading music plays / before the block starts).
export interface AdBreak {
  music: number | null;
  ads: number[];
  pos: number;
}

export interface RadioAudioState {
  airIdx: number;
  playing: boolean;
  loading: boolean;
  musicIdx: number | null;
  musicPlaying: boolean;
  musicLoading: boolean;
  adIdx: number | null;
  adPlaying: boolean;
  adLoading: boolean;
  levels: number[];
  position: number;  // seconds elapsed in current audio
  duration: number;  // seconds total of current audio
  analyserRef: React.RefObject<AnalyserNode | null>;
  volume: number;
  breakAhead: AdBreak | null;   // the next break planned while a show plays (for "up next")
  activeBlock: AdBreak | null;  // the break currently airing (music/ads), with live position
  setVolume: (v: number) => void;
  togglePlay: () => Promise<void>;
  tuneTo: (idx: number) => void;
  toggleMusicTrack: (idx: number) => Promise<void>;
  toggleAdSpot: (idx: number) => Promise<void>;
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
  const [adLoading, setAdLoading] = useState(false);
  const [breakAhead, setBreakAhead] = useState<AdBreak | null>(null);
  const [activeBlock, setActiveBlock] = useState<AdBreak | null>(null);
  const adPlayingRef = useRef(false);
  useEffect(() => { adPlayingRef.current = adPlaying; }, [adPlaying]);
  const transitionRef = useRef(0);  // counts show transitions, to space out music breaks
  // URL -> decoded buffer cache, so prefetched audio is reused instantly at the transition.
  const bufferCacheRef = useRef<Map<string, Promise<AudioBuffer>>>(new Map());
  // The pre-decided next between-show break (so we can prefetch it and play it gap-free):
  // an optional leading music track, then a block of ad indices.
  const plannedRef = useRef<{ music: number | null; block: number[] } | null>(null);

  // Ad rotation pools, derived once from the shared ADS array. Ads split two ways:
  //   Pro    — professionally announced spots (!blunder)   → shuffle bag, no repeats/cycle.
  //   InstaAd — owner-recorded blunders (blunder===true)    → grouped per business, takes
  //             ordered #1→#2, so a business's takes always air in numerical order.
  // The no-back-to-back-InstaAd rule lives in pickAd (after a blunder, force a Pro).
  const adPools = useMemo(() => {
    const pro: number[] = [];
    const byBiz = new Map<string, number[]>();
    const takeNum = (slug: string) => parseInt(slug.match(/-(\d+)$/)?.[1] ?? "1", 10);
    ads.forEach((ad, i) => {
      if (ad.blunder) {
        const base = ad.slug.replace(/-\d+$/, "");  // strip trailing take number
        const g = byBiz.get(base) ?? (byBiz.set(base, []), byBiz.get(base)!);
        g.push(i);
      } else {
        pro.push(i);
      }
    });
    for (const g of byBiz.values()) g.sort((a, b) => takeNum(ads[a].slug) - takeNum(ads[b].slug));
    return { pro, blunderBiz: [...byBiz.values()] };
  }, [ads]);
  const proBagRef = useRef<number[]>([]);        // shuffle bag of Pro ad indices
  const blunderQueueRef = useRef<number[]>([]);  // ordered InstaAd indices (#1 before #2)
  const lastWasBlunderRef = useRef(false);       // gate: no two InstaAds back-to-back
  const lastProRef = useRef(-1);                 // last Pro popped — avoid repeat across refill
  const lastBlunderRef = useRef(-1);             // last InstaAd popped — avoid repeat across refill
  const blockUsedRef = useRef<Set<number>>(new Set());  // ads already used in the block being built
  const [levels, setLevels] = useState<number[]>(() => Array(NUM_BARS).fill(0.06));
  const [volume, setVolumeState] = useState(loadVolume);
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

  useEffect(() => () => {
    genRef.current++;
    stopSources();
    ctxRef.current?.close();
    ctxRef.current = null;
  }, []);

  function getCtx() {
    if (ctxRef.current?.state === "closed") ctxRef.current = null;
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
      makeup.gain.value = 1.0; // unity: RMS-normalized sources need no boost (1.6 clipped)
      // brick-wall limiter after makeup so boosted/loud clips can't clip
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -1;
      limiter.knee.value = 0;
      limiter.ratio.value = 20;
      limiter.attack.value = 0.001;
      limiter.release.value = 0.1;
      analyser.connect(comp);
      comp.connect(makeup);
      makeup.connect(limiter);
      limiter.connect(gain);
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
    try { window.localStorage.setItem(VOLUME_KEY, String(v)); } catch { /* storage blocked */ }
  }

  function stopSources() {
    for (const s of sourcesRef.current) { try { s.onended = null; s.stop(); } catch { /* already stopped */ } }
    sourcesRef.current = [];
  }

  // One reusable clip scheduler anchored at t0 on the shared analyser chain. Tracks the
  // longest-tailed source so finish() can report duration + wire the end-of-playback handler.
  // Replaces the per-player `schedule`/`last`/`lastEnd` closures that were copied five ways.
  function makeScheduler(ctx: AudioContext, analyser: AudioNode, t0: number) {
    let last: AudioBufferSourceNode | null = null;
    let lastEnd = 0;
    const schedule = (buf: AudioBuffer, at: number) => {
      const s = ctx.createBufferSource();
      s.buffer = buf;
      connectNorm(ctx, s, buf, analyser);
      s.start(t0 + at);
      sourcesRef.current.push(s);
      if (at + buf.duration >= lastEnd) { lastEnd = at + buf.duration; last = s; }
    };
    return {
      schedule,
      finish(onEnded: () => void) {
        startTimeRef.current = t0;
        durationRef.current = lastEnd;
        if (last) (last as AudioBufferSourceNode).onended = onEnded;
      },
    };
  }

  // music queued after an episode: its linked track, else a random one
  function musicIdxForEpisode(epIdx: number): number {
    const slug = episodes[epIdx]?.music;
    const linked = slug ? music.findIndex((m) => m.slug === slug) : -1;
    return linked >= 0 ? linked : Math.floor(Math.random() * music.length);
  }

  function shuffled<T>(a: T[]): T[] {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Peek the next Pro / InstaAd index (refills its pool when drained). Peek only — the
  // queue isn't consumed until the ad actually airs (commitAd), so a slot that gets
  // planned/prefetched but then discarded (e.g. a retune) won't strand a take's #2.
  // When a pool refills mid-block, float ads already aired in the current block to the back so
  // the same block can't replay one (e.g. Glamour Nails #1 from the old cycle, then again now).
  function deferBlockUsed(pool: number[]): number[] {
    if (blockUsedRef.current.size === 0) return pool;
    const fresh = pool.filter((i) => !blockUsedRef.current.has(i));
    const used = pool.filter((i) => blockUsedRef.current.has(i));
    return [...fresh, ...used];
  }
  function nextPro(): number {
    if (proBagRef.current.length === 0) {
      const bag = deferBlockUsed(shuffled([...adPools.pro]));
      // don't let a fresh cycle replay the just-aired spot first
      if (bag.length > 1 && bag[0] === lastProRef.current) [bag[0], bag[1]] = [bag[1], bag[0]];
      proBagRef.current = bag;
    }
    return proBagRef.current[0];
  }
  function nextBlunder(): number {
    if (blunderQueueRef.current.length === 0) {
      const q = deferBlockUsed(shuffled([...adPools.blunderBiz]).flat());  // biz order shuffled, takes kept in order
      if (q.length > 1 && q[0] === lastBlunderRef.current) [q[0], q[1]] = [q[1], q[0]];
      blunderQueueRef.current = q;
    }
    return blunderQueueRef.current[0];
  }

  // Choose the next ad to air between shows. InstaAds never air back-to-back: after one,
  // the next ad is forced to a Pro spot; otherwise an InstaAd airs (numerically ordered).
  function pickAd(): number {
    const hasPro = adPools.pro.length > 0;
    const hasBlunder = adPools.blunderBiz.length > 0;
    if (!hasBlunder) return nextPro();
    if (!hasPro) return nextBlunder();
    return lastWasBlunderRef.current ? nextPro() : nextBlunder();
  }

  // Consume the picked ad from its pool, and record whether it was an InstaAd so the next
  // pick obeys the no-back-to-back rule. Popping is what guarantees no ad repeats until its
  // pool drains and reshuffles. Called even for a broken/empty ad so the pool still advances.
  function commitAd(adIndex: number) {
    if (ads[adIndex]?.blunder) {
      if (blunderQueueRef.current[0] === adIndex) blunderQueueRef.current.shift();
      lastBlunderRef.current = adIndex;
      lastWasBlunderRef.current = true;
    } else {
      if (proBagRef.current[0] === adIndex) proBagRef.current.shift();
      lastProRef.current = adIndex;
      lastWasBlunderRef.current = false;
    }
  }

  // Build one commercial break: AD_BLOCK ads, alternating Pro / InstaAd (pickAd's gate keeps
  // InstaAds from airing back-to-back and in numerical take order). Pops each from its pool,
  // so the block never repeats an ad and the next break continues the alternation.
  function buildAdBlock(): number[] {
    if (ads.length === 0) return [];
    const target = Math.min(AD_BLOCK, ads.length);  // can't fill past the catalogue without a repeat
    const block: number[] = [];
    blockUsedRef.current = new Set();  // track this block's ads so a mid-block refill can't repeat one
    while (block.length < target) {
      let idx = pickAd();
      // pickAd peeks; deferBlockUsed floats this-block ads to the back on refill, but a tiny pool
      // can still re-peek one. Advance past any dup while a fresh ad remains, so a single block
      // never lists the same spot twice.
      let guard = 0;
      while (blockUsedRef.current.has(idx) && guard++ < ads.length) {
        commitAd(idx);
        idx = pickAd();
      }
      commitAd(idx);
      block.push(idx);
      blockUsedRef.current.add(idx);
    }
    blockUsedRef.current = new Set();  // done — don't constrain the next break's refills
    return block;
  }

  // Decide a between-show break for transition n: an optional leading music track (every
  // MUSIC_EVERY-th transition) plus a block of ads. buildAdBlock commits the picks, so call
  // this exactly once per break (planAndPrefetch caches the result for afterShow to reuse).
  function planBreak(epIdx: number, n: number): { music: number | null; block: number[] } {
    const doMusic = music.length > 0 && n % MUSIC_EVERY === MUSIC_EVERY - 1;
    return {
      music: doMusic ? musicIdxForEpisode(epIdx) : null,
      block: ads.length > 0 ? buildAdBlock() : [],
    };
  }

  // The between-show break: a block of ads airs every transition; a music track leads it off
  // every MUSIC_EVERY-th one. Music -> ad block -> next (startInterstitial chains to the
  // block); otherwise ad block -> next.
  function afterShow(epIdx: number, next: number, gen: number) {
    const n = transitionRef.current++;
    // Use the pre-planned (and prefetched) break if we have one; else decide now.
    const brk = plannedRef.current ?? planBreak(epIdx, n);
    plannedRef.current = null;
    setBreakAhead(null);  // this break is now airing, not "ahead"
    if (brk.music !== null) {
      startInterstitial(brk.music, brk.block, next, gen);
    } else if (brk.block.length > 0) {
      startAdBlock(brk.block, 0, next, gen);
    } else {
      setAirIdx(next);
      startEpisode(next);
    }
  }

  // Play through an ad block one spot at a time, then advance to the next episode.
  function startAdBlock(block: number[], i: number, nextEpIdx: number, gen: number) {
    if (gen !== genRef.current) return;
    if (i >= block.length) { setActiveBlock(null); setAirIdx(nextEpIdx); startEpisode(nextEpIdx); return; }
    setActiveBlock({ music: null, ads: block, pos: i });  // live position for "up next"
    playAd(block[i], gen, () => startAdBlock(block, i + 1, nextEpIdx, gen));
  }

  // Schedule one ad's audio (a whole-episode track, or one clip per spoken line) on the shared
  // chain, owning the adIdx/adPlaying lifecycle. Shared by the between-show block (playAd) and
  // the standalone house spot (playAdSpot). Returns how it went so callers can react:
  //   "scheduled" — playing; onEnded fires at the tail
  //   "empty"     — nothing to play (no track/clips); state untouched
  //   "stale"     — a newer generation superseded this mid-flight
  //   "error"     — fetch/decode failed
  type AdResult = "scheduled" | "empty" | "stale" | "error";
  async function scheduleAd(adIndex: number, gen: number, onEnded: () => void): Promise<AdResult> {
    const ad = ads[adIndex];
    const adLines = ad?.lines?.filter((l) => l.audio) ?? [];
    if (!ad || (!ad.track && adLines.length === 0)) return "empty";
    const { ctx, analyser } = getCtx();
    await ctx.resume();
    if (gen !== genRef.current) return "stale";
    setAdIdx(adIndex);
    setAdPlaying(true);
    const sch = makeScheduler(ctx, analyser, ctx.currentTime + 0.1);
    try {
      if (ad.track) {
        sch.schedule(await decode(ctx, ad.track), 0);
      } else {
        const bufs = await Promise.all(adLines.map((l) => decode(ctx, l.audio!)));
        if (gen !== genRef.current) { setAdPlaying(false); setAdIdx(null); return "stale"; }
        adLines.forEach((l, i) => bufs[i] && sch.schedule(bufs[i], l.timestamp ?? 0));
      }
    } catch {
      setAdPlaying(false);
      setAdIdx(null);
      return "error";
    }
    if (gen !== genRef.current) { setAdPlaying(false); setAdIdx(null); return "stale"; }
    sch.finish(() => {
      if (gen !== genRef.current) return;
      setAdPlaying(false);
      setAdIdx(null);
      onEnded();
    });
    return "scheduled";
  }

  // A single ad in a between-show block: on end (or a broken/empty spot) advance the block.
  async function playAd(adIndex: number, gen: number, onDone: () => void) {
    const r = await scheduleAd(adIndex, gen, onDone);
    if (r === "empty" || r === "error") onDone();
  }

  function decode(ctx: AudioContext, url: string): Promise<AudioBuffer> {
    const cache = bufferCacheRef.current;
    const hit = cache.get(url);
    if (hit) return hit;
    const p = fetch(url).then((r) => r.arrayBuffer()).then((a) => ctx.decodeAudioData(a));
    p.catch(() => cache.delete(url));  // don't cache a failed fetch/decode
    cache.set(url, p);
    return p;
  }

  // audio urls for an episode/ad/track (single track, or one clip per spoken line)
  function urlsFor(ep: Episode | undefined): string[] {
    if (!ep) return [];
    if (ep.track) return [ep.track];
    return ep.lines.filter((l) => l.audio).map((l) => l.audio!);
  }

  function prefetch(urls: string[]) {
    const { ctx } = getCtx();
    for (const u of urls) decode(ctx, u).catch(() => { /* ignore prefetch errors */ });
  }

  // Decide the next between-show break NOW (peeking the counter, not consuming it) and warm
  // its audio + the next episode's into the cache, so the transition plays with no gap.
  // The break is committed here and cached on plannedRef; afterShow reuses it verbatim.
  function planAndPrefetch(currentEpIdx: number) {
    prefetch(urlsFor(episodes[(currentEpIdx + 1) % episodes.length]));
    // Plan the break once (peek the counter — afterShow consumes the same n). Surfacing it in
    // "up next" and warming its audio must run on EVERY call, even a replan, so the queue never
    // loses its ad block — hence setBreakAhead lives outside the plan-once guard.
    if (!plannedRef.current) {
      const n = transitionRef.current;
      plannedRef.current = planBreak(currentEpIdx, n);
    }
    const brk = plannedRef.current;
    setBreakAhead({ music: brk.music, ads: brk.block, pos: -1 });
    if (brk.music !== null && music[brk.music]?.track) prefetch([music[brk.music].track!]);
    for (const idx of brk.block) prefetch(urlsFor(ads[idx]));
  }

  async function startInterstitial(musicTrackIdx: number, block: number[], nextEpIdx: number, gen: number) {
    const track = music[musicTrackIdx];
    if (!track?.track) { setAirIdx(nextEpIdx); startEpisode(nextEpIdx); return; }
    const { ctx, analyser } = getCtx();
    await ctx.resume();
    if (gen !== genRef.current) return;
    setMusicIdx(musicTrackIdx);
    setMusicPlaying(true);
    setActiveBlock({ music: musicTrackIdx, ads: block, pos: -1 });  // music leads, block upcoming
    try {
      const buf = await decode(ctx, track.track);
      if (gen !== genRef.current) { setMusicPlaying(false); setMusicIdx(null); return; }
      const sch = makeScheduler(ctx, analyser, ctx.currentTime + 0.1);
      sch.schedule(buf, 0);
      sch.finish(() => {
        if (gen !== genRef.current) return;
        setMusicPlaying(false);
        setMusicIdx(null);
        if (block.length > 0) {
          startAdBlock(block, 0, nextEpIdx, gen);
        } else {
          setAirIdx(nextEpIdx);
          startEpisode(nextEpIdx);
        }
      });
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
    setActiveBlock(null);       // no break airing while a show plays
    plannedRef.current = null;  // replan the next slot fresh for this show
    const ep = episodes[idx];
    const sch = makeScheduler(ctx, analyser, ctx.currentTime + 0.15);

    try {
      if (ep.track) {
        sch.schedule(await decode(ctx, ep.track), 0);
      } else {
        const lines = ep.lines.filter((l) => l.audio);
        const bufs = await Promise.all(lines.map((l) => decode(ctx, l.audio!)));
        if (gen !== genRef.current) return;
        lines.forEach((l, i) => bufs[i] && sch.schedule(bufs[i], l.timestamp ?? 0));
      }
    } catch {
      if (gen === genRef.current) setLoading(false);
      return;
    }
    if (gen !== genRef.current) return;
    setLoading(false);
    sch.finish(() => {
      if (gen !== genRef.current) return;
      const next = (idx + 1) % episodes.length;
      afterShow(idx, next, gen);
    });
    // Warm the next slot's audio (and next episode's) while this show plays → gap-free.
    planAndPrefetch(idx);
  }

  async function togglePlay() {
    if (!startedRef.current) {
      startedRef.current = true;
      setPlaying(true);
      await startEpisode(airIdx);
      return;
    }
    // Context torn down (tab/route remount) — no sources to resume, so restart current track.
    if (!ctxRef.current || ctxRef.current.state === "closed") {
      if (adIdx !== null) await playAdSpot(adIdx);
      else if (musicIdx !== null) await playMusicTrack(musicIdx);
      else { setPlaying(true); await startEpisode(airIdxRef.current); }
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
      if (gen !== genRef.current) { setMusicPlaying(false); setMusicIdx(null); return; }
      const sch = makeScheduler(ctx, analyser, ctx.currentTime + 0.1);
      sch.schedule(buf, 0);
      sch.finish(() => { if (gen === genRef.current) { setMusicPlaying(false); setMusicIdx(null); } });
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
    } else if (ads.length > 0 || music.length > 0) {
      // Skip current show → between-show slot (ad every time, occasional music) then next
      setPlaying(true);
      afterShow(base, next, gen);
    } else {
      // Nothing to slot → skip straight to next episode
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
    if (musicIdx === idx && !musicPlaying && ctx && ctx.state !== "closed") {
      await ctx.resume();
      setMusicPlaying(true);
      return;
    }
    await playMusicTrack(idx);
  }

  // Play a specific ad on demand (the InstaAd house spot) as a standalone one-shot — same
  // scheduling as a between-show block ad (via scheduleAd), but on end it just stops.
  async function playAdSpot(idx: number) {
    const ad = ads[idx];
    const adLines = ad?.lines?.filter((l) => l.audio) ?? [];
    if (!ad || (!ad.track && adLines.length === 0)) return;  // don't tear down current audio for a broken spot
    const { ctx } = getCtx();
    await ctx.resume();
    const gen = ++genRef.current;
    stopSources();
    setPlaying(false);
    setMusicPlaying(false);
    setMusicIdx(null);
    setAdLoading(true);
    // scheduleAd owns adIdx/adPlaying and clears them on end; standalone spot has no onDone.
    await scheduleAd(idx, gen, () => { /* one-shot: nothing to advance */ });
    if (gen === genRef.current) setAdLoading(false);
  }

  async function toggleAdSpot(idx: number) {
    const ctx = ctxRef.current;
    if (adIdx === idx && adPlaying) {
      if (ctx) { await ctx.suspend(); setAdPlaying(false); }
      return;
    }
    if (adIdx === idx && !adPlaying && ctx && ctx.state !== "closed") {
      await ctx.resume();
      setAdPlaying(true);
      return;
    }
    await playAdSpot(idx);
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
    adLoading,
    levels,
    position,
    duration,
    analyserRef,
    volume,
    breakAhead,
    activeBlock,
    setVolume,
    togglePlay,
    tuneTo,
    toggleMusicTrack,
    toggleAdSpot,
    nextTrack,
  };
}
