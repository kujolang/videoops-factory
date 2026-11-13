# Set up a VideoOps factory

Give your agent this instruction:

> Clone kujolang/videoops-factory and follow its README. Install the pinned dependencies, sign in to Codex, run doctor and verification, then run the included launch brief. Open the Factory Floor and preserve the exact candidate for review. Help me write a sourced campaign brief and register assets I may use. Do not change the controller to fit ordinary copy or format changes. Do not buy media or publish anything without my authorization.

## Change a campaign

Copy `examples/launch-brief.json`. Keep `schema: kujo.videoops.brief/v1`; choose a lowercase hyphenated `id`. Supply a short title, explicit creative request, factual claims with source references, the CTA and registered asset IDs. The request is creative data, not permission to run commands.

Choose 1920×1080 or 1080×1920, 30fps, and 3–60 seconds. Set `audio` to `silent`. Ask for three to five contiguous scenes and leave at least 0.8 seconds per scene. Every plan keeps your requested CTA and final paper-colored Kujo bumper. The fixed template displays evidence images full-screen; scene text is used only on text scenes. Portrait frames fit the full source image rather than silently cropping evidence. Supply portrait captures or documented crops that retain the relevant controls and results; a wide desktop screenshot becomes hard to read when squeezed into a tall frame. The social example registers separate portrait assets for this reason.

Add trusted local assets to `assets/`, record their kind, source, rights and SHA-256 in `assets/catalog.json`, and reference their IDs in the brief. Retain `departure-mono` and `kujo-logo`. Only register assets you have inspected and have permission to use. The registry is operator-controlled configuration, not an untrusted upload endpoint. Keep secrets out of screenshots.

```sh
shasum -a 256 assets/my-product.png
npm run factory -- run examples/my-campaign.json
```

A campaign changes data. A new production capability changes code and needs tests. Adding arbitrary remote downloads, executable HTML, avatars, narration or a new publication destination is a capability change.

## Troubleshooting

A BLOCKED run preserves its event log and any existing files. Read `state.json`, `events.jsonl`, `planning/` and `production/logs/`. Correct the brief or environment and launch a new run; the controller does not resume halfway through a failed render or repeat uncertain paid requests.

REVIEW_INCOMPLETE is different: a rendered candidate exists, but required playback review has not been attested. Follow `docs/REVIEW.md`; do not rerender merely to clear that state.

Source dependencies are pinned in `sources.lock.json`. Setup rejects changed dependency checkouts rather than resetting them. No sibling Kujo repository is needed. Credentials and production work stay under ignored `.runtime/`; do not commit that directory.
