import truthHour from "./radio/the-truth-hour.json";

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
  timestamp: number;  // seconds; 0 until audio generated
  duration: number;   // seconds; 0 until audio generated
}

export interface Episode {
  slug: string;
  title: string;
  description: string;
  lines: TranscriptLine[];
  audioPath: string;    // /audio/radio/<slug>.flac
  waveformPath: string; // /audio/radio/<slug>-waveform.json
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

function episodeFrom(raw: typeof truthHour): Episode {
  return {
    slug:         raw.slug,
    title:        raw.title,
    description:  raw.description,
    lines:        raw.lines as TranscriptLine[],
    audioPath:    `/audio/radio/${raw.slug}.flac`,
    waveformPath: `/audio/radio/${raw.slug}-waveform.json`,
  };
}

export const EPISODES: Episode[] = [
  episodeFrom(truthHour),
];
