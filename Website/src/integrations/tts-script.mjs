import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ARTICLES_DIR = join(__dirname, '../content/articles');
const AUDIO_DIR = join(__dirname, '../../public/audio');

function removeSkipBlocks(content) {
  const result = [];
  let i = 0;
  while (i < content.length) {
    const tagMatch = content.slice(i).match(/^<(\w+)(?:\s[^>]*)?\s+data-tts-skip(?:\s[^>]*)?\s*>/);
    if (tagMatch) {
      const tagName = tagMatch[1];
      i += tagMatch[0].length;
      let depth = 1;
      while (i < content.length && depth > 0) {
        const closeMatch = content.slice(i).match(new RegExp(`^</${tagName}>`));
        const openMatch = content.slice(i).match(new RegExp(`^<${tagName}[\\s>]`));
        if (closeMatch) {
          depth--;
          i += closeMatch[0].length;
        } else if (openMatch) {
          depth++;
          i += openMatch[0].length;
        } else {
          i++;
        }
      }
    } else {
      result.push(content[i]);
      i++;
    }
  }
  return result.join('');
}

function mdxToTtsScript(content) {
  // Normalize CRLF to LF
  content = content.replace(/\r\n/g, '\n');

  // Strip frontmatter
  content = content.replace(/^---[\s\S]*?---\s*\n/, '');

  // Remove data-tts-skip blocks
  content = removeSkipBlocks(content);

  // Strip fenced code blocks entirely (must run before inline-code strip —
  // otherwise the fence's triple-backtick confuses the single-backtick regex
  // and swallows adjacent inline code like `AudioContext`).
  // Use \x60 (backtick) to avoid any bundler/template-literal parsing edge cases.
  content = content.replace(/\x60{3}[\s\S]*?\x60{3}/g, '');

  // Strip JSX expressions {expr}
  content = content.replace(/\{[^}]*\}/g, '');

  // Strip HTML/JSX tags (keep text content)
  content = content.replace(/<[^>]+>/g, ' ');

  // Convert phoneme markers: word[PHONEME] → [PHONEME]
  content = content.replace(/\S+(\[[^\]]+\])/g, '$1');

  // Strip markdown headers (## text → text.) — trailing period adds TTS pause
  content = content.replace(/^#{1,6}\s+(.+)$/gm, '$1.');

  // Strip markdown links [text](url) → text
  content = content.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // Strip markdown bold/italic
  content = content.replace(/\*\*([^*]+)\*\*/g, '$1');
  content = content.replace(/\*([^*]+)\*/g, '$1');

  // Strip inline code backticks (keep text)
  content = content.replace(/`([^`]+)`/g, '$1');

  // Em dash → comma
  content = content.replace(/—/g, ',');

  // Join blocks with pause markers
  const parts = content
    .split(/\n{2,}/)
    .map(block => block.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  return parts.join(' ...  ... ');
}

function generateAllTxt() {
  mkdirSync(AUDIO_DIR, { recursive: true });
  const files = readdirSync(ARTICLES_DIR).filter(f => f.endsWith('.mdx'));
  for (const file of files) {
    const slug = basename(file, '.mdx');
    const content = readFileSync(join(ARTICLES_DIR, file), 'utf-8');
    const txt = mdxToTtsScript(content);
    writeFileSync(join(AUDIO_DIR, `${slug}.txt`), txt, 'utf-8');
    console.log(`[tts] ${slug}.txt`);
  }
}

function generateAllTxtToDist(dir) {
  // Write txt files to a custom dir (dist/audio) so Astro's public-dir restore
  // after build doesn't clobber the files written to public/audio in build:start.
  mkdirSync(dir, { recursive: true });
  const files = readdirSync(ARTICLES_DIR).filter(f => f.endsWith('.mdx'));
  for (const file of files) {
    const slug = basename(file, '.mdx');
    const content = readFileSync(join(ARTICLES_DIR, file), 'utf-8');
    const txt = mdxToTtsScript(content);
    writeFileSync(join(dir, `${slug}.txt`), txt, 'utf-8');
    // Also keep public/audio in sync so the Python audio-gen script can find them.
    writeFileSync(join(AUDIO_DIR, `${slug}.txt`), txt, 'utf-8');
  }
}

export default function ttsTxtIntegration() {
  return {
    name: 'tts-txt-generator',
    hooks: {
      'astro:build:start': generateAllTxt,
      'astro:build:done': ({ dir }) => generateAllTxtToDist(join(fileURLToPath(dir), 'audio')),
      'astro:server:start': generateAllTxt,
    },
  };
}
