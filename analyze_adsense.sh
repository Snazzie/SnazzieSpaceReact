#!/bin/bash

# Count prose words in a file (rough estimate)
count_words() {
  local file="$1"
  if [ ! -f "$file" ]; then
    echo "0"
    return
  fi
  
  # Remove JSX/HTML, frontmatter, code blocks, etc.
  grep -v '^---' "$file" | \
  grep -v '^import ' | \
  grep -v '^export ' | \
  sed 's/<[^>]*>//g' | \
  sed 's/`[^`]*`//g' | \
  sed 's/\[([^\]]*)\]([^)]*)//g' | \
  sed 's/[*_]//g' | \
  tr -s ' \n' ' ' | \
  wc -w
}

echo "ADSENSE COMPLIANCE AUDIT"
echo "=====================================================";

echo ""
echo "1. WorthMyTime Pages"
echo "---"
wc_wmt_astro=$(count_words "/Users/acoop/Documents/GitHub/SnazzieSpaceReact/Website/src/pages/worthmytime/index.astro")
echo "   WorthMyTime index.astro: $wc_wmt_astro words"
wc_wmt_tsx=$(count_words "/Users/acoop/Documents/GitHub/SnazzieSpaceReact/Website/src/projects/worthmytime/WorthMyTime.tsx")
echo "   WorthMyTime.tsx: $wc_wmt_tsx words"
if (( wc_wmt_astro + wc_wmt_tsx < 300 )); then
  echo "   ⚠️  LOW VALUE: Combined <300 words, mostly tool/widget UI"
fi

echo ""
echo "2. Articles Index"
echo "---"
wc_articles_idx=$(count_words "/Users/acoop/Documents/GitHub/SnazzieSpaceReact/Website/src/pages/articles/index.astro")
echo "   articles/index.astro: $wc_articles_idx words"
if (( wc_articles_idx < 300 )); then
  echo "   ⚠️  LOW VALUE: <300 words, pure listing/directory page"
fi

echo ""
echo "3. Homepage Components"
echo "---"
wc_intro=$(count_words "/Users/acoop/Documents/GitHub/SnazzieSpaceReact/Website/src/components/Intro.tsx")
echo "   Intro.tsx: $wc_intro words"
wc_career=$(count_words "/Users/acoop/Documents/GitHub/SnazzieSpaceReact/Website/src/components/Career.tsx")
echo "   Career.tsx: $wc_career words"
wc_projects=$(count_words "/Users/acoop/Documents/GitHub/SnazzieSpaceReact/Website/src/components/Projects.tsx")
echo "   Projects.tsx: $wc_projects words"
total_home=$(( wc_intro + wc_career + wc_projects ))
echo "   Total visible prose: $total_home words"
if (( total_home < 800 )); then
  echo "   ⚠️  MARGINAL: Low prose relative to interactivity"
fi

echo ""
echo "4. Sample Articles (first 50KB each)"
echo "---"
for file in /Users/acoop/Documents/GitHub/SnazzieSpaceReact/Website/src/content/articles/*.mdx; do
  filename=$(basename "$file")
  wc=$(count_words "$file")
  echo "   $filename: $wc words"
  if (( wc < 600 )); then
    echo "      ⚠️  Below 600 words"
  fi
done

