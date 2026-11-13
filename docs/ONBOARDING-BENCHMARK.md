# Clean installation benchmark

This test measures installing the factory on a running, bare Ubuntu system. It includes system tools, a full public Git clone, npm packages, pinned Kujo sources and Python packages, checks, a browser download, and a real render. It does not reuse the development checkout or mount host package caches.

## Results — November 13, 2026

| Measured interval | Run 1 | Run 2 |
| --- | --- | --- |
| Bare Ubuntu to verified readiness | 4m 49.765s | 5m 27.524s |
| Clone to readiness, after system prerequisites | 3m 21.327s | 3m 06.326s |

Both completed all 15 tests with no skips, a real render and decode, and viewer checks. Full phase timestamps, revisions, baseline records and results are in [the benchmark receipt](onboarding-benchmark.json) and [evidence directory](onboarding-evidence/).

Suggested public wording:

> On our clean Ubuntu tests, setting up VideoOps Factory took about five minutes, including dependencies and readiness checks. Sign in to Codex, and you're ready to begin.

For an audience that already has the prerequisites:

> With the prerequisites installed, VideoOps Factory setup took about three minutes in our tests. Codex sign-in is additional.

These are two observations on one host, not a universal promise. Do not drop the platform/prerequisite or sign-in qualification when using the numbers. Fresh macOS and Windows installs were not measured.

A separate authenticated check passed on Linux in 10.622 seconds using an existing authorized session and a real structured Codex request. That confirms provider access; it is **not** a measurement of fresh account sign-in and is excluded from the installation totals.

## What counts as ready

A successful timed run must pass all of these:

- Install Git, Python and venv, FFmpeg/ffprobe, Node 26.12.1, and the browser's system libraries.
- Clone the public repository and install its pinned dependencies.
- Pass `npm run doctor` and `npm run verify`, including the canonical review tests.
- Download the HyperFrames browser into an empty cache.
- Render and decode a three-second, 1080p project using the actual compiler, local font and logo.
- Start the Factory Floor and receive successful responses from its page and run API.

The small render is an installation qualification, not a production campaign or perceptual approval. It catches failures that a tool-version check would miss.

Account creation, fresh Codex sign-in, MFA and human review time are not fixed-duration automated steps. A timing claim must say that sign-in is additional. Reusing an existing session can qualify provider access, but cannot measure how long a new user's sign-in takes.

## Environment and method

The guest is Ubuntu 24.04.5 x86-64, limited to four CPUs and 3 GiB RAM, with 1 GiB shared memory. It runs in a local Docker engine within an existing six-CPU, 4 GiB Colima VM on macOS 26.6.2. The host is an Intel Core i7-9750H at 2.60 GHz with 16 GiB RAM. The pinned base image is `ubuntu@sha256:2198e4c65076e9cb0b3d695219df667c0e3b0072da64ca3c2648aca17dcecaf5`.

Each timed trial has a new container filesystem, no Node/Git/Python/FFmpeg installation, no credentials and empty application package/browser caches. The host kernel, VM, network and remote download services are shared; this is not a benchmark of a newly purchased physical computer. No cache volumes are mounted.

The timer starts immediately before the installer begins. Pulling and starting the base operating-system image is separate infrastructure preparation; the initial image pull took 24.995 seconds. The test does not time installing Docker, an operating system, or hardware setup. End users running natively do not need Docker for the factory.

The first diagnostic attempt stopped after 239.413 seconds because the minimal image lacked `libatomic.so.1`, which Node 26 requires. The recipe now installs Ubuntu's `libatomic1` package. The failed attempt remains in the record and is excluded from successful-run summaries. Repairing that container is diagnostic work, not a clean trial. During that diagnostic work, the test harness also tried an unsupported `--json` option on `hyperframes browser ensure`; that flag was removed before the clean repeats. Neither failed diagnostic is counted as a successful installation.

These measurements apply to this tested Linux environment. They do not establish a macOS or Windows onboarding time, nor guarantee another network's download speed.

## Reproduce

With Python and a running Docker engine on the test host:

```sh
python3 scripts/benchmark/run.py cold-1 --context YOUR_CONTEXT
```

Omit `--context` to use Docker's selected context. Choose a new trial name each time. The harness fetches the pinned base image, starts an empty container, copies only its test scripts, and downloads the repository and dependencies from their public sources. It stores phase logs, the exact repository revision, baseline state and a receipt under `.runtime/onboarding/`, then removes its own container. `--keep` retains that named container for follow-up checks; remove it when finished. The harness never imports authentication.

The installer is for that disposable Ubuntu container only. It is not a cross-platform installer or a command to run directly on your workstation. Its package list is the tested reference for an agent preparing minimal Ubuntu, including `libatomic1` and Chromium's shared libraries.
