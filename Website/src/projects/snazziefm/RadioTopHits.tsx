import type { Episode } from "./data/radio";

interface Props {
  music: Episode[];
  musicIdx: number | null;
  musicPlaying: boolean;
  musicLoading: boolean;
  toggleMusicTrack: (idx: number) => Promise<void>;
}

export default function RadioTopHits({ music, musicIdx, musicPlaying, musicLoading, toggleMusicTrack }: Props) {
  return (
    <section className="rl-section rl-guide-hits">
      <h2 className="rl-section-title">
        <span>Top Hits</span>
        <span className="rl-hits-label">Snazzie FM Originals</span>
        <span className="rl-section-rule" />
      </h2>
      <ol className="rl-hits">
        {music.map((track, i) => {
          const isActive = musicIdx === i;
          const isThisPlaying = isActive && musicPlaying;
          const isThisLoading = isActive && musicLoading;
          return (
            <li key={track.slug}>
              <button
                type="button"
                className={`rl-hit${isActive ? " rl-hit-active" : ""}`}
                onClick={() => toggleMusicTrack(i)}
                disabled={isThisLoading}
              >
                <span className="rl-hit-art">
                  {track.coverArt
                    ? <img src={track.coverArt} alt={track.title} className="rl-hit-cover" />
                    : <span className="rl-hit-disc" aria-hidden />}
                  <span className="rl-hit-rank">#{i + 1}</span>
                  <span className="rl-hit-art-overlay" aria-hidden>
                    <span className="rl-hit-play-icon">
                      {isThisLoading ? "⦿" : isThisPlaying ? "❚❚" : "▶"}
                    </span>
                  </span>
                  {isThisPlaying && <span className="rl-hit-playing-badge">NOW PLAYING</span>}
                </span>
                <span className="rl-hit-info">
                  <span className="rl-hit-title">{track.title}</span>
                  {track.description && <span className="rl-hit-desc">{track.description}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
