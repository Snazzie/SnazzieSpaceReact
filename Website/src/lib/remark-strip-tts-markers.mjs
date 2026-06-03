import { visit } from 'unist-util-visit';

// Rehype plugin — strips OmniVoice TTS markers from the final HTML tree.
// Runs after MDX/markdown compilation so it catches markers regardless of
// how the parser represented them (linkReference, text, etc.).
// Removes [PHONEME] and [marker] patterns from all text nodes in the HTML.
export default function remarkStripTtsMarkers() {
  return (tree) => {
    visit(tree, 'text', (node, index, parent) => {
      if (parent?.type === 'element' && (parent.tagName === 'code' || parent.tagName === 'pre')) return;
      // \[...\] = escaped display brackets (kept, backslash stripped)
      // [...] = TTS marker (removed)
      const cleaned = node.value
        .replace(/\\(\[[^\]]+\])/g, '\x00$1\x00')   // protect escaped brackets
        .replace(/\[[^\]]+\]/g, '')                  // strip TTS markers
        .replace(/\x00(\[[^\]]+\])\x00/g, '$1')      // restore escaped brackets
        .replace(/  +/g, ' ');
      if (cleaned.trim() === '') {
        parent.children.splice(index, 1);
        return index;
      }
      node.value = cleaned;
    });
  };
}
