import type { Episode } from "@/data/radio";

interface Props {
  playing: boolean;
  loading: boolean;
  musicIdx: number | null;
  musicPlaying: boolean;
  music: Episode[];
  onAir: Episode | undefined;
  levels: number[];
  clock: string;
  airIdx: number;
  episodes: Episode[];
  togglePlay: () => Promise<void>;
  tuneTo: (idx: number) => void;
}

export default function RadioReceiver({
  playing, loading, musicIdx, musicPlaying, music, onAir,
  levels, clock, airIdx, episodes, togglePlay, tuneTo,
}: Props) {
  const upNext = Array.from({ length: 3 }, (_, i) => episodes[(airIdx + 1 + i) % episodes.length]);

  return (
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
          <span className="rl-readout-label">{musicIdx !== null && musicPlaying ? "♪" : "NOW"}</span>
          <span className="rl-readout-title">
            {musicIdx !== null && musicPlaying
              ? (music[musicIdx]?.title ?? "Music")
              : (onAir?.title ?? "Snazzie FM")}
          </span>
        </div>
        <div className="rl-readout-clock">{clock} &middot; STEREO &middot; SNAZZIE FM</div>
      </div>

      {/* VU meter */}
      <div className="rl-vu" aria-hidden>
        {levels.map((lv, i) => (
          <span
            key={i}
            className="rl-vu-bar"
            style={{ height: `${((playing || musicPlaying) ? lv : 0.06 + lv * 0.05) * 100}%` }}
          />
        ))}
      </div>

      <div className="rl-tunein-row">
        <button className="rl-tunein" type="button" onClick={togglePlay} disabled={loading}>
          <span className="rl-tunein-icon">{loading ? "⦿" : (playing || musicPlaying) ? "❚❚" : "▶"}</span>
          {loading ? "Tuning…" : (playing || musicPlaying) ? "On Air" : "Tune In"}
        </button>
        <button
          className="rl-next"
          type="button"
          onClick={() => tuneTo((airIdx + 1) % episodes.length)}
          disabled={loading}
          title="Next show"
        >
          &#9654;&#9654;
        </button>
      </div>

      <div className="rl-upnext">
        <span className="rl-upnext-label">UP NEXT</span>
        <span className="rl-upnext-list">
          {upNext.map((ep, i) => (
            <span key={ep.slug} className={`rl-upnext-item${i === 0 ? " rl-upnext-item-first" : ""}`}>
              {ep.title}
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}
