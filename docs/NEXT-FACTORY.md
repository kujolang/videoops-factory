# Recommended next factory: Publishing House

This is a recommendation for the next build, not a new implementation or an approved scope.

Build a standalone `publishing-house-factory` next. It would take a sourced brief through research, writing, independent editing, adaptations and a reviewable release package. It can consume Software Factory evidence and hand a verified campaign brief to VideoOps. That shows Kujo coordinating different kinds of work while preserving facts, versions and authority.

## Why this comes next

| Candidate | What it adds to the showcase | Recommendation |
| --- | --- | --- |
| Publishing House Factory | One source becomes several reviewed formats; claims, edits, lineage and approval stay visible. It connects the software and video examples. | Next. Existing tools and an operator already cover much of the control flow. |
| WebOps Factory | Audit a site, propose repairs, check the result and track changes over time. | Follow Publishing House. Strong fit, but real analytics/search access varies, and some website work overlaps the software example. |
| Combined product-launch factory | Build software, produce a campaign and render a launch video. | Later. Connect independently qualified factories rather than making the next demo depend on every pipeline at once. |

## Existing parts to reuse

The [Publishing House Operator](https://github.com/kujolang/kujo-workflows/tree/main/publishing-house-operator) already provides local leases, bounded phases, checkpoints, retries and receipt validation. It requires explicit live adapters; its existence does not mean a live publishing factory is already installed.

| Existing component | Role in the proposed factory |
| --- | --- |
| [Publishing House agents](https://github.com/kujolang/kujo-agents/tree/main/publishing-house) | Editorial leadership, research, writing, editing, adaptation and production contracts. |
| [StoryDesk](https://github.com/kujolang/storydesk) | Commissions, assignments, dependencies and editorial queues. |
| [Dossier](https://github.com/kujolang/dossier) | Claims, sources, conflicts, freshness and evidence records. Recording a source is not automatic fact verification. |
| [BluePencil](https://github.com/kujolang/bluepencil) | Structured editorial review, blocker precedence and quality calibration. Human/editorial judgment remains necessary. |
| [GalleyPack](https://github.com/kujolang/galleypack) | Artifact hashes, versions, adaptations and lineage. |
| [VersionSeal](https://github.com/kujolang/versionseal) | Approval tied to the exact reviewed version. |
| [PressWire](https://github.com/kujolang/presswire) | Bounded, approval-gated delivery and receipts. Real destinations need configured and verified adapters. |
| Software Factory and VideoOps Factory | Pinned setup, scoped worker proposals, measured runs, event-backed viewing, artifact downloads and explicit review limits. Reuse these patterns without copying their domain-specific controllers. |

Use the canonical operator and tool records as the source of truth. The new repository should package installation, profiles, a tested live phase adapter and a clear viewer around them. It should not create a second editorial state machine beside StoryDesk and Dispatch.

## First example

Use the actual VideoOps launch as the source project:

> Turn the repository, benchmark receipts and demo transcript into a sourced launch article, a newsletter draft, three social posts and a locally previewable landing page. Keep every performance claim tied to its evidence. Package everything for review.

The first contract should require:

1. A preserved brief, source packet and claim-to-source mapping.
2. An article drafted from those sources, followed by an independent editorial review.
3. Newsletter and social adaptations linked to the reviewed article version.
4. A local landing-page preview and a hash-bound package with review decisions.
5. A visible pause before external publication. Editing a reviewed artifact must invalidate approval of the old bytes.

A useful, clearly labeled validation case is an overbroad “three-minute setup on any machine” claim. The evidence supports narrower Ubuntu observations and separates prerequisites and sign-in. Show the review rejecting or qualifying the unsupported wording, then show the corrected package. Do not stage that case as an accidental real-world failure.

This makes the demo about judgment and traceability, not just generating several pieces of text. A VideoOps handoff can be the next integration once this editorial contract passes independently.

## What still needs building and proving

Package compatible pinned tools without requiring a personal sibling checkout. Configure the existing operator's live phase adapter for the chosen model and source inputs. Implement a small set of real editorial stages, an evidence-backed viewer and an installer. Qualify missing sources, conflicting claims, revision limits, interrupted work, stale approvals and changed artifact hashes.

Begin with local output. Live CMS, newsletter, social or Git publication requires a separately configured adapter, explicit authority and verification of the actual destination. Do not turn fixture success into a claim of live publication. A delivery receipt alone does not prove factual accuracy, editorial quality or audience impact.

## Review basis

Inspected November 13, 2026: `kujo-workflows` commit `d766eae4fd9a131e51c34796d029fd3bc6974689`, `kujo-agents` commit `a7e9d0236d6e64b5db30273b32f4ad8c124f5173`, and the local READMEs for StoryDesk, Dossier, BluePencil, GalleyPack, PressWire, ReaderSignal, ContentGraph and SiteKit. The public Kujo catalog identifies Publishing House Operator in workflows v0.6.2 as a control plane requiring explicit adapters. This review did not execute or qualify a new Publishing House deployment.
