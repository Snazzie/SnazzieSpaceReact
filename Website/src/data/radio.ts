import truthHour from "./radio/the-truth-hour.json";
import coinOfTheRealm from "./radio/coin-of-the-realm.json";
import machineTalk from "./radio/machine-talk.json";
import healthyLiving from "./radio/healthy-living.json";
import afterDark from "./radio/after-dark.json";
import theSportsDesk from "./radio/the-sports-desk.json";
import thePigeonCrash from "./radio/the-pigeon-crash.json";
import villainHour from "./radio/villain-hour.json";
import theFrankTapes from "./radio/the-frank-tapes.json";
import theCatSpecial from "./radio/the-cat-special.json";
import adSootheMaster from "./radio/ad-soothe-master.json";
import adLiquidRage from "./radio/ad-liquid-rage.json";
import adBargainSurgery from "./radio/ad-bargain-surgery.json";
import adInstacash from "./radio/ad-instacash.json";
import adWhiskerChunks from "./radio/ad-whisker-chunks.json";

export interface CastMember {
  id: string;
  name: string;
  color: string;
  role: "Host" | "Co-Host" | "Guest Expert" | "Intern" | "Caller";
}

export interface TranscriptLine {
  speaker: string;
  text: string;
  overlap?: number;
  timestamp: number;  // seconds; start on the shared timeline (0 until generated)
  duration: number;   // seconds; clip length (0 until generated)
  audio?: string;     // /audio/radio/<slug>/<i>.flac — this line's own clip
}

export interface Episode {
  slug: string;
  title: string;
  description: string;
  type?: "episode" | "music";
  coverArt?: string;  // /images/radio/music/<slug>.jpg — album art for music tracks
  lines: TranscriptLine[];
  track?: string;  // single whole-episode file (Dia); when set, player uses one source
  music?: string;  // slug of the music track queued after this episode (else random)
}

export const CAST: Record<string, CastMember> = {
  ronnie:          { id: "ronnie",          name: "Ronnie Delacroix", color: "#ff6b00", role: "Host"         },
  barry:           { id: "barry",           name: "Barry Fitch",      color: "#4ecdc4", role: "Co-Host"      },
  rhonda:          { id: "rhonda",          name: "Rhonda K.",         color: "#fd79a8", role: "Guest Expert" },
  todd:            { id: "todd",            name: "Todd",              color: "#55efc4", role: "Intern"       },
  "caller-steve":  { id: "caller-steve",    name: "Steve",             color: "#a29bfe", role: "Caller"       },
  "caller-gary":   { id: "caller-gary",     name: "Gary",              color: "#a29bfe", role: "Caller"       },
  "caller-linda":  { id: "caller-linda",    name: "Linda",             color: "#a29bfe", role: "Caller"       },
  "caller-chad":   { id: "caller-chad",     name: "Chad",              color: "#a29bfe", role: "Caller"       },
  "caller-mildred":{ id: "caller-mildred",  name: "Mildred",           color: "#a29bfe", role: "Caller"       },
  "caller-darnell":{ id: "caller-darnell",  name: "Darnell",           color: "#a29bfe", role: "Caller"       },
  "caller-patricia":{ id: "caller-patricia",name: "Patricia",          color: "#a29bfe", role: "Caller"       },
  "caller-winston":{ id: "caller-winston",  name: "Winston",           color: "#a29bfe", role: "Caller"       },
  "caller-kim":    { id: "caller-kim",      name: "Kim",               color: "#a29bfe", role: "Caller"       },
  "caller-frank":  { id: "caller-frank",    name: "Frank",             color: "#a29bfe", role: "Caller"       },
  "caller-chen":   { id: "caller-chen",     name: "Mr. Chen",          color: "#e17055", role: "Caller"       },
  "cat":           { id: "cat",             name: "Cat",               color: "#ffeaa7", role: "Caller"       },
  "cat-loud":      { id: "cat-loud",        name: "Cat",               color: "#ffeaa7", role: "Caller"       },
  "caller-bg":     { id: "caller-bg",       name: "Caller's end",      color: "#b2956a", role: "Caller BG"    },
  "phone":         { id: "phone",           name: "Phone",             color: "#636e72", role: "Caller"       },
  "ad-announcer":  { id: "ad-announcer",    name: "Announcer",         color: "#f6c945", role: "Guest Expert"  },
  "ad-disclaimer": { id: "ad-disclaimer",   name: "Fine Print",        color: "#9aa0a6", role: "Guest Expert"  },
  "ad-ann-rage":   { id: "ad-ann-rage",     name: "Rage Pitchman",     color: "#ff3b30", role: "Guest Expert"  },
  "ad-ann-surgery":{ id: "ad-ann-surgery",  name: "Surgery Pitchman",  color: "#34c759", role: "Guest Expert"  },
  "ad-ann-cash":   { id: "ad-ann-cash",     name: "Cash Pitchman",     color: "#30b0c7", role: "Guest Expert"  },
  "ad-ann-cat":    { id: "ad-ann-cat",      name: "Cat Pitchman",      color: "#ff9500", role: "Guest Expert"  },
};

