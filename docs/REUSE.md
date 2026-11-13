# What this factory reuses

VideoOps Factory packages an existing team and its production tools. It adds the project entry point, timing, evidence display and render coordination; it does not replace the canonical agent or media packages.

| Source                    | Pinned commit                              | Reused parts                                                                                              |
| ------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `kujolang/kujo-agents`    | `a7e9d0236d6e64b5db30273b32f4ad8c124f5173` | Producer, five specialist contracts, shared standards, media service, audio QA and exact-candidate review |
| `kujolang/kujo-workflows` | `d766eae4fd9a131e51c34796d029fd3bc6974689` | Production intake initializer and media workflow bridge                                                   |

The retired `kujolang/kujo-videoops` repository is historical reference only. It is not a dependency. The canonical executable tools live in `kujo-agents/videoops/tools/`. Their Python distribution is `kujo-agents-videoops` 0.3.0; the CLI and import namespace remain `videoops` for compatibility.

## Local installation

Run `npm ci`, then `npm run setup`. npm supplies the pinned Kujo, Codex and HyperFrames packages. Setup fetches exact public GitHub commits into `.runtime/deps/` and installs the canonical media/review tools into `.runtime/venv/`. It needs Git, Python 3.10 or newer, FFmpeg/ffprobe 6 or newer, and Node 26.12.1 or later 26.x. FFmpeg must include libx264 and AAC encoders.

`sources.lock.json` pins the Git sources and Python packages. Setup builds the Python package from a temporary copy so packaging cannot dirty its source checkout. No sibling checkout, global Kujo/Codex installation, private account or retired runtime is required.

Setup is repeatable. It verifies existing commits, clean working trees and installed Python versions before reuse. It never resets a changed dependency or silently replaces a mismatched environment. Preserve and move a changed `.runtime/deps/NAME` or `.runtime/venv` aside before reinstalling. A lock prevents concurrent installers. After an interrupted setup, confirm no installer is active before removing an empty `.runtime/setup.lock` directory.

`npm run doctor -- --json` reports installed versions and dependency checks. It makes no provider calls and does not inspect authentication. Passing doctor proves local tools are available; it does not prove a browser render, provider entitlement, reuse rights or perceptual approval. Setup receipts and doctor results remain under `.runtime/`.

## Reused boundaries

The production initializer preserves the request and creates a harness handoff. It does not run a model or pretend to produce a video. The Producer and specialists still need a capable harness.

The media service supports local import and scoped ElevenLabs speech, sound effects and music. Paid requests need exact fingerprints, bounded authorization and current rights/entitlement evidence. Missing usage remains unknown; an uncertain provider result must be reconciled before retry. Credentials stay outside files and command arguments.

The review service binds decisions to the current candidate hash. Technical checks and perceptual review are separate. Its default gates require visual playback and audio listening; missing capabilities leave the candidate in `REVIEW_INCOMPLETE`. A failed review returns bounded fixes to the Editor. Only the approved exact candidate can be promoted.

These are local operator tools, not protection against a malicious process running as the same user. Markdown role instructions do not enforce sandboxing. Each renderer and provider adapter must preserve the factory's actual execution and authorization boundaries.
