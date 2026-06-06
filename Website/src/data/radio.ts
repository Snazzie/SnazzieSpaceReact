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
import adDirtNap from "./radio/ad-dirt-nap.json";
import adAwakeForever from "./radio/ad-awake-forever.json";
import adToothy from "./radio/ad-toothy.json";
import adSpareparts from "./radio/ad-spareparts.json";
import adPlummetAir from "./radio/ad-plummet-air.json";
import adDreamWarden from "./radio/ad-dream-warden.json";
import adGhostLedger from "./radio/ad-ghost-ledger.json";
import adLilSustenance from "./radio/ad-lil-sustenance.json";
import adMoatMaster from "./radio/ad-moat-master.json";
import adAirPrime from "./radio/ad-air-prime.json";
import adSplitsville from "./radio/ad-splitsville.json";
import adSugarBeGone from "./radio/ad-sugar-be-gone.json";
import adEternalStay from "./radio/ad-eternal-stay.json";
import adSuePerSaver from "./radio/ad-sue-per-saver.json";
import adPureish from "./radio/ad-pureish.json";
import adForgetMeLots from "./radio/ad-forget-me-lots.json";
import adEmotivault from "./radio/ad-emotivault.json";
import adSwolePatrol from "./radio/ad-swole-patrol.json";
import adSkybury from "./radio/ad-skybury.json";
import adLuckbrand from "./radio/ad-luckbrand.json";
import adPawEquity from "./radio/ad-paw-equity.json";
import adRugcoin from "./radio/ad-rugcoin.json";
import adBurnguard from "./radio/ad-burnguard.json";
import adDocbot from "./radio/ad-docbot.json";
import adGrowfast from "./radio/ad-growfast.json";
import adRentaGuard from "./radio/ad-renta-guard.json";
import adInstavows from "./radio/ad-instavows.json";
import adMeatTube from "./radio/ad-meat-tube.json";
import adForeverface from "./radio/ad-foreverface.json";
import adHonkheal from "./radio/ad-honkheal.json";
import adChensKitchen from "./radio/ad-chens-kitchen.json";
import adInstaad from "./radio/ad-instaad.json";
import adInstaadGag from "./radio/ad-instaad-gag.json";
// Blunders — SPLIT (hard fumble, two numbered takes):
import adSalsPizza1 from "./radio/ad-sals-pizza-1.json";
import adSalsPizza2 from "./radio/ad-sals-pizza-2.json";
import adCarlsCarpets1 from "./radio/ad-carls-carpets-1.json";
import adCarlsCarpets2 from "./radio/ad-carls-carpets-2.json";
import adTheWashHouse1 from "./radio/ad-the-wash-house-1.json";
import adTheWashHouse2 from "./radio/ad-the-wash-house-2.json";
import adMurphysAuto1 from "./radio/ad-murphys-auto-1.json";
import adMurphysAuto2 from "./radio/ad-murphys-auto-2.json";
import adDavesTax1 from "./radio/ad-daves-tax-1.json";
import adDavesTax2 from "./radio/ad-daves-tax-2.json";
import adGregsAppliances1 from "./radio/ad-gregs-appliances-1.json";
import adGregsAppliances2 from "./radio/ad-gregs-appliances-2.json";
import adTonysGym from "./radio/ad-tonys-gym.json";
import adLousLocksmith1 from "./radio/ad-lous-locksmith-1.json";
import adLousLocksmith2 from "./radio/ad-lous-locksmith-2.json";
import adHanksBbq1 from "./radio/ad-hanks-bbq-1.json";
import adHanksBbq2 from "./radio/ad-hanks-bbq-2.json";
import adBrightSmile1 from "./radio/ad-bright-smile-1.json";
import adBrightSmile2 from "./radio/ad-bright-smile-2.json";
import adMaxinesSalon1 from "./radio/ad-maxines-salon-1.json";
import adMaxinesSalon2 from "./radio/ad-maxines-salon-2.json";
import adRapidPlumbing1 from "./radio/ad-rapid-plumbing-1.json";
import adRapidPlumbing2 from "./radio/ad-rapid-plumbing-2.json";
import adVincesShoes1 from "./radio/ad-vinces-shoes-1.json";
import adVincesShoes2 from "./radio/ad-vinces-shoes-2.json";
import adSunnyDaycare1 from "./radio/ad-sunny-daycare-1.json";
import adSunnyDaycare2 from "./radio/ad-sunny-daycare-2.json";
import adFranksBait1 from "./radio/ad-franks-bait-1.json";
import adFranksBait2 from "./radio/ad-franks-bait-2.json";
import adGlamourNails1 from "./radio/ad-glamour-nails-1.json";
import adGlamourNails2 from "./radio/ad-glamour-nails-2.json";
import adBigMikesSubs1 from "./radio/ad-big-mikes-subs-1.json";
import adBigMikesSubs2 from "./radio/ad-big-mikes-subs-2.json";
// Blunders — LONG (one continuous interrupted take):
import adPetesHardware from "./radio/ad-petes-hardware.json";
import adDonnasDiner from "./radio/ad-donnas-diner.json";
import adCornerBakery from "./radio/ad-corner-bakery.json";
import adVicsGarage from "./radio/ad-vics-garage.json";
import adTinyTots from "./radio/ad-tiny-tots.json";
import adLarrysElectronics from "./radio/ad-larrys-electronics.json";

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
  type?: "episode" | "music" | "ad";
  coverArt?: string;  // /images/radio/music/<slug>.jpg — album art for music tracks
  lines: TranscriptLine[];
  track?: string;  // single whole-episode file (Dia); when set, player uses one source
  music?: string;  // slug of the music track queued after this episode (else random)
  blunder?: boolean;  // ads only: a "blooper" spot where someone flubs their own recording
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
  "ad-ann-deep":   { id: "ad-ann-deep",     name: "Deep Pitchman",     color: "#5856d6", role: "Guest Expert"  },
  "ad-ann-gravel": { id: "ad-ann-gravel",   name: "Gravel Pitchman",   color: "#8e8e93", role: "Guest Expert"  },
  "ad-ann-smooth": { id: "ad-ann-smooth",   name: "Smooth Pitchman",   color: "#af52de", role: "Guest Expert"  },
  "ad-ann-nasal":  { id: "ad-ann-nasal",    name: "Nasal Pitchman",    color: "#ff2d55", role: "Guest Expert"  },
  "ad-ann-shouty": { id: "ad-ann-shouty",   name: "Shouty Pitchman",   color: "#ffcc00", role: "Guest Expert"  },
  "ad-ann-chipper":{ id: "ad-ann-chipper",  name: "Chipper Pitchman",  color: "#64d2ff", role: "Guest Expert"  },
};

