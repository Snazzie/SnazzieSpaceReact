import { useState, type ReactNode } from "react";

// A faux Snazzie FM social post shown in the "From the Booth" section.
interface StationPost {
  id: string;
  text: ReactNode;       // post body (allows <strong>/hashtag markup)
  photo: string;         // /images/radio/<file>.png
  caption: string;
  time: string;          // e.g. "11:58 PM"
  likes: string;
  reposts: string;
  replies: string;
}

const POSTS: StationPost[] = [
  {
    id: "frank-tapes",
    text: (
      <>
        BREAKING: after 200-something calls, we finally got <strong>Frank</strong> down to
        Snazzie Studio in person. He brought the tapes. He brought a folder. He brought a second
        folder. Tonight, one on one, no callers. <span className="rl-post-tag">#TheFrankTapes</span>
      </>
    ),
    photo: "/images/radio/frank-studio.png",
    caption: "Frank, Snazzie Studio, moments before he asked us to unplug the cameras.",
    time: "11:58 PM",
    likes: "4,021",
    reposts: "877",
    replies: "312",
  },
  {
    id: "ronnie-birthday",
    text: (
      <>
        HAPPY BIRTHDAY to the smoothest voice on Snazzie FM, our host{" "}
        <strong>Ronnie Delacroix</strong>! Another year, zero facts checked. Cake in the booth,
        on air in five. Call in and wish him many happy returns.{" "}
        <span className="rl-post-tag">#HappyBirthdayRonnie</span> &#127881;
      </>
    ),
    photo: "/images/radio/ronnie-birthday.png",
    caption: "Ronnie, mid-show, refusing to confirm which birthday this is.",
    time: "8:00 PM",
    likes: "6,540",
    reposts: "1,203",
    replies: "488",
  },
];

// Photo slot — shows the image if present, else a labelled "film still"
// placeholder so the post still reads while the photo is sourced.
function PostPhoto({ src, caption }: { src: string; caption: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <figure className="rl-post-photo">
      {!failed ? (
        <img src={src} alt={caption} onError={() => setFailed(true)} loading="lazy" />
      ) : (
        <div className="rl-post-photo-ph">
          <span className="rl-post-photo-icon">&#128247;</span>
          <span>Photo dropping soon</span>
        </div>
      )}
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

export default function RadioPosts() {
  return (
    <div className="rl-posts">
      {POSTS.map((p) => (
        <article className="rl-post" key={p.id}>
          <div className="rl-post-head">
            <span className="rl-post-avatar">FM</span>
            <div className="rl-post-id">
              <span className="rl-post-name">Snazzie&nbsp;FM <span className="rl-post-check">&#10003;</span></span>
              <span className="rl-post-handle">@snazziefm</span>
            </div>
            <span className="rl-post-bird">&#9835;</span>
          </div>
          <p className="rl-post-text">{p.text}</p>
          <PostPhoto src={p.photo} caption={p.caption} />
          <div className="rl-post-meta">
            <span>{p.time} &middot; Snazzie FM</span>
            <span className="rl-post-stats">
              <span>&#9825; {p.likes}</span><span>&#8635; {p.reposts}</span><span>&#128172; {p.replies}</span>
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}
