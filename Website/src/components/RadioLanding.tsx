import { useEffect, useMemo, useRef, useState } from "react";
import type { Episode, CastMember } from "@/data/radio";
import RadioPosts from "./RadioPosts";
import "./RadioLanding.css";

interface Props {
  episodes: Episode[];
  cast: Record<string, CastMember>;
}

// On-air talent shown in the roster (non-caller regulars), in billing order.
const TALENT: { id: string; bio: string }[] = [
  { id: "ronnie", bio: "Your silver-tongued host. Believes everything, doubts nothing, sells it all." },
  { id: "barry", bio: "Co-host and resident skeptic. Sweats when the callers get too specific." },
  { id: "rhonda", bio: "Guest expert on whatever tonight's segment requires. Credentials unverifiable." },
  { id: "todd", bio: "The intern. Talks fast, runs the board, may not be entirely real." },
];

// Fake broadcast schedule — each show gets a slot on the dial.
const SLOTS = [
  "6:00 AM", "9:00 AM", "11:30 AM", "1:00 PM", "3:30 PM",
  "6:00 PM", "8:00 PM", "10:00 PM", "12:00 AM",
];

function initials(name: string) {
  return name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

// A retro portrait slot: shows /images/radio/<id>.png if present, otherwise a
// CSS "headshot" — a tinted spotlight with the talent's monogram.
function Portrait({ member }: { member: CastMember }) {
  const [failed, setFailed] = useState(false);
  return (
    <div
      className="rl-portrait"
      style={{ ["--tint" as string]: member.color }}
    >
      {!failed ? (
        <img
          src={`/images/radio/${member.id}.png`}
          alt={member.name}
          onError={() => setFailed(true)}
          loading="lazy"
        />
      ) : (
        <span className="rl-monogram">{initials(member.name)}</span>
      )}
      <span className="rl-portrait-scan" aria-hidden />
    </div>
  );
}

export default function RadioLanding({ episodes, cast }: Props) {
  // Pretend the station is live: pick a "now on air" show from the wall clock so
  // the page feels broadcast. Cycles through the lineup over the day.
  const initialAir = useMemo(() => {
    const h = new Date().getHours();
    return episodes.length ? Math.floor((h / 24) * episodes.length) % episodes.length : 0;
  }, [episodes.length]);

  // Which show is currently airing. Starts on the clock-based pick; advances as
  // the inline player rolls through the lineup like a real station feed.
  const [airIdx, setAirIdx] = useState(initialAir);
  const onAir = episodes[airIdx];

  // Animated VU meter — a row of bars that jitter like a real level meter.
  const [levels, setLevels] = useState<number[]>(() => Array(14).fill(0.3));
  useEffect(() => {
    let raf = 0;
    let t = 0;
    const tick = () => {
      t += 0.08;
      setLevels((prev) =>
        prev.map((_, i) => {
          const base = 0.45 + 0.4 * Math.sin(t + i * 0.7);
          const jit = 0.15 * Math.sin(t * 3.3 + i * 1.9);
          return Math.max(0.08, Math.min(1, base + jit));
        }),
      );
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Live clock for the receiver readout.
  const [clock, setClock] = useState("");
  useEffect(() => {
    const fmt = () =>
      setClock(
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      );
    fmt();
    const id = setInterval(fmt, 10_000);
    return () => clearInterval(id);
  }, []);

  // ── Inline station feed ──────────────────────────────────────────────
  // TUNE IN plays the on-air show right here (Web Audio, same per-clip
  // scheduling the full player uses) and rolls into the next show when it ends.
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const sourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const genRef = useRef(0);          // bumps each (re)start; stale onended no-ops
  const startedRef = useRef(false);  // audio graph has been started at least once

  const stopSources = () => {
    for (const s of sourcesRef.current) { try { s.onended = null; s.stop(); } catch { /* already stopped */ } }
    sourcesRef.current = [];
  };

  const decode = async (ctx: AudioContext, url: string) => {
    const res = await fetch(url);
    return ctx.decodeAudioData(await res.arrayBuffer());
  };

  async function startEpisode(idx: number) {
    const ctx = ctxRef.current ?? (ctxRef.current = new AudioContext());
    await ctx.resume();
    const gen = ++genRef.current;
    stopSources();
    setLoading(true);
    const ep = episodes[idx];
    const t0 = ctx.currentTime + 0.15;
    let last: AudioBufferSourceNode | null = null;
    let lastEnd = 0;

    const schedule = (buf: AudioBuffer, at: number) => {
      const s = ctx.createBufferSource();
      s.buffer = buf;
      s.connect(ctx.destination);
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
        if (gen !== genRef.current) return;  // superseded while loading
        lines.forEach((l, i) => bufs[i] && schedule(bufs[i], l.timestamp ?? 0));
      }
    } catch {
      setLoading(false);
      return;
    }
    if (gen !== genRef.current) return;
    setLoading(false);
    // When the last clip finishes, roll into the next show.
    if (last) (last as AudioBufferSourceNode).onended = () => {
      if (gen !== genRef.current) return;
      const next = (idx + 1) % episodes.length;
      setAirIdx(next);
      startEpisode(next);
    };
  }

  async function togglePlay() {
    if (!startedRef.current) {
      startedRef.current = true;
      setPlaying(true);
      await startEpisode(airIdx);
      return;
    }
    const ctx = ctxRef.current;
    if (!ctx) return;
    if (playing) { await ctx.suspend(); setPlaying(false); }
    else { await ctx.resume(); setPlaying(true); }
  }

  // Clicking a show in the guide tunes straight to it.
  function tuneTo(idx: number) {
    startedRef.current = true;
    setAirIdx(idx);
    setPlaying(true);
    startEpisode(idx);
  }

  useEffect(() => () => { genRef.current++; stopSources(); ctxRef.current?.close(); }, []);

  return (
    <div className="rl-root">
      <div className="rl-grain" aria-hidden />
      <div className="rl-scanlines" aria-hidden />
      <div className="rl-glow" aria-hidden />

      {/* ── Top ident bar ───────────────────────────────────────────── */}
      <header className="rl-topbar">
        <a href="/" className="rl-back">&larr; snazzie.space</a>
        <div className="rl-onair">
          <span className="rl-onair-dot" />
          ON&nbsp;AIR
        </div>
        <div className="rl-freq">STEREO</div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="rl-hero">
        <div className="rl-marquee">
          <span className="rl-eyebrow">Broadcasting from an undisclosed frequency</span>
          <h1 className="rl-logo">Snazzie&nbsp;FM</h1>
          <p className="rl-tagline">
            All-night call-in radio for a city that won't stop calling.
          </p>
        </div>

        <div className="rl-stage">
          <figure className="rl-hosts">
            <img src="/images/radio/hosts.png" alt="The Snazzie FM hosts live in studio" />
            <figcaption>Live from Snazzie Studio &middot; tonight, like every night</figcaption>
          </figure>

          <div className="rl-receiver">
          {/* dial */}
          <div className="rl-dial">
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
            <div className="rl-readout-row">
              <span className="rl-readout-label">NOW</span>
              <span className="rl-readout-title">{onAir?.title ?? "Snazzie FM"}</span>
            </div>
            <div className="rl-readout-clock">{clock} &middot; STEREO &middot; SNAZZIE FM</div>
          </div>

          {/* VU meter — idles low until the feed is live */}
          <div className="rl-vu" aria-hidden>
            {levels.map((lv, i) => (
              <span
                key={i}
                className="rl-vu-bar"
                style={{ height: `${(playing ? lv : 0.06 + lv * 0.05) * 100}%` }}
              />
            ))}
          </div>

          <button className="rl-tunein" type="button" onClick={togglePlay} disabled={loading}>
            <span className="rl-tunein-icon">{loading ? "⦿" : playing ? "❚❚" : "▶"}</span>
            {loading ? "Tuning…" : playing ? "On Air" : "Tune In"}
          </button>
          </div>
        </div>
      </section>

      {/* ── Now on air ──────────────────────────────────────────────── */}
      {onAir && (
        <section className="rl-now">
          <div className="rl-now-badge"><span className="rl-onair-dot" /> Now on air</div>
          <h2 className="rl-now-title">{onAir.title}</h2>
          <p className="rl-now-desc">{onAir.description}</p>
          <div className="rl-now-actions">
            <button type="button" className="rl-now-link" onClick={() => tuneTo(airIdx)}>
              {playing ? "❚❚ Playing" : "▶ Play this show"}
            </button>
            <a className="rl-now-link rl-now-link-alt" href={`/radio/listen#${onAir.slug}`}>
              Open full player &rarr;
            </a>
          </div>
        </section>
      )}

      {/* ── Schedule / lineup ───────────────────────────────────────── */}
      <section className="rl-section">
        <h2 className="rl-section-title">
          <span>Program Guide</span>
          <span className="rl-section-rule" />
        </h2>
        <ol className="rl-schedule">
          {episodes.map((ep, i) => (
            <li key={ep.slug}>
              <button
                type="button"
                className={`rl-show ${i === airIdx ? "rl-show-live" : ""}`}
                onClick={() => tuneTo(i)}
              >
                <span className="rl-show-time">{SLOTS[i % SLOTS.length]}</span>
                <span className="rl-show-body">
                  <span className="rl-show-title">
                    {ep.title}
                    {i === airIdx && playing && <span className="rl-show-tag">LIVE</span>}
                  </span>
                  <span className="rl-show-desc">{ep.description}</span>
                </span>
                <span className="rl-show-play">{i === airIdx && playing ? "❚❚" : "▶"}</span>
              </button>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Station dispatch (faux social post) ─────────────────────── */}
      <section className="rl-section">
        <h2 className="rl-section-title">
          <span>From the Booth</span>
          <span className="rl-section-rule" />
        </h2>
        <RadioPosts />
      </section>

      {/* ── On-air talent ───────────────────────────────────────────── */}
      <section className="rl-section">
        <h2 className="rl-section-title">
          <span>On-Air Talent</span>
          <span className="rl-section-rule" />
        </h2>
        <div className="rl-talent">
          {TALENT.map(({ id, bio }) => {
            const m = cast[id];
            if (!m) return null;
            return (
              <article key={id} className="rl-card">
                <Portrait member={m} />
                <div className="rl-card-body">
                  <h3 className="rl-card-name">{m.name}</h3>
                  <span className="rl-card-role" style={{ color: m.color }}>{m.role}</span>
                  <p className="rl-card-bio">{bio}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <footer className="rl-footer">
        <span>SNAZZIE FM &middot; All transmissions are fictional</span>
        <a href="/radio/listen">Tune in &rarr;</a>
      </footer>
    </div>
  );
}

