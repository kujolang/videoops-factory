# Kujo VideoOps Factory

[![Version](https://img.shields.io/badge/version-0.1.0-black)](package.json)
[![License](https://img.shields.io/badge/license-MIT-lightgrey)](LICENSE)
[![built with Kujo](https://img.shields.io/badge/built%20with-Kujo-white.svg)](https://github.com/kujolang/kujo)
[![Verification](https://img.shields.io/github/actions/workflow/status/kujolang/videoops-factory/verify.yml?branch=main&label=verification&color=black)](https://github.com/kujolang/videoops-factory/actions/workflows/verify.yml)

Give your video team a brief. Follow the handoffs, inspect the renders, and see what still needs review.

https://github.com/user-attachments/assets/256f916f-4abb-4326-9352-67eb45df3cd4

[Download the video for your phone — 720p, 1.9 MB](https://github.com/kujolang/videoops-factory/raw/refs/heads/main/docs/media/videoops-factory-demo-mobile.mp4) · [Download the original — 1080p, 14.2 MB](https://github.com/kujolang/videoops-factory/raw/refs/heads/main/docs/media/videoops-factory-demo.mp4)

If your browser cannot play GitHub’s embedded preview, use either public download link above. The narrated walkthrough is a technically checked review candidate. [Source and review notes](docs/DEMO.md).

VideoOps Factory turns a sourced campaign brief and registered assets into landscape or portrait video candidates. It runs the existing Kujo VideoOps role contracts, builds an editable HyperFrames project, records elapsed time, and shows the evidence in a local Factory Floor.

**Standalone, local, early release.** This repository owns the VideoOps runner. [Software Factory](https://github.com/kujolang/software-factory) remains the separate factory for software contracts and tests. Neither repository is a universal engine for every kind of work; they share patterns and Kujo components.

## Run the example

Use macOS or Linux, Git, Node **26.12.1 or later 26.x**, Python **3.10+**, FFmpeg/ffprobe **6+** with libx264/AAC, and a Codex account. Rendering downloads a browser when needed. Minimal Ubuntu also needs `libatomic1` for Node 26. See the [clean installation test](docs/ONBOARDING-BENCHMARK.md) for the complete tested prerequisites and timing scope. Windows users need a compatible Linux environment; native Windows is unsupported.

**Measured on fresh Ubuntu:** 4m 50s–5m 28s for dependencies and verified readiness; 3m 06s–3m 21s from cloning when prerequisites were already installed. Codex sign-in is additional. These are [two measured runs](docs/ONBOARDING-BENCHMARK.md) on a busy, resource-limited machine, not an idle-machine or cross-platform guarantee. Other applications and limited available memory were reported by the owner; CPU contention and swapping were not measured.

```sh
git clone https://github.com/kujolang/videoops-factory.git
cd videoops-factory
npm ci
npm run setup
npm run login
npm run doctor
npm run verify
npm start
```

Open `http://127.0.0.1:4381`. In another terminal:

```sh
npm run factory -- run examples/launch-brief.json
npm run factory -- run examples/social-brief.json
```

Each command creates a fresh run under `.runtime/runs/`. The example campaign uses real Software Factory screenshots to make two intentionally silent, 12-second clips: 1920×1080 and 1080×1920. Model calls use your Codex account. No paid media generation occurs in this route.

Already signed in to Codex? `npm run login -- --reuse-existing` copies only your authentication into the private, ignored factory home. It does not import tools, hooks or configuration. Use `VIDEOOPS_MODEL` to select a model your account supports.

## What runs

| Stage | Actual work |
| --- | --- |
| Producer | A model checks the brief against the supported production contract. |
| Creative Director | A separate model call proposes a timed scene plan. The runner validates it. |
| Asset Scout | A separate model call checks registered provenance and plan fit. The runner verifies local file hashes. |
| Media Generator | Records that generation is unnecessary for this silent, registered-asset route. No model or provider call is made. |
| HyperFrames Editor | A separate model call reviews the plan. A trusted compiler creates scenes; HyperFrames checks and renders them. |
| Video Critic | A separate model call reviews the technical evidence. The canonical review ledger records technical checks and missing playback review. |

The model calls are sequential, tool-free proposals. They cannot edit the renderer or execute instructions from the brief. The viewer reads real run records; it does not simulate agents or approval.

## Review the result

A successful run ends at **REVIEW_INCOMPLETE**, with `output/draft.mp4`, metadata, frames, checks, role proposals and handoffs. Rendering and metadata checks cannot prove that a video looks or sounds right. A capable reviewer must review the exact candidate before promotion. See [Review and release](docs/REVIEW.md).

The render job closes its temporary preview. Reopen it with `npx hyperframes preview /absolute/run/production/hyperframes`, or edit the scene project in `production/hyperframes/` with HyperFrames Studio or its desktop app. Edits produce a new candidate and require a new review. Never label a changed file approved using the old file's decision.

## Make it yours

Give your agent [the setup and brief guide](docs/AGENT-SETUP.md). Change the brief and register your own sourced assets without rewriting the controller. The first release supports screenshot-led, monochrome launch clips with three to five scenes, a Kujo bumper, 30fps, and 3–60-second silent output. Other editing styles, footage timelines and automatic narrated campaigns need an explicit extension to that contract.

The separate demo uses the canonical media workflow for an authorized Siren narration take. That does not turn the silent example runner into an automatic speech service.

- [Architecture and reuse](docs/REUSE.md)
- [Factory construction and example-run timings](docs/BENCHMARK.md)
- [Creative direction](docs/CREATIVE-DIRECTION.md)
- [Narrated walkthrough and rebuild instructions](docs/DEMO.md)
- [Media provenance](docs/MEDIA-PROVENANCE.md)
- [Trust boundary](SECURITY.md)

## Checks

`npm run verify` runs the contract and viewer tests and checks local documentation links. `npm run doctor` checks pinned tools and source dependencies. Full production checks run during each render, with their logs retained in the run workspace.

Licensed under [MIT](LICENSE). The bundled font retains its [SIL Open Font License](assets/DepartureMono-LICENSE.txt). Kujo marks remain first-party brand assets.
