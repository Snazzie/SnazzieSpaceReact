import { visit, SKIP } from 'unist-util-visit';

// Strips OmniVoice TTS control markers from rendered HTML.
// [marker] without (url) is parsed by remark as linkReference nodes, not text —
// we must remove those nodes entirely. Also cleans any residual [markers] in text nodes.
export default function remarkStripTtsMarkers() {
  return (tree) => {
    // Remove linkReference nodes (how remark parses [AE1 S P ...] standalone brackets)
    visit(tree, 'linkReference', (node, index, parent) => {
      parent.children.splice(index, 1);
      return [SKIP, index];
    });

    // Clean any [marker] patterns that survived as plain text
    visit(tree, 'text', (node, index, parent) => {
      const cleaned = node.value.replace(/\[[^\]]+\]/g, '').replace(/  +/g, ' ');
      if (cleaned.trim() === '') {
        parent.children.splice(index, 1);
        return [SKIP, index];
      }
      node.value = cleaned;
    });
  };
}
