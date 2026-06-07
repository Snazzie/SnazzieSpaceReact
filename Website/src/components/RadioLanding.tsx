import { useEffect, useState, type CSSProperties } from "react";
import type { Episode, CastMember } from "@/data/radio";
import { useRadioAudio } from "./useRadioAudio";
import RadioReceiver from "./RadioReceiver";
import RadioTopHits from "./RadioTopHits";
import RadioAdSpot from "./RadioAdSpot";
import RadioPosts from "./RadioPosts";
import "./RadioLanding.css";

interface Props {
  episodes: Episode[];
  music?: Episode[];
  ads?: Episode[];
  cast: Record<string, CastMember>;
}

const TALENT: { id: string; bio: string }[] = [
  { id: "ronnie", bio: "Your silver-tongued host. Believes everything, doubts nothing, sells it all." },
  { id: "barry", bio: "Co-host and resident skeptic. Sweats when the callers get too specific." },
  { id: "rhonda", bio: "Guest expert on whatever tonight's segment requires. Credentials unverifiable." },
  { id: "todd", bio: "The intern. Talks fast, runs the board, may not be entirely real." },
];

const SLOTS = [
  "MON · 8:00 PM", "TUE · 8:30 PM", "WED · 9:00 PM", "THU · 9:30 PM", "FRI · 8:00 PM",
  "SAT · 9:00 PM", "SUN · 8:30 PM", "MON · 10:00 PM", "TUE · 9:00 PM",
];

const EPISODES_PER_PAGE = 10;

