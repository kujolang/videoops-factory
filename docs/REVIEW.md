# Review and release

The runner produces a candidate, not an automatic final release. The canonical `kujo-agents` review service records its SHA-256 and prevents a decision about one file from approving another.

Open the candidate and review the full picture and audio behavior, including intentional silence, cuts, text, legibility and the final bumper. Check it in the intended playback context. Only a reviewer who exercised the required capabilities may attest them. Contact sheets, screenshots, model descriptions, metadata and waveforms do not substitute for full playback or listening.

The run contains a technical decision with `perceptual: REVIEW_INCOMPLETE`. A capable reviewer creates a new strict `videoops-review-decision/v1` JSON file using the pinned schema at `.runtime/deps/kujo-agents/videoops/tools/contracts/review-decision.schema.json`. Include the exact candidate checksum, actual reviewer identity, only exercised capabilities, workspace-relative evidence, a non-future timestamp and actionable defects for any failed gate. Do not copy PASS into a template without performing the review.

```sh
.runtime/venv/bin/videoops review status --workspace /absolute/run
.runtime/venv/bin/videoops review record --workspace /absolute/run --decision /absolute/run/review/human-decision.json --authorize-local
.runtime/venv/bin/videoops review promote --workspace /absolute/run --destination output/final.mp4 --authorize-local
```

The `--authorize-local` flag represents the operator's action, not permission embedded in model output. This is a local tool, not a defense against another process running as the same user. The Factory Floor's run snapshot reports the runner's final state; consult `review status` for later manual decisions and promotion.

A repair produces a new render attempt and candidate. Submit it through `review render-attempt` and `review submit-candidate` before recording a new decision. The canonical ledger limits failed defect cycles to three. The first release does not automatically run an editor repair loop or upload final videos to a public account.