// Episode slug → linked music track slug. Episodes without an entry play a random track.
const EPISODE_MUSIC: Record<string, string> = {
  "villain-hour": "villain-open-mic",
  "the-pigeon-crash": "pigeon-crash",
  "the-truth-hour": "nebraskas-watchin",
};

type RawShow = { slug: string; title: string; description: string; lines: unknown[]; track?: string; blunder?: boolean };

function episodeFrom(raw: RawShow): Episode {
  return {
    slug:        raw.slug,
    title:       raw.title,
    description: raw.description,
    type:        "episode",
    lines:       raw.lines as TranscriptLine[],
    track:       raw.track,
    music:       EPISODE_MUSIC[raw.slug],
  };
}

// Ads are their own kind of show: tagged `type: "ad"`, never linked to a music track.
// Kept separate from episodeFrom so the distinction is explicit at the call site.
// Ads split by production type: "Pro" (professionally announced) vs "InstaAd" (recorded
// by the business owner via the self-serve InstaAd service — the `blunder` flag marks these).
// Each is numbered PER BUSINESS by take (recording order): the take number is the trailing
// "-N" on the slug (InstaAd fumbles split into -1/-2); single-take spots have no suffix and
// are take #1. Any legacy "#N" baked into the source title is stripped before the tag.
function adFrom(raw: RawShow): Episode {
  const base = raw.title.replace(/\s*#\d+\s*$/, "");
  const take = raw.slug.match(/-(\d+)$/)?.[1] ?? "1";
  const label = raw.blunder ? "InstaAd" : "Pro";
  return {
    slug:        raw.slug,
    title:       `${base} (${label} #${take})`,
    description: raw.description,
    type:        "ad",
    lines:       raw.lines as TranscriptLine[],
    track:       raw.track,
    blunder:     raw.blunder,
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
  {
    slug: "nebraskas-watchin",
    title: "Nebraska's Watchin'",
    description: "Outlaw country with punk teeth — Frank's pigeon gospel, set to a stomp-clap backbeat.",
    type: "music",
    coverArt: "/images/radio/music/nebraskas-watchin.png",
    lines: [],
    track: "/audio/music/nebraskas-watchin.mp3",
  },
];

const STANDARD_ADS: Episode[] = [
  adSootheMaster, adLiquidRage, adBargainSurgery, adInstacash, adWhiskerChunks,
  adDirtNap, adAwakeForever, adToothy, adSpareparts, adPlummetAir,
  adDreamWarden, adGhostLedger, adLilSustenance, adMoatMaster, adAirPrime,
  adSplitsville, adSugarBeGone, adEternalStay, adSuePerSaver, adPureish,
  adForgetMeLots, adEmotivault, adSwolePatrol, adSkybury, adLuckbrand,
  adPawEquity, adRugcoin, adBurnguard, adDocbot, adGrowfast,
  adRentaGuard, adInstavows, adMeatTube, adForeverface, adHonkheal,
  adChensKitchen, adInstaad, adInstaadGag,
].map(adFrom);

// Blunder ads: local owners flubbing their own InstaAd recording. Tagged
// `blunder: true`; aired in the same rotation but grouped as their own category.
export const BLUNDER_ADS: Episode[] = [
  // SPLIT — hard fumbles, two takes per business (Blunder #1 / #2 from the slug suffix)
  adSalsPizza1, adSalsPizza2, adCarlsCarpets1, adCarlsCarpets2,
  adTheWashHouse1, adTheWashHouse2, adMurphysAuto1, adMurphysAuto2,
  adDavesTax1, adDavesTax2, adGregsAppliances1, adGregsAppliances2,
  adTonysGym, adLousLocksmith1, adLousLocksmith2,
  adHanksBbq1, adHanksBbq2, adBrightSmile1, adBrightSmile2,
  adMaxinesSalon1, adMaxinesSalon2, adRapidPlumbing1, adRapidPlumbing2,
  adVincesShoes1, adVincesShoes2, adSunnyDaycare1, adSunnyDaycare2,
  adFranksBait1, adFranksBait2, adGlamourNails1, adGlamourNails2,
  adBigMikesSubs1, adBigMikesSubs2,
  // LONG — one continuous interrupted take
  adPetesHardware, adDonnasDiner, adCornerBakery,
  adVicsGarage, adTinyTots, adLarrysElectronics,
].map(adFrom);

// Everything that airs in the ad rotation (standard spots + blunders).
export const ADS: Episode[] = [...STANDARD_ADS, ...BLUNDER_ADS];

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
