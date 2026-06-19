import { useState, type ReactNode } from "react";
import { POSTS } from "./data/radio-posts";

// Parse post body markup into React nodes: **bold** -> <strong>, #hashtag -> tag span.
// Emoji and all other characters pass through as plain text. A lone "#" or unmatched
// "**" stays literal.
export function renderPostText(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let key = 0;
  // split() on a capturing regex interleaves: even indices = outside, odd = bold capture.
  text.split(/\*\*(.+?)\*\*/g).forEach((piece, i) => {
    if (i % 2 === 1) {
      out.push(<strong key={key++}>{piece}</strong>);
      return;
    }
    // plain segment — split out #hashtags
    piece.split(/(#[A-Za-z0-9_]+)/g).forEach((seg) => {
      if (!seg) return;
      if (/^#[A-Za-z0-9_]+$/.test(seg)) {
        out.push(<span className="rl-post-tag" key={key++}>{seg}</span>);
      } else {
        out.push(<span key={key++}>{seg}</span>);
      }
    });
  });
  return out;
}

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
          <p className="rl-post-text">{renderPostText(p.text)}</p>
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
