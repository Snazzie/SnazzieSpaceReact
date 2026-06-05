import truthHour from "./radio/the-truth-hour.json";
import coinOfTheRealm from "./radio/coin-of-the-realm.json";
import machineTalk from "./radio/machine-talk.json";
import healthyLiving from "./radio/healthy-living.json";
import afterDark from "./radio/after-dark.json";
import theSportsDesk from "./radio/the-sports-desk.json";
import thePigeonCrash from "./radio/the-pigeon-crash.json";
import villainHour from "./radio/villain-hour.json";
import theFrankTapes from "./radio/the-frank-tapes.json";

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
};

function episodeFrom(raw: { slug: string; title: string; description: string; lines: unknown[]; track?: string }): Episode {
  return {
    slug:        raw.slug,
    title:       raw.title,
    description: raw.description,
    lines:       raw.lines as TranscriptLine[],
    track:       raw.track,
  };
}

export const MUSIC_TRACKS: Episode[] = [
  {
    slug: "dmv-tuesday-pigeons",
    title: "DMV Tuesday Pigeons",
    description: "A certified banger from the Snazzie FM studio sessions. DMV vibes, pigeon energy.",
    type: "music",
    coverArt: "/images/radio/music/dmv-tuesday-pigeons.jpg",
    lines: [],
    track: "/audio/music/dmv-tuesday-pigeons.mp3",
  },
  {
    slug: "cold-metal-frown",
    title: "Cold Metal Frown",
    description: "Late-night frequencies from the Snazzie FM vault. Plays every night around 2 AM.",
    type: "music",
    coverArt: "/images/radio/music/cold-metal-frown.jpg",
    lines: [],
    track: "/audio/music/cold-metal-frown.mp3",
  },
];

export const EPISODES: Episode[] = [
  episodeFrom(truthHour),
  episodeFrom(coinOfTheRealm),
  episodeFrom(machineTalk),
  episodeFrom(healthyLiving),
  episodeFrom(afterDark),
  episodeFrom(theSportsDesk),
  episodeFrom(thePigeonCrash),
  episodeFrom(villainHour),
  episodeFrom(theFrankTapes),
];
