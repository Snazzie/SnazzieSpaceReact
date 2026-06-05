import { useEffect, useState } from "react";
import type { Episode, CastMember } from "@/data/radio";
import { useRadioAudio } from "./useRadioAudio";
import RadioReceiver from "./RadioReceiver";
import RadioTopHits from "./RadioTopHits";
import RadioPosts from "./RadioPosts";
import "./RadioLanding.css";

interface Props {
  episodes: Episode[];
  music?: Episode[];
  cast: Record<string, CastMember>;
}

const TALENT: { id: string; bio: string }[] = [
  { id: "ronnie", bio: "Your silver-tongued host. Believes everything, doubts nothing, sells it all." },
  { id: "barry", bio: "Co-host and resident skeptic. Sweats when the callers get too specific." },
  { id: "rhonda", bio: "Guest expert on whatever tonight's segment requires. Credentials unverifiable." },
  { id: "todd", bio: "The intern. Talks fast, runs the board, may not be entirely real." },
];

const SLOTS = [
  "6:00 AM", "9:00 AM", "11:30 AM", "1:00 PM", "3:30 PM",
  "6:00 PM", "8:00 PM", "10:00 PM", "12:00 AM",
];

function initials(name: string) {
  return name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function Portrait({ member }: { member: CastMember }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="rl-portrait" style={{ ["--tint" as string]: member.color }}>
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

export default function RadioLanding({ episodes, music = [], cast }: Props) {
  const audio = useRadioAudio(episodes, music);
  const onAir = episodes[audio.airIdx];

  const [clock, setClock] = useState("");
  useEffect(() => {
    const fmt = () =>
      setClock(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    fmt();
    const id = setInterval(fmt, 10_000);
    return () => clearInterval(id);
  }, []);

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

          <RadioReceiver
            playing={audio.playing}
            loading={audio.loading}
            musicIdx={audio.musicIdx}
            musicPlaying={audio.musicPlaying}
            music={music}
            onAir={onAir}
            levels={audio.levels}
            clock={clock}
            airIdx={audio.airIdx}
            episodes={episodes}
            togglePlay={audio.togglePlay}
          />
        </div>
      </section>

      {/* ── Now on air ──────────────────────────────────────────────── */}
      {(onAir || (audio.musicIdx !== null && audio.musicPlaying)) && (
        <section className="rl-now">
          {audio.musicIdx !== null && audio.musicPlaying ? (
            <>
              <div className="rl-now-badge"><span className="rl-onair-dot" /> ♪ Music break</div>
              <h2 className="rl-now-title">{music[audio.musicIdx]?.title ?? "Music"}</h2>
              <p className="rl-now-desc">{music[audio.musicIdx]?.description ?? ""}</p>
              <div className="rl-now-actions">
                <button type="button" className="rl-now-link" onClick={() => audio.toggleMusicTrack(audio.musicIdx!)}>
                  ❚❚ Playing
                </button>
              </div>
            </>
          ) : onAir && (
            <>
              <div className="rl-now-badge"><span className="rl-onair-dot" /> Now on air</div>
              <h2 className="rl-now-title">{onAir.title}</h2>
              <p className="rl-now-desc">{onAir.description}</p>
              <div className="rl-now-actions">
                <button type="button" className="rl-now-link" onClick={() => audio.tuneTo(audio.airIdx)}>
                  {audio.playing ? "❚❚ Playing" : "▶ Play this show"}
                </button>
                <a className="rl-now-link rl-now-link-alt" href={`/radio/listen#${onAir.slug}`}>
                  Open full player &rarr;
                </a>
              </div>
            </>
          )}
        </section>
      )}

      {/* ── Schedule + Top Hits side-by-side ────────────────────────── */}
      <div className="rl-guide-row">
        <section className="rl-section rl-guide-main">
          <h2 className="rl-section-title">
            <span>Program Guide</span>
            <span className="rl-section-rule" />
          </h2>
          <ol className="rl-schedule">
            {episodes.map((ep, i) => (
              <li key={ep.slug}>
                <button
                  type="button"
                  className={`rl-show ${i === audio.airIdx ? "rl-show-live" : ""}`}
                  onClick={() => audio.tuneTo(i)}
                >
                  <span className="rl-show-time">{SLOTS[i % SLOTS.length]}</span>
                  <span className="rl-show-body">
                    <span className="rl-show-title">
                      {ep.title}
                      {i === audio.airIdx && audio.playing && <span className="rl-show-tag">LIVE</span>}
                    </span>
                    <span className="rl-show-desc">{ep.description}</span>
                  </span>
                  <span className="rl-show-play">{i === audio.airIdx && audio.playing ? "❚❚" : "▶"}</span>
                </button>
              </li>
            ))}
          </ol>
        </section>

        {music.length > 0 && (
          <RadioTopHits
            music={music}
            musicIdx={audio.musicIdx}
            musicPlaying={audio.musicPlaying}
            musicLoading={audio.musicLoading}
            toggleMusicTrack={audio.toggleMusicTrack}
          />
        )}
      </div>

      {/* ── Station dispatch ────────────────────────────────────────── */}
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
