# VideoOps Factory walkthrough

This 40-second edit shows actual application captures and excerpts from both example candidates. It is a separate showcase edit, not a third autonomous campaign run. No captions, scene labels or fabricated UI are added. The Kujo K mark and Departure Mono bumper point viewers to kujolang.ai.

The picture holds the Factory Floor for twelve seconds, plays eight seconds from each example, returns to the review state for eight seconds, then closes with a four-second bumper. The original full candidates remain available under `docs/examples/`. Review status stays visible in the captured application.

## Narration

> Give your video team a clear brief, then see what happens to it. This is Kujo VideoOps Factory. The producer hands the work to a creative director, the assets get checked, and the editor builds the video from that plan. Here, one Software Factory campaign becomes a landscape launch clip and a portrait cutdown. You can inspect the handoffs, open both renders, and see how long each run took. Review stays tied to the exact video file. If a required check is missing, that candidate stays pending. Start with this example, change the brief, and build your next factory with Kujo.

Siren is a synthetic narrator. Media acquisition and the recovered optional-alignment failure are recorded in [Media provenance](MEDIA-PROVENANCE.md). The quiet instrumental bed is original local synthesis. Full listening and playback approval are still required; audio measurements alone do not establish them.

## Rebuild an edit

After producing both runs, capture your actual Factory Floor and review view. Keep the captures and supplied audio inside this checkout, for example under `.runtime/demo-inputs/`. Prepare authorized narration and music through the canonical VideoOps media workflow. The builder uses supplied local media; it never purchases a take or changes the campaign runner's silent contract.

```sh
node scripts/build-demo.mjs \
  --launch .runtime/runs/YOUR-LAUNCH-RUN \
  --social .runtime/runs/YOUR-SOCIAL-RUN \
  --floor .runtime/demo-inputs/floor.png \
  --review .runtime/demo-inputs/review.png \
  --narration .runtime/demo-inputs/narration.wav \
  --music .runtime/demo-inputs/music.wav
```

The builder writes `.runtime/demo/`, including source hashes, an editable project, technical logs, audio measurements and the candidate. It refuses an existing output workspace so evidence is not overwritten. Preserve or move an old demo workspace before rebuilding.
