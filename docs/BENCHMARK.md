# Measured example

This is an observed local build, not a speed comparison or a clean-machine benchmark. Timing began on November 12, 2026 at 11:42:09 p.m. America/Detroit (November 13 at 04:42:09 UTC). The machine already had Node, Python, Git, FFmpeg, a Codex account and browser caches.

The initial factory implementation, asset preparation, dependency setup and first checks took **11 minutes 17 seconds** before the first example started. Documentation, further tests and demo preparation continued while example jobs ran. That readiness interval does not claim the whole repository was finished in eleven minutes.

The pinned dependency installer itself took **53.337 seconds** on its first run, including independent GitHub fetches and a fresh Python environment. Its unchanged repeat took **7.110 seconds**. These are part of setup, not extra phases to add to the total.

Run measurements below include the actual model proposals, trusted rendering, technical checks and canonical review recording. They stop at REVIEW_INCOMPLETE. They do not include human playback approval or public publishing. The two examples run sequentially; other setup and documentation work overlaps them.

| Example | Time to review candidate | Output |
| --- | --- | --- |
| Landscape launch | 2m 20.603s | 1920×1080, 12s |
| Portrait cutdown | 3m 21.533s | 1080×1920, 12s |

Both passed layout, render, dimensions, frame-rate, full decode and silent-audio checks. Both retain REVIEW_INCOMPLETE for playback review. Renderer load and other work overlapped this single observation; these figures do not predict another machine’s speed.

The source of truth is [benchmark.json](benchmark.json). Candidate hashes and per-stage durations are retained there. Editable projects and detailed provider/renderer logs stay in each ignored local run workspace. Public example files are review candidates, not approved releases.

The showcase demo uses a separately authored edit of actual factory evidence and the two example outputs. It includes a Siren narration take, an original quiet bed and a Kujo bumper. Held application snapshots and shortened output excerpts make it an edited walkthrough, not an uninterrupted recording of a complete run. No timing is fabricated or spoken as a performance promise.
