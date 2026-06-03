import { visit } from 'unist-util-visit';

// Strips OmniVoice TTS control markers from rendered HTML.
// Removes [marker] patterns that are NOT markdown links (not followed by `(`).
// Examples: [laughter], [B EY1 S], [pause], [surprise-oh], [AE1 S P ...]
export default function remarkStripTtsMarkers() {
  return (tree) => {
    visit(tree, 'text', (node, index, parent) => {
      const cleaned = node.value.replace(/\[[^\]]+\](?!\()/g, '').replace(/  +/g, ' ');
      if (cleaned.trim() === '') {
        parent.children.splice(index, 1);
        return index;
      }
      node.value = cleaned;
    });
  };
}