function fmtTime(s: number) {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

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

export default function RadioLanding({ episodes, music = [], ads = [], cast }: Props) {
  const audio = useRadioAudio(episodes, music, ads);
  const onAir = episodes[audio.airIdx];
  const adSpotIdx = ads.findIndex((a) => a.slug === "ad-instaad");
  const [currentPage, setCurrentPage] = useState(0);

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

        <div className="rl-topbar-center">
          <div className="rl-onair">
            <span className="rl-onair-dot" />
            ON&nbsp;AIR
          </div>

          {/* Mini player */}
          <div className="rl-mini-player">
            <button
              type="button"
              className="rl-mini-play"
              onClick={audio.togglePlay}
              aria-label={audio.playing || audio.musicPlaying || audio.adPlaying ? "Pause" : "Play"}
            >
              {audio.loading ? (
                <span className="rl-mini-spinner" />
              ) : audio.playing || audio.musicPlaying || audio.adPlaying ? (
                "❚❚"
              ) : (
                "▶"
              )}
            </button>
            <button
              type="button"
              className="rl-mini-play"
              onClick={audio.nextTrack}
              aria-label="Next"
            >
              ▶▶
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={audio.volume}
              onChange={(e) => audio.setVolume(Number(e.target.value))}
              aria-label="Volume"
              className="rl-mini-vol"
            />
            <span className="rl-mini-title">
              {audio.adPlaying && audio.adIdx !== null
                ? (ads[audio.adIdx]?.title ?? "Advertisement")
                : audio.musicIdx !== null
                ? (music[audio.musicIdx]?.title ?? "Music break")
                : (episodes[audio.airIdx]?.title ?? "On air")}
            </span>
            {audio.duration > 0 && (
              <span className="rl-mini-time">
                {fmtTime(audio.position)} / {fmtTime(audio.duration)}
              </span>
            )}
            <div className="rl-mini-bars" aria-hidden>
              {audio.levels.slice(0, 8).map((v, i) => (
                <span
                  key={i}
                  className="rl-mini-bar"
                  style={{ "--h": `${Math.round(v * 100)}%` } as CSSProperties}
                />
              ))}
            </div>
          </div>
        </div>

        <a href="/snazziefm/behindthescenes" className="rl-bts-link">See Tech Behind &rarr;</a>
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
            <img src="/images/radio/hosts.webp" alt="The Snazzie FM hosts live in studio" width={1200} height={675} fetchPriority="high" />
            <figcaption>Live from Snazzie Studio &middot; tonight, like every night</figcaption>
          </figure>

          <RadioReceiver
            playing={audio.playing}
            loading={audio.loading}
            musicIdx={audio.musicIdx}
            musicPlaying={audio.musicPlaying}
            music={music}
            adIdx={audio.adIdx}
            adPlaying={audio.adPlaying}
            ads={ads}
            breakAhead={audio.breakAhead}
            activeBlock={audio.activeBlock}
            onAir={onAir}
            levels={audio.levels}
            clock={clock}
            airIdx={audio.airIdx}
            episodes={episodes}
            analyserRef={audio.analyserRef}
            volume={audio.volume}
            setVolume={audio.setVolume}
            togglePlay={audio.togglePlay}
            tuneTo={audio.tuneTo}
            toggleMusicTrack={audio.toggleMusicTrack}
            nextTrack={audio.nextTrack}
          />
        </div>
      </section>

      {/* ── Now on air  +  sponsor spot ─────────────────────────────── */}
      <div className="rl-now-row">
       <div className="rl-now-col">
        {(onAir || (audio.musicIdx !== null && audio.musicPlaying) || (audio.adIdx !== null && audio.adPlaying)) && (
        <section className="rl-now">
          {audio.adIdx !== null && audio.adPlaying ? (
            <>
              <div className="rl-now-badge"><span className="rl-onair-dot" /> ⚠ Advertisement</div>
              <h2 className="rl-now-title">{ads[audio.adIdx]?.title ?? "Advertisement"}</h2>
              <p className="rl-now-desc">{ads[audio.adIdx]?.description ?? ""}</p>
              <div className="rl-now-actions">
                <button type="button" className="rl-now-link" onClick={audio.nextTrack}>
                  Skip ad &rarr;
                </button>
              </div>
            </>
          ) : audio.musicIdx !== null && audio.musicPlaying ? (
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
              <div className="rl-now-badge"><span className="rl-onair-dot" /> Now playing</div>
              <h2 className="rl-now-title">{onAir.title}</h2>
              <p className="rl-now-desc">{onAir.description}</p>
              <div className="rl-now-actions">
                <button type="button" className="rl-now-link" onClick={() => audio.tuneTo(audio.airIdx)}>
                  {audio.playing ? "❚❚ Playing" : "▶ Play this show"}
                </button>
              </div>
            </>
          )}
        </section>
        )}
       </div>
        {adSpotIdx >= 0 && (
          <RadioAdSpot
            ad={ads[adSpotIdx]}
            adIndex={adSpotIdx}
            adIdx={audio.adIdx}
            adPlaying={audio.adPlaying}
            adLoading={audio.adLoading}
            toggleAdSpot={audio.toggleAdSpot}
          />
        )}
      </div>

      {/* ── Schedule + Top Hits side-by-side ────────────────────────── */}
      <div className="rl-guide-row">
        <section className="rl-section rl-guide-main">
          <h2 className="rl-section-title">
            <span>Program Guide</span>
            <span className="rl-section-rule" />
          </h2>
          <ol className="rl-schedule">
            {episodes
              .slice(currentPage * EPISODES_PER_PAGE, (currentPage + 1) * EPISODES_PER_PAGE)
              .map((ep, localI) => {
                const globalI = currentPage * EPISODES_PER_PAGE + localI;
                return (
                  <li key={ep.slug}>
                    <button
                      type="button"
                      className={`rl-show ${globalI === audio.airIdx ? "rl-show-live" : ""}`}
                      onClick={() => audio.tuneTo(globalI)}
                    >
                      <span className="rl-show-time">{SLOTS[globalI % SLOTS.length]}</span>
                      <span className="rl-show-body">
                        <span className="rl-show-title">
                          {ep.title}
                          {globalI === audio.airIdx && audio.playing && <span className="rl-show-tag">NOW PLAYING</span>}
                        </span>
                        <span className="rl-show-desc">{ep.description}</span>
                      </span>
                      <span className="rl-show-play">{globalI === audio.airIdx && audio.playing ? "❚❚" : "▶"}</span>
                    </button>
                  </li>
                );
              })}
          </ol>
          {episodes.length > EPISODES_PER_PAGE && (
            <div className="rl-pagination">
              <button
                type="button"
                className="rl-pagination-btn"
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
              >
                ← Prev
              </button>
              <span className="rl-pagination-info">
                Page {currentPage + 1} of {Math.ceil(episodes.length / EPISODES_PER_PAGE)}
              </span>
              <button
                type="button"
                className="rl-pagination-btn"
                onClick={() =>
                  setCurrentPage(
                    Math.min(
                      Math.ceil(episodes.length / EPISODES_PER_PAGE) - 1,
                      currentPage + 1
                    )
                  )
                }
                disabled={currentPage >= Math.ceil(episodes.length / EPISODES_PER_PAGE) - 1}
              >
                Next →
              </button>
            </div>
          )}
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
        <span>
          SNAZZIE FM &middot; All transmissions are fictional
          <span className="rl-footer-note">
            Every Snazzie FM Original references a program &mdash; listen in on the lyrics.
          </span>
        </span>
        <a href="/snazziefm/behindthescenes" className="rl-bts-link">See Tech Behind &rarr;</a>
      </footer>
    </div>
  );
}
