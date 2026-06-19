// Faux Snazzie FM social posts shown in the "From the Booth" section of /snazziefm.
// Authored by the `social-posts` skill. Each post's photo is rendered locally with
// ideogram4 via `scripts/render-post.py <id> "<imagePrompt>"`, which writes
// public/snazziefm/images/<id>.png and appends a global Studio Ghibli style to the prompt.
//
// Body text markup: **bold** -> <strong>, #hashtag -> styled tag span, emoji literal.
// imagePrompt is scene-only (no art-style line) — the render script adds the Ghibli style.

export interface StationPost {
  id: string;          // kebab slug, also the image basename
  text: string;        // post body with **bold** / #hashtag markup
  imagePrompt: string; // scene-only ideogram4 prompt (render script appends Ghibli style)
  photo: string;       // "/snazziefm/images/<id>.png"
  caption: string;     // figcaption under the photo
  time: string;        // e.g. "9:12 PM"
  likes: string;
  reposts: string;
  replies: string;
}

export const POSTS: StationPost[] = [
  {
    id: "todd-on-the-line",
    text:
      "Day 1,094 of Todd holding the line. He's caller **41,001**, the queue now curves " +
      "through physics, and he says the hold music \"has notes.\" Sal still just wants to " +
      "cancel his Lull trial. We believe in you, Todd. #PleaseStayOnTheLine",
    imagePrompt:
      "A young intern with a headset and a foam coffee cup sits alone in an impossibly " +
      "long waiting room that bends and spirals into the distance against physics, " +
      "endless empty plastic chairs, a glowing \"NOW SERVING 41,001\" board overhead, " +
      "dust motes in warm afternoon light, soft painterly clouds through tall windows, " +
      "cozy and slightly melancholic.",
    photo: "/snazziefm/images/todd-on-the-line.png",
    caption: "Todd, somewhere around caller 41,001, having a lovely time.",
    time: "3:17 AM",
    likes: "9,540",
    reposts: "3,118",
    replies: "742",
  },
  {
    id: "frank-tapes",
    text:
      "BREAKING: after 200-something calls, we finally got **Frank** down to Snazzie " +
      "Studio in person. He brought the tapes. He brought a folder. He brought a second " +
      "folder. Tonight, one on one, no callers. #TheFrankTapes",
    imagePrompt:
      "A weathered older man in a fishing vest sits across a studio table cluttered with " +
      "reel-to-reel tapes and two bulging manila folders, a vintage radio microphone " +
      "between them, warm amber studio lamps, he looks earnest and a little paranoid.",
    photo: "/snazziefm/images/frank-studio.png",
    caption: "Frank, Snazzie Studio, moments before he asked us to unplug the cameras.",
    time: "9:12 PM",
    likes: "4,021",
    reposts: "877",
    replies: "312",
  },
  {
    id: "ronnie-birthday",
    text:
      "HAPPY BIRTHDAY to the smoothest voice on Snazzie FM, our host **Ronnie Delacroix**! " +
      "Another year, zero facts checked. Cake in the booth, on air in five. Call in and " +
      "wish him many happy returns. #HappyBirthdayRonnie 🎉",
    imagePrompt:
      "A charming radio host with a warm smile leans into a vintage microphone in a cozy " +
      "broadcast booth, a small frosted birthday cake with lit candles on the desk beside " +
      "the soundboard, glowing ON AIR sign, warm golden light, celebratory mood.",
    photo: "/snazziefm/images/ronnie-birthday.png",
    caption: "Ronnie, mid-show, refusing to confirm which birthday this is.",
    time: "8:00 PM",
    likes: "6,540",
    reposts: "1,203",
    replies: "488",
  },
];
