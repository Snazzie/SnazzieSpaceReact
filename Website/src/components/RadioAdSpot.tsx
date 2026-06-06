import type { Episode } from "@/data/radio";

interface Props {
  ad: Episode;
  adIndex: number;        // index of this ad within the shared ADS array
  adIdx: number | null;   // currently-airing ad index (rotation or on-demand)
  adPlaying: boolean;
  adLoading: boolean;
  toggleAdSpot: (idx: number) => Promise<void>;
}

// The InstaAd house spot — a "paid message" ad position on the landing page.
// In-universe, InstaAd is the self-serve service businesses use to record their
// own spot over the phone; here it advertises itself. Clicking plays the real
// InstaAd ad clip (the same one that airs in rotation).
export default function RadioAdSpot({ ad, adIndex, adIdx, adPlaying, adLoading, toggleAdSpot }: Props) {
  const isActive = adIdx === adIndex;
  const isThisPlaying = isActive && adPlaying;
  const isThisLoading = isActive && adLoading;

  return (
    <section className="rl-adspot" aria-label="Advertisement">
      <div className="rl-adspot-ribbon">⚠ Paid Message</div>
      <div className="rl-adspot-body">
        <p className="rl-adspot-eyebrow">A word from our sponsor</p>
        <h3 className="rl-adspot-brand">InstaAd</h3>
        <p className="rl-adspot-pitch">
          Got a business? Get on the air <em>today</em>. Call in, record your
          message, and we blast it to thousands of listeners in minutes. No
          studio, no editing, no problem.
        </p>
        <p className="rl-adspot-phone">
          <span className="rl-adspot-phone-icon" aria-hidden>☎</span>
          1&#8209;800&#8209;555&#8209;SNAZ
        </p>
        <button
          type="button"
          className={`rl-adspot-cta${isThisPlaying ? " rl-adspot-cta-on" : ""}`}
          onClick={() => toggleAdSpot(adIndex)}
          disabled={isThisLoading}
          aria-label={isThisPlaying ? "Pause the InstaAd spot" : "Hear the InstaAd spot"}
        >
          <span className="rl-adspot-cta-icon">
            {isThisLoading ? "⦿" : isThisPlaying ? "❚❚" : "▶"}
          </span>
          {isThisLoading ? "Loading…" : isThisPlaying ? "Playing" : "Hear the spot"}
        </button>
        <p className="rl-adspot-fine">
          Your voice on the radio, instantly.{" "}
          <a href="/snazziefm/instaad" className="rl-adspot-tos">Terms and conditions apply.</a>
        </p>
      </div>
    </section>
  );
}