// Episode slug → linked music track slug. Episodes without an entry play a random track.
const EPISODE_MUSIC: Record<string, string> = {
  "villain-hour": "villain-open-mic",
  "the-pigeon-crash": "pigeon-crash",
};

function episodeFrom(raw: { slug: string; title: string; description: string; lines: unknown[]; track?: string }): Episode {
  return {
    slug:        raw.slug,
    title:       raw.title,
    description: raw.description,
    lines:       raw.lines as TranscriptLine[],
    track:       raw.track,
    music:       EPISODE_MUSIC[raw.slug],
  };
}

export const MUSIC_TRACKS: Episode[] = [
  // Villain Open Mic sits first so it queues right after Villain Hour (episodes[0]),
  // since the interstitial after episode i is music[i % music.length].
  {
    slug: "villain-open-mic",
    title: "Villain Open Mic",
    description: "Live from the rain-slick streets — every caller's a villain, every line's a confession.",
    type: "music",
    coverArt: "/images/radio/music/villain-open-mic.jpg",
    lines: [],
    track: "/audio/music/villain-open-mic.mp3",
  },
  {
    slug: "pigeon-crash",
    title: "Pigeon Crash",
    description: "A certified banger from the Snazzie FM studio sessions. DMV vibes, pigeon energy.",
    type: "music",
    coverArt: "/images/radio/music/dmv-tuesday-pigeons.jpg",
    lines: [],
    track: "/audio/music/dmv-tuesday-pigeons.mp3",
  },
  {
    slug: "cold-metal-frown",
    title: "Cold Metal Frown",
    description: "Late-night frequencies from the Snazzie FM vault. Cold, mechanical, and a little wrong.",
    type: "music",
    coverArt: "/images/radio/music/cold-metal-frown.jpg",
    lines: [],
    track: "/audio/music/cold-metal-frown.mp3",
  },
  {
    slug: "orange-slices-union-job",
    title: "The Orange Slices (Union Job)",
    description: "Fresh off the Snazzie FM press. Citrus-funk with a working-class chip on its shoulder.",
    type: "music",
    coverArt: "/images/radio/music/orange-slices-union-job.jpg",
    lines: [],
    track: "/audio/music/orange-slices-union-job.mp3",
  },
];

export const ADS: Episode[] = [
  episodeFrom(adSootheMaster),
  episodeFrom(adLiquidRage),
  episodeFrom(adBargainSurgery),
  episodeFrom(adInstacash),
  episodeFrom(adWhiskerChunks),
];

export const EPISODES: Episode[] = [
  episodeFrom(villainHour),
  episodeFrom(truthHour),
  episodeFrom(coinOfTheRealm),
  episodeFrom(machineTalk),
  episodeFrom(healthyLiving),
  episodeFrom(afterDark),
  episodeFrom(theSportsDesk),
  episodeFrom(thePigeonCrash),
  episodeFrom(theFrankTapes),
  episodeFrom(theCatSpecial),
];
