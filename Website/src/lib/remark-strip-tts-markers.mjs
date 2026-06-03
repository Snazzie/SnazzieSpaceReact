import { visit } from 'unist-util-visit';

// Rehype plugin — strips OmniVoice TTS markers from the final HTML tree.
// Runs after MDX/markdown compilation so it catches markers regardless of
// how the parser represented them (linkReference, text, etc.).
// Removes [PHONEME] and [marker] patterns from all text nodes in the HTML.
export default function remarkStripTtsMarkers() {
  return (tree) => {
    visit(tree, 'text', (node, index, parent) => {
      const cleaned = node.value.replace(/\[[^\]]+\]/g, '').replace(/  +/g, ' ');
      if (cleaned.trim() === '') {
        parent.children.splice(index, 1);
        return index;
      }
      node.value = cleaned;
    });
  };
}
